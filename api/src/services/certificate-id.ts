import * as crypto from 'crypto'

/** ID interno de cada generación (solo para el registro); ya no se imprime en el certificado. */
export function generateCertificateId(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const random = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `CERT-${dateStr}-${random}`
}
