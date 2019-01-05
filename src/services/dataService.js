import shopify from '../helpers/shopify'
import { logger } from '../helpers/utils'

let redisClient

export const dataService = {
  setRedisClient(client) { redisClient = client },
}

export const removeTour = async (updatedTour, cachedTours) => {
  const updatedTours = JSON.parse(cachedTours).filter(tour => tour.collection_id !== updatedTour.id)
  console.log('filtered: ', updatedTours)
  try {
    const response = await redisClient.hsetAsync('data', 'fetchTours', JSON.stringify(updatedTours))

    return response
  } catch (err) {
    throw new Error('Error removing tour', err.message)
  }
}

export const addTour = async (updatedTour, cachedTours) => {
  const { id: collection_id, ...rest } = updatedTour
  const newUpdatedTour = { collection_id, ...rest }
  console.log('new tour array: ', [...JSON.parse(cachedTours), newUpdatedTour])
  try {
    const response = await redisClient.hsetAsync('data', 'fetchTours', JSON.stringify([...JSON.parse(cachedTours), newUpdatedTour]))

    return response
  } catch (err) {
    throw new Error('Error adding tour', err.message)
  }
}

export const removeShow = async (updatedShow) => {
  const { id: product_id } = updatedShow

  const collectionId = await redisClient.hgetAsync('shows:collections', product_id)

  if (!collectionId) {
    logger.info('No collection found with that product id')
    return -1
  }

  const cachedShows = await redisClient.hgetAsync('shows', collectionId)

  if (!cachedShows) {
    logger.info('No cached collection found')
    return -1
  }

  const cachedShowsFiltered = JSON.parse(cachedShows).filter(show => show.product_id !== product_id)

  redisClient.hset('shows', collectionId, JSON.stringify(cachedShowsFiltered))
  redisClient.hdel('shows:collections', product_id)

  return 1
}

export const addShow = async (updatedShow) => {
  const { id: product_id, ...rest } = updatedShow

  const newUpdatedShow = { product_id, ...rest }

  const productExistsInCollection = await redisClient.hexistsAsync('shows:collections', product_id)

  if (productExistsInCollection) {
    logger.info('Show already exists in collection')
    return -1
  }

  const collections = await shopify.collect.list({ product_id })

  if (!collections || !collections.length) {
    logger.info('No collections found with that product id')
    return -1
  }

  const { collection_id } = collections[0]
  const cachedShows = await redisClient.hgetAsync('shows', collection_id)

  if (!cachedShows || !cachedShows.length) {
    logger.info('No cached shows for that collection found')
    return -1
  }

  const cachedShowsParsed = JSON.parse(cachedShows)
  const updatedShows = [...cachedShowsParsed, newUpdatedShow]

  redisClient.hset('shows', collection_id, JSON.stringify(updatedShows))
  redisClient.hset('shows:collections', product_id, collection_id)

  return 1
}

export const filterOrdersByVariantId = (orders, id) => {
  if (!Array.isArray(orders)) throw new Error('Param "orders" must be an array')

  return Promise.all(orders.reduce((filtered, order) => {
    order.line_items.forEach((item) => {
      if (item.variant_id == id) {
        filtered.push(order)
      }
    })
    return filtered
  }, []))
}
