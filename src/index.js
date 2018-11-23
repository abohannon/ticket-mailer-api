import express from 'express'
import http from 'http'
import bodyParser from 'body-parser'
import cors from 'cors'
import morgan from 'morgan'
import mongoose from 'mongoose'
import dbConfig from './config/db'
import redisdb from './config/redis'
import authRouter from './routes/authRoutes'
import dataRouter from './routes/dataRoutes'
import userRouter from './routes/userRoutes'
import emailRouter from './routes/emailRoutes'

const app = express()
const ENV = process.env.NODE_ENV || 'development'

console.log('Environment: ', ENV)

// Redis
redisdb(ENV)

// MongoDB Setup
const connect = async () => {
  try {
    await mongoose.connect(dbConfig[ENV], () => console.log(`YEWWWWW ${ENV} MongoDB connected!`))
  } catch (err) {
    console.log('Error connected to MongoDB', err)
  }
}

connect()

// Express middleware
app.use(cors()) // TODO: configure
app.use(morgan('dev'))
app.use(bodyParser.json())
app.set('trust proxy', true)

// Routes
app.get('/', (req, res) => {
  res.status(200).json({ message: 'api running' })
})
app.use('/', dataRouter)
app.use('/', authRouter)
app.use('/', userRouter)
app.use('/', emailRouter)

// Server setup
const PORT = process.env.PORT || 3001
const server = http.createServer(app)
server.listen(PORT)
console.log(`Server listening on ${PORT}`)
