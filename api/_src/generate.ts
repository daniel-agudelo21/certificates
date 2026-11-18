import { GenerateRequestSchema, CERTIFICATE_STYLES, type CertificateStyle } from './models/schemas.js'
import { renderCertificate, enhanceForPrint, createPreview } from './services/overlay-engine.js'
import { generateCertificateId } from './services/certificate-id.js'
import { config } from './config.js'

// Tipos mínimos que cumplen tanto Express (servidor local) como las funciones de Vercel.
interface Req {
  method?: string
  body?: unknown
}
interface Res {
  status(code: number): Res
  json(body: unknown): unknown
  send(body: unknown): unknown
  setHeader(name: string, value: string): unknown
}

class RateLimitError extends Error {}

// En memoria: en Vercel vale por instancia de la función (no es un límite global, pero frena ráfagas).
const recentRequests: number[] = []

function checkRateLimit(): void {
  const now = Date.now()
  const windowStart = now - config.limits.rateLimitWindowMs
  while (recentRequests.length && recentRequests[0] <= windowStart) recentRequests.shift()
  if (recentRequests.length >= config.limits.rateLimitMaxRequests) {
    throw new RateLimitError('Demasiadas solicitudes seguidas. Espera un minuto e inténtalo de nuevo.')
  }
  recentRequests.push(now)
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    checkRateLimit()

    const parseResult = GenerateRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
      return res.status(400).json({ error: `Datos inválidos (${issues.join('; ')})`, details: parseResult.error.flatten() })
    }

    const { data, style, seed: requestedSeed } = parseResult.data

    // Descarga: un solo estilo, a resolución de impresión. No se guarda nada en ningún lado.
    if (style) {
      const png = await enhanceForPrint(await renderCertificate(data, style, requestedSeed ?? 0))
      res.setHeader('Content-Type', 'image/png')
      res.setHeader('Content-Disposition', `attachment; filename="certificado-${style}.png"`)
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).send(png)
    }

    // Vista previa: los 4 estilos como miniaturas dentro de la respuesta. Se renderizan en serie para
    // cuidar la memoria de Vercel. Nada se guarda: el certificado definitivo se genera al descargar.
    const certificateId = generateCertificateId()
    // Cada generación tiene su semilla: otro diseño en cada estilo, y la misma semilla repite el mismo diseño.
    const seed = Math.floor(Math.random() * 4294967296)
    const variants: { style: CertificateStyle; previewUrl: string }[] = []
    for (const s of CERTIFICATE_STYLES) {
      variants.push({ style: s, previewUrl: await createPreview(await renderCertificate(data, s, seed)) })
    }
    console.log(`${certificateId}: vista previa de ${variants.length} estilos`)

    return res.status(200).json({ success: true, certificateId, seed, variants })
  } catch (error: unknown) {
    if (error instanceof RateLimitError) {
      return res.status(429).json({ error: error.message })
    }
    console.error('Error al generar:', error)
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Error interno del servidor' })
  }
}
