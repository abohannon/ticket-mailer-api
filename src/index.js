import express from 'express'
import http from 'http'
import bodyParser from 'body-parser'
import morgan from 'morgan'
import mongoose from 'mongoose'
import redisdb from './config/redis'
import authRouter from './routes/authRoutes'
import dataRouter from './routes/dataRoutes'
import userRouter from './routes/userRoutes'
import emailRouter from './routes/emailRoutes'

const app = express()
const ENV = process.env.NODE_ENV || 'development'

console.log(ENV)

// Redis
redisdb(ENV)

// MongoDB Setup
mongoose.connect(process.env.DEV_MONGO_URI, () => console.log('YEWWWWW MongoDB connected!'))

// Express middleware
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

// Serve static files for production
if (process.env.NODE_ENV === 'production'
  || process.env.NODE_ENV === 'staging') {
  app.use(express.static('client/dist'))

  const path = require('path')
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'dist', 'index.html'))
  })
}

// Server setup
const PORT = process.env.PORT || 3001
const server = http.createServer(app)
server.listen(PORT)
console.log(`Server listening on ${PORT}`)
