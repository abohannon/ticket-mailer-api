import express from 'express'
import http from 'http'
import bodyParser from 'body-parser'
import helmet from 'helmet'
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
app.use(helmet())
  .use(bodyParser.json())
  .use(morgan('dev'))
  .use(cors({
    origin: [
      'http://localhost:3000',
      /\.herokuapp\.com$/,
    ],
    methods: 'GET,PUT,POST,PATCH,DELETE',
    allowedHeaders: 'Origin, X-Requested-With, Content-Type, Authorization, Accept',
    credentials: true,
    optionsSuccessStatus: 200,
  })) // TODO: configure

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
console.log('Environment: ', ENV)
