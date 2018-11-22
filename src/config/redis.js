import redis from 'redis'
import { logger } from '../helpers/utils'
import { userController } from '../controllers/userController'

const {
  DEV_REDISTOGO_URL,
  PROD_REDISTOGO_URL,
} = process.env

export default (ENV) => {
  let client

  switch (ENV) {
    case 'local':
    case 'development':
      client = redis.createClient(DEV_REDISTOGO_URL)
      break
    case 'production':
      client = redis.createClient(PROD_REDISTOGO_URL)
      break
    default:
      return null
  }

  if (client) {
    client.on('connect', () => {
      logger.info('Redis connection established.')
    })
      .on('error', (err) => {
        logger.debug('Redis connection error:', err, err.stack)
      })

    userController.setRedisClient(client)
  }
}
