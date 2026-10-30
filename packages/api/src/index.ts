import { createApp } from './app'
import { config } from './config'

const started = performance.now()
const { app, store } = createApp()
const seedMs = Math.round(performance.now() - started)

app.listen(config.port, () => {
  const total = store.queryOrders({
    page: 1,
    pageSize: 1,
    sortBy: 'orderDate',
    sortDir: 'desc',
  }).total
  console.log(`OrderDesk API listening on http://localhost:${config.port}/api`)
  console.log(
    `Seeded ${total} orders in ${seedMs} ms (seed=${config.seed}, delay=${config.delayMs} ms)`,
  )
  console.log('Accounts: admin@orderdesk.dev / admin123  |  viewer@orderdesk.dev / viewer123')
})

// Public demo: put the dataset back to its seeded state on a fixed schedule.
if (config.resetEveryMinutes > 0) {
  setInterval(
    () => {
      store.reset()
      console.log(`Dataset reseeded (every ${config.resetEveryMinutes} min)`)
    },
    config.resetEveryMinutes * 60 * 1000,
  ).unref()
}
