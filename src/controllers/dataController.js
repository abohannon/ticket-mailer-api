import shopify from '../config/shopify'
import {
  fetchShowsFromShopify,
  filterOrdersByVariantId,
  addMetafieldsToOrders,
  fetchMetafields,
  removeTour,
  removeShow,
  addShow,
  addTour,
} from '../services/dataService'
import { logger } from '../helpers/utils'

let redisClient

export const dataController = {
  setRedisClient(client) { redisClient = client },
}

export const handleWebhooksTours = async (req, res) => {
  logger.info('Webhook: Tour updated')

  const updatedTour = req.body

  // acknowledge webhook was received
  if (updatedTour) res.status(200).end()

  const isDeleteHook = !updatedTour.published_at
  const cachedTours = await redisClient.hgetAsync('data', 'fetchTours')

  if (isDeleteHook) {
    const response = await removeTour(updatedTour, cachedTours)
    return logger.info('Delete tour response: ', response)
  }

  if (!isDeleteHook) {
    const response = await addTour(updatedTour, cachedTours)
    return logger.info('Add tour response: ', response)
  }
}

export const handleWebhooksShows = async (req, res) => {
  logger.info('Webhook: Show updated')

  const updatedShow = req.body
  const { id } = updatedShow

  // acknowledge webhook was received
  if (id) res.status(200).end()

  const isDeleteHook = !updatedShow.published_at

  try {
    if (isDeleteHook) { // Delete show flow
      const response = await removeShow(updatedShow)
      console.log('delete show response', response)
      return response ? logger.info('Show removed') : logger.info('Show not removed')
    }

    if (!isDeleteHook) { // Add show flow
      const response = await addShow(updatedShow)
      return response ? logger.info('Show added') : logger.info('Show not added')
    }
  } catch (err) {
    return logger.error(err.message)
  }
}

export const handleWebhooksOrders = (req, res) => {
  console.log('handleWebhooksOrders', req.body)
}

export const fetchTours = async (req, res) => {
  // redisClient.hdel('data', 'fetchTours')
  const redisResponse = await redisClient.hgetAsync('data', 'fetchTours')
  console.log('Tours: ', redisResponse)
  try {
    const cachedTours = await redisClient.hgetAsync('data', 'fetchTours')

    let response = JSON.parse(cachedTours)

    if (!cachedTours) {
      const tourList = await shopify.collectionListing.list()

      if (tourList.length < 1) throw new Error('No tours found.')

      redisClient.hset('data', 'fetchTours', JSON.stringify(tourList))

      response = tourList
    }

    return res.status(200).json(response)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const fetchShows = async (req, res) => {
  // collection_id is optional
  const { collection_id } = req.query

  try {
    const cachedShows = await redisClient.hgetAsync('shows', `${collection_id || 'all'}`)

    let response = JSON.parse(cachedShows)

    if (!cachedShows) {
      response = await fetchShowsFromShopify(collection_id)
    }

    return res.status(200).json(response)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const fetchOrders = async (req, res) => {
  const { variant_id } = req.query
  // TODO: Remove logs when finished testing
  // redisClient.del('orders', (err, resp) => console.log(resp))
  redisClient.hkeys('orders', (err, resp) => console.log('hash', resp))
  try {
    let cachedVariantOrders = await redisClient.hgetAsync('orders', `${variant_id}`)
    console.log('cachedVariantOrders', cachedVariantOrders)

    let response = JSON.parse(cachedVariantOrders)

    if (!cachedVariantOrders) {
      const cachedOrders = await redisClient.hgetAsync('orders', 'all')
      console.log('cachedOrders', cachedOrders)

      if (!cachedOrders) {
        // if master orders list isn't cached, fetch from Shopify
        const orders = await shopify.order.list()

        if (!orders || orders.length < 1) throw new Error('Failed to fetch orders.')

        // metafields aren't included on base order object, so we have to fetch them and add them
        const modifiedOrdersList = await addMetafieldsToOrders(orders)

        redisClient.hset('orders', 'all', JSON.stringify(modifiedOrdersList))

        // if a variant_id query is passed, filter the orders for that variant
        if (Object.keys(req.query).includes('variant_id')) {
          const variantOrders = await filterOrdersByVariantId(modifiedOrdersList, variant_id)

          redisClient.hset('orders', `${variant_id}`, JSON.stringify(variantOrders))

          response = variantOrders
        }
      }

      cachedVariantOrders = await filterOrdersByVariantId(JSON.parse(cachedOrders), variant_id)

      redisClient.hset('orders', `${variant_id}`, JSON.stringify(cachedVariantOrders), (err, resp) => console.log('hset', `${variant_id} ${resp}`))

      response = cachedVariantOrders
    }

    return res.status(200).json(response)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

/*  Metafield Controllers */

export const fetchMetafieldsForResource = async (req, res) => {
  const { owner_resource, owner_id } = req.query

  try {
    const metafields = await fetchMetafields(owner_resource, owner_id)

    res.status(200).json(metafields)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const fetchSingleMetafield = async (req, res) => {
  const { id } = req.query

  try {
    const metafield = await shopify.metafield.get(id)

    res.status(200).json(metafield)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
