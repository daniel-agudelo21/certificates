import 'dotenv/config'

import express from 'express'
import cors from 'cors'
import generateHandler from './generate.js'
import templatesHandler from './templates.js'


const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.post('/api/generate', generateHandler)
app.get('/api/templates', templatesHandler)
app.post('/api/templates', templatesHandler)
app.put('/api/templates/:id', templatesHandler)
app.delete('/api/templates/:id', templatesHandler)

app.get('/health', (_, res) => res.json({ ok: true }))

const server = app.listen(PORT, () => {
  console.log(`🚀 Local API server running on http://localhost:${PORT}`)
  console.log(`📡 Endpoints:`)
  console.log(`   POST   http://localhost:${PORT}/api/generate`)
  console.log(`   GET    http://localhost:${PORT}/api/templates`)
  console.log(`   POST   http://localhost:${PORT}/api/templates`)
  console.log(`   PUT    http://localhost:${PORT}/api/templates/:id`)
  console.log(`   DELETE http://localhost:${PORT}/api/templates/:id`)
})

server.on('error', (err) => {
  console.error('Server error:', err)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
})