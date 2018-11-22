import express from 'express'
import passport from 'passport'
import {
  login, signup, authenticateUser, verifyEmail,
} from '../controllers/authController'
import passportConfig from '../config/passport'

// { session: false } tells passport not to create a cookie
const requireAuth = passport.authenticate('jwt', { session: false })

const router = express.Router()
const authRouter = express.Router()

router.post('/login', login)
router.post('/signup', signup)

router.get('/user', requireAuth, authenticateUser)
router.get('/verifyEmail', verifyEmail)

authRouter.use('/auth', router)

export default authRouter
