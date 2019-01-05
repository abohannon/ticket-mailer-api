import shopify from '../helpers/shopify'
import {
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
  try {
    const tours = await shopify.cache({ key: 'tours' }).getTours()
    return res.status(200).json(tours)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const fetchShows = async (req, res) => {
  // collection_id is optional
  const { collection_id } = req.query

  try {
    const shows = await shopify.cache({ key: 'shows' }).getShows(collection_id)
    return res.status(200).json(shows)
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: err.message })
  }
}

export const fetchOrders = async (req, res) => {
  const { variant_id } = req.query

  try {
    const orders = await shopify.cache({ key: 'orders' }).getOrders(variant_id)
    return res.status(200).json(orders)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

/*  Metafield Controllers */

export const fetchMetafieldsForResource = async (req, res) => {
  const { owner_resource, owner_id } = req.query

  try {
    const metafields = await shopify.fetchMetafields(owner_resource, owner_id)

    res.status(200).json(metafields)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
