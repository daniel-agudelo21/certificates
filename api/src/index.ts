import { validateConfig } from './config.js'

validateConfig()

console.log('Certificates API initialized')
console.log('Environment:', process.env.NODE_ENV || 'development')