import cors from 'cors'
import express from 'express'
import { config } from './config'
import { Store } from './data/store'
import { delay, errorHandler } from './middleware'
import { createRouter } from './routes'

export interface AppOptions {
  delayMs?: number
  orderCount?: number
}

export function createApp(opts: AppOptions = {}) {
  const store = new Store({
    seed: config.seed,
    orderCount: opts.orderCount ?? config.orderCount,
    customerCount: config.customerCount,
    productCount: config.productCount,
  })

  const app = express()
  app.disable('x-powered-by')
  app.use(cors())
  app.use(express.json({ limit: '5mb' }))
  app.use(delay(opts.delayMs ?? config.delayMs))
  app.use('/api', createRouter(store))
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })
  app.use(errorHandler)
  return { app, store }
}
