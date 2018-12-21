import shopify from '../config/shopify'
import { emailSentMetafield } from '../helpers/metafieldHelpers'
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

export const fetchShowsFromShopify = async (collection_id) => {
  const showsList = await shopify.productListing.list({ collection_id })

  if (!showsList || showsList.length < 1) throw new Error('Failed to fetch shows.')

  const modifiedShowsList = await addMetafieldsToShows(showsList)
  const showIds = modifiedShowsList.map(show => show.product_id)

  redisClient.hset('shows', `${collection_id || 'all'}`, JSON.stringify(modifiedShowsList))

  // save each product_id with it's parent's collection_id
  showIds.forEach(id => redisClient.hset('shows:collections', id, collection_id))

  return modifiedShowsList
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


export const searchMetafields = (metafieldsList, key, value) => {
  if (!key || !value) throw new Error('Must provide a key and value.')

  return metafieldsList.filter(metafield => metafield[key] === value)
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
export const createMetafield = async (data) => {
  try {
    const result = await shopify.metafield.create(data)

    if (!result || Object.keys(result).length < 1) throw new Error('Error creating metafield')

    return { status: 'success', data: result }
  } catch (err) {
    return { status: 'error', error: err }
  }
}

// TODO: Need to test
export const updateMetafield = async (data) => {
  const { id, ...rest } = data

  try {
    const result = await shopify.metafield.update(id, rest)

    if (!result || Object.keys(result).length < 1) throw new Error('Error updating metafield')

    return { status: 'success', data: result }
  } catch (err) {
    return { status: 'error', error: err }
  }
}

export const fetchMetafields = async (owner_resource, owner_id) => {
  const metafields = await shopify.metafield.list({
    metafield: {
      owner_resource,
      owner_id,
    },
  })

  return metafields
}

export const parseMetafields = arr => arr.reduce((acc, item) => {
  acc[item.key] = item.value
  return acc
}, {})

export const mergeMetafields = (metafields, object) => {
  for (const key in metafields) {
    if (metafields.hasOwnProperty(key)) {
      object[key] = metafields[key]
    }
  }
}

export const addMetafieldsToShows = shows => Promise.all(shows.map(async (show) => {
  await Promise.all(show.variants.map(async (variant) => {
    const metafields = await fetchMetafields('variant', variant.id)
    const parsed = parseMetafields(metafields)

    if (Object.keys(parsed).length > 0) {
      mergeMetafields(parsed, variant)
    }
  }))

  return show
}))

export const addMetafieldsToOrders = orders => Promise.all(orders.map(async (order) => {
  const metafields = await fetchMetafields('order', order.id)
  const parsed = parseMetafields(metafields)

  if (Object.keys(parsed).length > 0) {
    mergeMetafields(parsed, order)
  }

  return order
}))

// TODO: WIP Need to add logic for email_failed when webhooks are setup
export const updateMetafieldsForOrders = async (orders, key, value) => Promise.all(orders.map(async (order) => {
  const metafields = await fetchMetafields('order', order.id)

  if (metafields.length < 1) {
    const response = await createMetafield(emailSentMetafield('order', order.id))

    if (response.status !== 'success') throw new Error(`Error updating metafields for order ${order.id}`)

    return response
  }

  return null
}))
