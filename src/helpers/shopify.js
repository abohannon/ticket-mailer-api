import Shopify from 'shopify-api-node'
import merge from 'lodash/merge'
import { logger } from './utils'
import config from '../config/shopify'
import { filterOrdersByVariantId } from '../services/dataService'
import { emailSentMetafield } from './metafieldHelpers'

let redisClient

export const shopifyHelper = {
  setRedisClient(client) { redisClient = client },
}

class CustomShopify {
  static build() {
    const shopify = new Shopify(config)
    const customShopify = new CustomShopify(shopify)

    return new Proxy(customShopify, {
      get(target, property) {
        return customShopify[property] || shopify[property]
      },
    })
  }

  constructor(shopifyInstance) {
    this.shopify = shopifyInstance
    this.shopify.on('callLimits', limits => logger.info('Shopify API Limits: ', limits))
  }

  cache(options = {}) {
    this.useCache = true
    this.hashKey = JSON.stringify(options.key || '')
    return this
  }

  clearCache(hash, field) {
    redisClient.hdel(JSON.stringify(hash), JSON.stringify(field))
  }

  async getTours() {
    if (!this.useCache) {
      return this.shopify.collectionListing.list()
    }

    const key = 'fetchTours'
    const cachedTours = await redisClient.hgetAsync(this.hashKey, key)

    if (cachedTours) {
      this.result = JSON.parse(cachedTours)
      return this.result
    }

    this.result = await this.shopify.collectionListing.list()
    redisClient.hset(this.hashKey, key, JSON.stringify(this.result))

    return this.result
  }

  async getShows(collection_id = '') {
    if (!this.useCache) {
      const shows = await this.shopify.productListing.list({ collection_id })
      return this.addMetafieldsToShows(shows)
    }

    const key = collection_id
    const cachedShows = await redisClient.hgetAsync(this.hashKey, key)

    if (cachedShows) {
      this.result = JSON.parse(cachedShows)

      return this.result
    }

    const shows = await this.shopify.productListing.list({ collection_id })

    // add each show's metafields object to each show object before sending to client
    this.result = await this.addMetafieldsToShows(shows)

    // cache show ids with parent collection id for easy retrieval later
    shows.forEach(show => redisClient.hset('shows:collections', show.product_id, collection_id))

    redisClient.hset(this.hashKey, key, JSON.stringify(this.result))

    return this.result
  }

  async getOrders(variantId) {
    if (!this.useCache) {
      const allOrders = await this.shopify.order.list()
      const ordersForVariant = await filterOrdersByVariantId(allOrders, variantId)

      return this.addMetafieldsToOrders(ordersForVariant)
    }

    const key = variantId
    const cachedOrders = await redisClient.hgetAsync(this.hashKey, key)

    if (cachedOrders) {
      this.result = JSON.parse(cachedOrders)
      return this.result
    }

    const allOrders = await this.shopify.order.list()
    const ordersForVariant = await filterOrdersByVariantId(allOrders, variantId)

    this.result = await this.addMetafieldsToOrders(ordersForVariant)

    redisClient.hset(this.hashKey, key, JSON.stringify(this.result))

    return this.result
  }

  /**
 * @param {Object} data - With properties required by shopify API
 * @param {string} data.key - Metafield key. i.e. how you want to reference the metafield
 * @param {string} data.value - Value of metafield. i.e. the value of the above key
 * @param {string} data.value_type - Data type of data.value
 * @param {string} namespace - The category for this metafield
 * @param {string} owner_resource - Shopify resource. i.e. product, variant, order, etc.
 * @param {string} owner_id - Unique id of the resource the metafield will be attached to
 * @return {Object} Status and created metafield
 */
  async createMetafield(data) {
    console.log('Create metafield', data)
    try {
      const result = await this.shopify.metafield.create(data)

      if (!result || Object.keys(result).length < 1) throw new Error('Error creating metafield')

      return { status: 'success', data: result }
    } catch (err) {
      return { status: 'error', error: err }
    }
  }

  async fetchMetafields(owner_resource, owner_id) {
    const metafields = await this.shopify.metafield.list({
      metafield: {
        owner_resource,
        owner_id,
      },
    })

    return metafields
  }

  // TODO: Need to test
  async updateMetafield(data) {
    const { id, ...rest } = data

    try {
      const result = await this.shopify.metafield.update(id, rest)

      if (!result || Object.keys(result).length < 1) throw new Error('Error updating metafield')

      return { status: 'success', data: result }
    } catch (err) {
      return { status: 'error', error: err }
    }
  }

  parseMetafields(arr) {
    return arr.reduce((acc, item) => {
      acc[item.key] = item.value
      return acc
    }, {})
  }

  searchMetafields(metafieldsList, key, value) {
    if (!key || !value) throw new Error('Must provide a key and value.')

    return metafieldsList.filter(metafield => metafield[key] === value)
  }

  async findAndMergeMetafields(resource, name) {
    const metafields = await this.fetchMetafields(name, resource.id)
    const parsedMetafields = this.parseMetafields(metafields)

    if (Object.keys(parsedMetafields).length > 0) {
      merge(resource, parsedMetafields)
    }
  }

  async addMetafieldsToOrders(orders) {
    return Promise.all(orders.map(async (order) => {
      await this.findAndMergeMetafields(order, 'order')
      return order
    }))
  }

  async addMetafieldsToShows(shows) {
    return Promise.all(shows.map(async (show) => {
      await Promise.all(show.variants.map(async (variant) => {
        await this.findAndMergeMetafields(variant, 'variant')
      }))

      return show
    }))
  }

  // TODO: WIP Need to add logic for email_failed when webhooks are setup
  async updateMetafieldsForOrders(orders, variantId) {
    return Promise.all(orders.map(async (order) => {
      const metafields = await this.fetchMetafields('order', order.id)

      if (metafields.length < 1) {
        const response = await this.createMetafield(emailSentMetafield('order', order.id))

        if (response.status !== 'success') throw new Error(`Error updating metafields for order ${order.id}`)

        this.clearCache('orders', variantId)
        return response
      }

      return null
    }))
  }
}

const customShopify = CustomShopify.build()

export default customShopify
