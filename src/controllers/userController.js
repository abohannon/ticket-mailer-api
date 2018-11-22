import uuidv4 from 'uuid'
import User from '../models/user'
import { sendUpdatedUserEmail } from '../services/userService'
import { sendSingleEmail } from '../services/emailService'


let redisClient

export const userController = {
  setRedisClient(client) { redisClient = client },
}

export const verifyToken = (req, res) => {
  const { token } = req.query

  redisClient.exists(token, (err, response) => {
    if (err) {
      return res.status(500).json({ error: err.message })
    }

    if (!response) {
      return res.status(404).json({ tokenExists: false })
    }

    return res.status(200).json({ tokenExists: true })
  })
}

export const inviteNewUser = async (req, res) => {
  const { email } = req.query

  const uuid = uuidv4()
  const link = `${process.env.HOST_URL}/signup?token=${uuid}`

  const tokenExpiration = 60 * 60 * 24
  redisClient.set(uuid, 'true', 'EX', tokenExpiration)

  const message = {
    to: email,
    from: 'no-reply@showstubs.com',
    subject: 'Team member invite to SHOWstubs Ticket Mailer',
    html: `
    <p>You've been invited to join the SHOWstubs Ticket Mailer admin dashboard.</p>
    <br>
    <p><a href="${link}">Click here</a> to sign up.</p>
    <p>*Link only valid for 24 hours.</p>
    `,
  }

  try {
    const response = await sendSingleEmail(message)
    return res.status(200).json(response)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const verifyEmail = (req, res) => {
  console.log(req.body)
}

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.query

    const response = await User.deleteOne({ _id: userId }).exec()

    if (!response) {
      return res.status(404).json({ message: 'No user found' })
    }

    return res.status(200).json({ message: 'User successfully deleted' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const fetchUsers = async (req, res) => {
  try {
    const fields = 'name admin email'

    const users = await User.find({}, fields).exec()

    return res.status(200).json(users)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export const updateUser = async (req, res) => {
  const userId = req.user.id
  const update = req.body

  try {
    const updatedUser = await User.findOneAndUpdate({ _id: userId }, update)
    if (!updatedUser) {
      throw new Error('No user found.')
    }

    if (updatedUser.email !== req.body.email) {
      const options = {
        newEmail: req.body.email,
        name: req.body.name,
      }

      const emailResponse = await sendUpdatedUserEmail(options)

      if (!emailResponse) {
        throw new Error('Error sending email')
      }

      console.log(`Email sent to ${req.body.email}`)
    }

    return res.status(200).json({ status: 200, message: 'Success' })
  } catch (err) {
    return res.status(501).json({ error: err.message })
  }
}
