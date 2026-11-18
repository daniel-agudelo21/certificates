import type { CertificateStyle } from '../types'

/** Orden y nombre de los estilos que la API genera en cada petición (debe coincidir con CERTIFICATE_STYLES de la API). */
export const STYLE_LABELS: Record<CertificateStyle, string> = {
  formal: 'Formal',
  moderno: 'Moderno',
  academico: 'Académico',
  creativo: 'Creativo',
}
