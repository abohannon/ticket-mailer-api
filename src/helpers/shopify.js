import shopify from '../config/shopify'
import {
  addMetafieldsToShows,
  addMetafieldsToOrders,
  filterOrdersByVariantId,
} from '../services/dataService'

let redisClient

export const shopifyHelper = {
  setRedisClient(client) { redisClient = client },
}

class CustomShopify {
  static build() {
    const customShopify = new CustomShopify(shopify)

    return new Proxy(customShopify, {
      get(target, property) {
        return customShopify[property] || shopify[property]
      },
    })
  }

  constructor(shopifyInstance) {
    this.shopify = shopifyInstance
  }

  cache(options = {}) {
    this.useCache = true
    this.hashKey = JSON.stringify(options.key || '')
    return this
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
      return addMetafieldsToShows(shows)
    }

    const key = collection_id
    const cachedShows = await redisClient.hgetAsync(this.hashKey, key)

    if (cachedShows) {
      this.result = JSON.parse(cachedShows)

      return this.result
    }

    const shows = await this.shopify.productListing.list({ collection_id })

    // add each show's metafields object to each show object before sending to client
    this.result = await addMetafieldsToShows(shows)

    // cache show ids with parent collection id for easy retrieval later
    shows.forEach(show => redisClient.hset('shows:collections', show.product_id, collection_id))

    redisClient.hset(this.hashKey, key, JSON.stringify(this.result))

    return this.result
  }

  async getOrders(variantId) {
    if (!this.useCache) {
      const allOrders = await this.shopify.order.list()
      const ordersForVariant = await filterOrdersByVariantId(allOrders, variantId)

      return addMetafieldsToOrders(ordersForVariant)
    }

    const key = variantId
    const cachedOrders = await redisClient.hgetAsync(this.hashKey, key)

    if (cachedOrders) {
      this.result = JSON.parse(cachedOrders)
      return this.result
    }

    const allOrders = await this.shopify.order.list()
    const ordersForVariant = await filterOrdersByVariantId(allOrders, variantId)

    this.result = await addMetafieldsToOrders(ordersForVariant)

    redisClient.hset(this.hashKey, key, JSON.stringify(this.result))

    return this.result
  }
}

export default CustomShopify
