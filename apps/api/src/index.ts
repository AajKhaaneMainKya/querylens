import express from 'express'
import cors from 'cors'
import { queryRouter } from './routes/query.js'
import { schemaRouter } from './routes/schema.js'
import { exportRouter } from './routes/export.js'
import { connectRouter } from './routes/connect.js'

const app = express()
const PORT = process.env['PORT'] ?? 3001

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.startsWith('http://localhost:')) {
      callback(null, true)
    } else {
      callback(null, process.env['CORS_ORIGIN'] ?? false)
    }
  },
}))
app.use(express.json())

app.use('/query', queryRouter)
app.use('/schema', schemaRouter)
app.use('/export', exportRouter)
app.use('/connect', connectRouter)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'querylens-api' })
})

app.listen(Number(PORT), () => {
  console.log(`QueryLens API running on port ${PORT}`)
})
