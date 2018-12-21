import shopify from '../config/shopify'
import {
  fetchShowsFromShopify,
  filterOrdersByVariantId,
  addMetafieldsToOrders,
  fetchMetafields,
} from '../services/dataService'

let redisClient

export const dataController = {
  setRedisClient(client) { redisClient = client },
}

export const handleWebhooksTours = async (req, res) => {
  console.log('handleWebhooksTours===', req.body)

  const updatedTour = req.body
  const cachedTours = await redisClient.hgetAsync('data', 'fetchTours')

  if (cachedTours) {
    const cachedToursParsed = JSON.parse(cachedTours)

    // need to slightly modify the updatedTour object to match the keys on the cachedTours object
    const { id: collection_id, ...rest } = updatedTour
    const newUpdatedTour = { collection_id, ...rest }

    const hasUpdatedTourId = cachedToursParsed.some(tour => tour.collection_id === newUpdatedTour.collection_id)

    // check if webhook is for creation
    if (newUpdatedTour.published_at && !hasUpdatedTourId) {
      const updatedTours = [...cachedToursParsed, newUpdatedTour]
      redisClient.hset('data', 'fetchTours', JSON.stringify(updatedTours))
    }

    // check if webhook is for deletion
    if (!newUpdatedTour.published_at && hasUpdatedTourId) {
      const updatedTours = cachedToursParsed.filter(tour => tour.collection_id !== updatedTour.collection_id)
      redisClient.hset('data', 'fetchTours', JSON.stringify(updatedTours))
    }
  }
}

// TODO: COMPLETE
export const handleWebhooksShows = async (req, res) => {
  console.log('handleWebhooksShows', req.body)

  const updatedShow = req.body
  const { id: product_id, ...rest } = updatedShow

  try {
    // if (!updatedShow.published_at)
    const collections = await shopify.collect.list({ product_id })
    console.log('collections', collections)
    if (!collections || !collections.length) throw new Error('No collections found with that product ID')
    const { collection_id } = collections[0]
    console.log('collect id', collection_id)

    // const cachedShows = await redisClient.hgetAsync('shows', `${collection_id}`)

    // if (!cachedShows || !cachedShows.length) throw new Error('No cached shows for that collection found')
    // console.log('cachedShows', cachedShows)
    // const cachedShowsParsed = JSON.parse(cachedShows)
    // console.log('cachedShowsParsed', cachedShowsParsed)
    // const newUpdatedShow = { product_id, ...rest }
    // console.log('newUpdatedShow', newUpdatedShow)

    // const hasUpdatedShow = cachedShowsParsed.some(show => show.product_id === newUpdatedShow.product_id)
    // console.log('hasUpdatedShow', hasUpdatedShow)

    // let updatedShows

    // // Webhook show creation flow
    // if (newUpdatedShow.published_at && !hasUpdatedShow) {
    //   updatedShows = [...cachedShowsParsed, newUpdatedShow]
    //   console.log('ADD', updatedShows)
    // }

    // // Webhook show deletion flow
    // if (!newUpdatedShow.published_at && hasUpdatedShow) {
    //   updatedShows = cachedShowsParsed.filter(show => show.product_id !== newUpdatedShow.product_id)
    //   console.log('DELETE', updatedShows)
    // }

    // if (updatedShows) {
    //   redisClient.hset('shows', `${collection_id}`, JSON.stringify(updatedShows), () => console.log('hset'))
    // }
  } catch (err) {
    console.log(err)
  }
}

export const handleWebhooksOrders = (req, res) => {
  console.log('handleWebhooksOrders', req.body)
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

  // TODO: The following used for testing
  // redisClient.del(collection_id)
  // redisClient.del('shows')
  const productIds = await redisClient.smembersAsync(`${collection_id}`)
  console.log(productIds)
  // *********

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
