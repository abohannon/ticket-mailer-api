import shopify from '../config/shopify'
import {
  filterOrdersByVariantId,
  addMetafieldsToShows,
  addMetafieldsToOrders,
  fetchMetafields,
} from '../services/dataService'

let redisClient

export const dataController = {
  setRedisClient(client) { redisClient = client },
}

export const fetchTours = async (req, res) => {
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
      const showsList = await shopify.productListing.list({ collection_id })

      if (!showsList || showsList.length < 1) throw new Error('Failed to fetch shows.')

      const modifiedShowsList = await addMetafieldsToShows(showsList)

      redisClient.hset('shows', `${collection_id || 'all'}`, JSON.stringify(modifiedShowsList))

      response = modifiedShowsList
    }

    return res.status(200).json(response)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const fetchOrders = async (req, res) => {
  const { variant_id } = req.query
  // TODO: Cache all orders instead and do work on that array from Redis
  try {
    const cachedOrders = await redisClient.hgetAsync('orders', `${variant_id}`)

    let response = JSON.parse(cachedOrders)

    if (!cachedOrders) {
      const orders = await shopify.order.list()

      if (!orders || orders.length < 1) throw new Error('Failed to fetch orders.')

      const modifiedOrdersList = await addMetafieldsToOrders(orders)

      // if a variant_id query is passed, filter the orders for that variant
      if (Object.keys(req.query).includes('variant_id')) {
        const variantOrders = await filterOrdersByVariantId(modifiedOrdersList, variant_id)

        redisClient.hset('orders', `${variant_id}`, JSON.stringify(variantOrders))

        response = variantOrders
      }
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
