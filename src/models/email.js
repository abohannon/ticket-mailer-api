import mongoose from 'mongoose'

const { Schema } = mongoose

const emailSchema = new Schema({
  variant_id: Number,
  check_in: Date,
  start_time: Date,
  pickup_items: String,
  shipping_items: String,
  shipping_date: Date,
  digital_items: String,
  digital_delivery_date: Date,
  event_notes: String,
  qr_code_url: String,
})

const ModelClass = mongoose.model('email', emailSchema)

export default ModelClass
