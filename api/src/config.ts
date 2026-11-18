export const config = {
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET!,
  },
  limits: {
    maxCertificatesPerUserPerDay: 50,
    rateLimitWindowMs: 60_000,
    rateLimitMaxRequests: 10,
  },
}

export function validateConfig() {
  const required = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
  ]

  const missing = required.filter(key => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}