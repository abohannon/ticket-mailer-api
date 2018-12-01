import Shopify from 'shopify-api-node'

const ENV = process.env.NODE_ENV
const dev = ENV === 'development' || ENV === 'staging'
const prod = ENV === 'production'

let params

// Limit the number of API calls so we don't get a 429 bucket overflor error
// more info: https://help.shopify.com/en/api/getting-started/api-call-limit
const autoLimit = { calls: 2, interval: 1000, bucketSize: 30 }
const timeout = 15000

if (dev) {
  params = {
    autoLimit,
    timeout,
    shopName: process.env.DEV_SHOPIFY_STORE_NAME,
    apiKey: process.env.DEV_SHOPIFY_API_KEY,
    password: process.env.DEV_SHOPIFY_API_PASSWORD,
  }
} else if (prod) {
  params = {
    autoLimit,
    timeout,
    shopName: process.env.PROD_SHOPIFY_STORE_NAME,
    apiKey: process.env.PROD_SHOPIFY_API_KEY,
    password: process.env.PROD_SHOPIFY_API_PASSWORD,
  }
}

export default new Shopify(params)
