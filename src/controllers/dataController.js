import shopify from '../config/shopify'
import {
  filterOrdersByVariantId,
  addMetafieldsToShows,
  addMetafieldsToOrders,
  fetchMetafields,
} from '../services/dataService'

export const fetchTours = async (req, res) => {
  try {
    const tourList = await shopify.collectionListing.list()
    if (tourList.length < 1) throw new Error('No tours found.')

    return res.status(200).json(tourList)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const fetchShows = async (req, res) => {
  try {
    // collection_id is optional
    const { collection_id } = req.query

    const showsList = await shopify.productListing.list({ collection_id })

    const modifiedShowsList = await addMetafieldsToShows(showsList)

    res.status(200).json(modifiedShowsList)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const fetchOrders = async (req, res) => {
  try {
    const { variant_id } = req.query

    const orders = await shopify.order.list()

    const modifiedOrdersList = await addMetafieldsToOrders(orders)

    // if a variant_id query is passed, filter the orders for that variant
    if (Object.keys(req.query).includes('variant_id')) {
      const variantOrders = filterOrdersByVariantId(modifiedOrdersList, variant_id)

      return res.status(200).json(variantOrders)
    }

    return res.status(200).json(orders)
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
