import express from 'express'
import passport from 'passport'
import {
  fetchTours,
  fetchShows,
  fetchOrders,
  fetchMetafieldsForResource,
  fetchSingleMetafield,
} from '../controllers/dataController'
import passportConfig from '../config/passport'

const requireAuth = passport.authenticate('jwt', { session: false })

const router = express.Router()
const dataRouter = express.Router()

router.use(requireAuth)

router.get('/fetchTours', fetchTours)
router.get('/fetchShows', fetchShows)
router.get('/fetchOrders', fetchOrders)

router.get('/fetchMetafieldsForResource', fetchMetafieldsForResource)
router.get('/fetchSingleMetafield', fetchSingleMetafield)

dataRouter.use('/data', router)

export default dataRouter
