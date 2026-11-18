import type { CertificateData, CertificateStyle, GenerateRequest, GenerateResponse, Template } from '../types'

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

export async function getTemplates(): Promise<Template[]> {
  const response = await fetch(`${API_BASE}/templates`, { headers: getHeaders() })

  if (!response.ok) {
    throw new Error('Error al cargar plantillas')
  }

  return response.json()
}

export async function saveTemplate(template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<Template> {
  const response = await fetch(`${API_BASE}/templates`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(template),
  })

  if (!response.ok) {
    throw new Error('Error al guardar plantilla')
  }

  return response.json()
}

export async function updateTemplate(id: string, data: Partial<Template>): Promise<Template> {
  const response = await fetch(`${API_BASE}/templates/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Error al actualizar plantilla')
  }

  return response.json()
}

export async function deleteTemplate(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/templates/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })

  if (!response.ok) {
    throw new Error('Error al eliminar plantilla')
  }
}