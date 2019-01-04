import redis from 'redis'
import * as Promise from 'bluebird'
import { logger } from '../helpers/utils'
import { userController } from '../controllers/userController'
import { dataController } from '../controllers/dataController'
import { dataService } from '../services/dataService'
import { shopifyHelper } from '../helpers/shopify'

const {
  DEV_REDISTOGO_URL,
  PROD_REDISTOGO_URL,
} = process.env

Promise.promisifyAll(redis)

export default (ENV) => {
  let client

  switch (ENV) {
    case 'development':
    case 'staging':
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
    dataController.setRedisClient(client)
    dataService.setRedisClient(client)
    shopifyHelper.setRedisClient(client)
  }
}
