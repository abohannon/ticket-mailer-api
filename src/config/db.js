const {
  DEV_MONGO_URI,
  PROD_MONGO_URI,
} = process.env

export default {
  development: DEV_MONGO_URI,
  production: PROD_MONGO_URI,
}
