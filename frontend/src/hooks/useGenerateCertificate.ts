import { useState, useCallback } from 'react'
import { generateCertificate } from '../services/api'
import type { GenerateResponse, CertificateData } from '../types'

export function useGenerateCertificate() {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<string>('')
  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async (data: CertificateData, templateId?: string) => {
    setLoading(true)
    setProgress('Generando los 4 estilos…')
    setError(null)
    setResult(null)

    try {
      const response = await generateCertificate({ data, templateId })
      setResult(response)
      setProgress('¡Certificado generado!')
      return response
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al generar certificado'
      setError(message)
      setProgress('')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    setProgress('')
  }, [])

  return { generate, loading, progress, result, error, reset }
}