import express from 'express'
import passport from 'passport'
import {
  updateUser,
  verifyEmail,
  fetchUsers,
  deleteUser,
  inviteNewUser,
  verifyToken,
} from '../controllers/userController'
import passportConfig from '../config/passport'

// { session: false } tells passport not to create a cookie
const requireAuth = passport.authenticate('jwt', { session: false })

const router = express.Router()
const userRouter = express.Router()

router.post('/updateUser', requireAuth, updateUser)
router.post('/verifyEmail', verifyEmail)

router.get('/fetchUsers', requireAuth, fetchUsers)
router.get('/inviteNewUser', requireAuth, inviteNewUser)
router.get('/verifyToken', verifyToken)

router.delete('/deleteUser', requireAuth, deleteUser)

userRouter.use('/user', router)

export default userRouter
