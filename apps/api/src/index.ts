import express from 'express'
import cors from 'cors'
import { queryRouter } from './routes/query.js'
import { schemaRouter } from './routes/schema.js'

const app = express()
const PORT = process.env['PORT'] ?? 3001

app.use(cors())
app.use(express.json())

app.use('/query', queryRouter)
app.use('/schema', schemaRouter)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'querylens-api' })
})

app.listen(Number(PORT), () => {
  console.log(`QueryLens API running on port ${PORT}`)
})
