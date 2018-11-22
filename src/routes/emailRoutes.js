import express from 'express'
import passport from 'passport'
import {
  saveEmail,
  fetchEmail,
  sendTicketEmail,
  parseEmailWebhooks,
} from '../controllers/emailController'
import passportConfig from '../config/passport'

const requireAuth = passport.authenticate('jwt', { session: false })

const router = express.Router()
const emailRouter = express.Router()

router.get('/fetchEmail', requireAuth, fetchEmail)

router.post('/saveEmail', requireAuth, saveEmail)
router.post('/sendEmail', requireAuth, sendTicketEmail)
router.post('/webhooks', parseEmailWebhooks)


emailRouter.use('/email', router)

export default emailRouter
