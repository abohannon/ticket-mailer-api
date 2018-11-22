import Shopify from 'shopify-api-node'

export default new Shopify({
  shopName: process.env.DEV_SHOPIFY_STORE_NAME,
  apiKey: process.env.DEV_SHOPIFY_API_KEY,
  password: process.env.DEV_SHOPIFY_API_PASSWORD,
})
