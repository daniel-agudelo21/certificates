import 'dotenv/config'

import express from 'express'
import cors from 'cors'
import generateHandler from './generate.js'


const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.post('/api/generate', generateHandler)

app.get('/health', (_, res) => res.json({ ok: true }))

const server = app.listen(PORT, () => {
  console.log(`🚀 Local API server running on http://localhost:${PORT}`)
  console.log(`📡 Endpoints:`)
  console.log(`   POST   http://localhost:${PORT}/api/generate`)
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