import mongoose from 'mongoose'

export const REF_USER = {
  type: mongoose.Schema.ObjectId,
  ref: 'user',
}
