import express from 'express'
import passport from 'passport'
import {
  fetchTours,
  fetchShows,
  fetchOrders,
  fetchMetafieldsForResource,
  fetchSingleMetafield,
  handleWebhooksCollections,
  handleWebhooksProducts,
  handleWebhooksOrders,
} from '../controllers/dataController'
import passportConfig from '../config/passport'

const requireAuth = passport.authenticate('jwt', { session: false })

const router = express.Router()
const dataRouter = express.Router()

router.get('/fetchTours', requireAuth, fetchTours)
router.get('/fetchShows', requireAuth, fetchShows)
router.get('/fetchOrders', requireAuth, fetchOrders)

router.get('/fetchMetafieldsForResource', requireAuth, fetchMetafieldsForResource)
router.get('/fetchSingleMetafield', requireAuth, fetchSingleMetafield)

router.post('/webhooks/collections', handleWebhooksCollections)
router.post('/webhooks/products', handleWebhooksProducts)
router.post('/webhooks/orders', handleWebhooksOrders)

dataRouter.use('/data', router)

export default dataRouter
