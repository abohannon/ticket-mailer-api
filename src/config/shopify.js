import Shopify from 'shopify-api-node'

const ENV = process.env.NODE_ENV
const dev = ENV === 'development' || ENV === 'staging'
const prod = ENV === 'production'

let params

if (dev) {
  params = {
    shopName: process.env.DEV_SHOPIFY_STORE_NAME,
    apiKey: process.env.DEV_SHOPIFY_API_KEY,
    password: process.env.DEV_SHOPIFY_API_PASSWORD,
  }
} else if (prod) {
  params = {
    shopName: process.env.PROD_SHOPIFY_STORE_NAME,
    apiKey: process.env.PROD_SHOPIFY_API_KEY,
    password: process.env.PROD_SHOPIFY_API_PASSWORD,
  }
}

export default new Shopify(params)
