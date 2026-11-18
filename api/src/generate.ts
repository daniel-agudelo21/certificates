import { Request, Response } from 'express'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { GenerateRequestSchema } from './models/schemas.js'
import { CERTIFICATE_STYLES } from './models/schemas.js'
import { renderCertificate, enhanceForPrint, createPreview } from './services/overlay-engine.js'
import { generateCertificateId } from './services/certificate-id.js'
import { config } from './config.js'

const ANONYMOUS_USER_ID = 'anonymous'
const isLocal = process.env.NODE_ENV !== 'production'

let db: any = null
if (!isLocal) {
  if (getApps().length === 0) {
    initializeApp({
      projectId: config.firebase.projectId,
    })
  }
  db = getFirestore()
}

const memoryRateLimits = new Map<string, number[]>()

async function checkRateLimit(): Promise<void> {
  if (isLocal) {
    const now = Date.now()
    const windowStart = now - config.limits.rateLimitWindowMs
    const requests = memoryRateLimits.get(ANONYMOUS_USER_ID) || []
    const recentRequests = requests.filter((t) => t > windowStart)
    if (recentRequests.length >= config.limits.rateLimitMaxRequests) {
      throw new Error('Rate limit exceeded. Try again later.')
    }
    recentRequests.push(now)
    memoryRateLimits.set(ANONYMOUS_USER_ID, recentRequests)
    return
  }

  const now = Date.now()
  const windowStart = now - config.limits.rateLimitWindowMs

  const userRef = db.collection('rateLimits').doc(ANONYMOUS_USER_ID)
  const snap = await userRef.get()

  if (snap.exists) {
    const data = snap.data()!
    const recentRequests = data.requests.filter((t: number) => t > windowStart)
    if (recentRequests.length >= config.limits.rateLimitMaxRequests) {
      throw new Error('Rate limit exceeded. Try again later.')
    }
    recentRequests.push(now)
    await userRef.update({ requests: recentRequests })
  } else {
    await userRef.set({ requests: [now] })
  }
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await checkRateLimit()

    const parseResult = GenerateRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
      return res.status(400).json({ error: `Datos inválidos (${issues.join('; ')})`, details: parseResult.error.flatten() })
    }

    const { data, style, seed: requestedSeed } = parseResult.data

    // Descarga: un solo estilo, a resolución de impresión. No se guarda nada en ningún lado.
    if (style) {
      const png = await enhanceForPrint(await renderCertificate(data, style, requestedSeed ?? 0))
      res.set({
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="certificado-${style}.png"`,
        'Cache-Control': 'no-store',
      })
      return res.status(200).send(png)
    }

    // Vista previa: los 4 estilos como miniaturas dentro de la respuesta. Se renderizan en serie para
    // cuidar la memoria de Vercel. Nada se guarda: el certificado definitivo se genera al descargar.
    const certificateId = generateCertificateId()
    // Cada generación tiene su semilla: otro diseño en cada estilo, y la misma semilla repite el mismo diseño.
    const seed = Math.floor(Math.random() * 4294967296)
    const variants: { style: (typeof CERTIFICATE_STYLES)[number]; previewUrl: string }[] = []
    for (const s of CERTIFICATE_STYLES) {
      variants.push({ style: s, previewUrl: await createPreview(await renderCertificate(data, s, seed)) })
    }
    console.log(`[${ANONYMOUS_USER_ID}] ${certificateId}: vista previa de ${variants.length} estilos`)

    if (!isLocal && db) {
      await db.collection('certificates').doc(certificateId).set({
        userId: ANONYMOUS_USER_ID,
        courseName: data.courseName,
        certificateId,
        colors: data.colors,
        createdAt: Date.now(),
      })
    }

    return res.status(200).json({ success: true, certificateId, seed, variants })
  } catch (error: any) {
    console.error('Generation error:', error)

    if (error.message.includes('rate') || error.message.includes('Rate limit')) {
      return res.status(429).json({ error: 'Rate limit exceeded. Please wait before generating another certificate.' })
    }

    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}