import type { CertificateData, CertificateStyle, GenerateRequest, GenerateResponse } from '../types'

const API_BASE = '/api'

function getHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' }
}

export async function generateCertificate(data: GenerateRequest): Promise<GenerateResponse> {
  const response = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(error.error || `Error ${response.status}`)
  }

  return response.json()
}

/** Pide el certificado definitivo (PNG a resolución de impresión) de un estilo. No se guarda en el servidor. */
export async function downloadCertificate(data: CertificateData, style: CertificateStyle, seed?: number): Promise<Blob> {
  const response = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ data, style, seed }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }))
    throw new Error(error.error || `Error ${response.status}`)
  }

  return response.blob()
}
