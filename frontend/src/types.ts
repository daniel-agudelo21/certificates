export interface CertificateData {
  openingPhrase: string
  coursePhrase: string
  courseName: string
  signature: Signature
  /** Heredado de plantillas antiguas; ya no se elige: la API genera todos los estilos. */
  style?: CertificateStyle
  colors: ColorScheme
  logo: LogoData | null
  logoPlacement: LogoPlacement
  /** % de la zona máxima de la posición elegida (50–100). */
  logoSize: number
  fixedTexts: FixedText[]
}

export interface SignatureImage {
  base64: string
  mimeType: 'image/png' | 'image/jpeg'
  width: number
  height: number
  name: string
}

export interface Signature {
  name: string
  role: string
  image: SignatureImage | null
}

export type LogoPlacement = 'top' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export type CertificateStyle = 'formal' | 'moderno' | 'academico' | 'creativo'

export interface ColorScheme {
  primary: string
  secondary: string
  accent: string
}

export interface LogoData {
  /** Peso del archivo original en bytes. */
  size: number
  base64: string
  mimeType: 'image/png' | 'image/svg+xml'
  width: number
  height: number
  name: string
}

export interface Position {
  x: number
  y: number
}

export interface FixedText {
  id: string
  label: string
  value: string
  position: Position
  fontSize: number
  color: string
  fontFamily: string
}

export interface Template {
  id: string
  name: string
  data: CertificateData
  thumbnail?: string
  createdAt: number
  updatedAt: number
}

export interface GenerateRequest {
  templateId?: string
  data: CertificateData
  /** Con estilo: la API devuelve ese certificado en PNG (descarga). Sin estilo: la vista previa de los 4. */
  style?: CertificateStyle
  seed?: number
}

export interface GenerateVariant {
  style: CertificateStyle
  /** Miniatura JPEG (data URL) para elegir; el certificado definitivo se pide al descargar. */
  previewUrl: string
}

export interface GenerateResponse {
  success: boolean
  /** Una vista previa por estilo. */
  variants?: GenerateVariant[]
  /** Semilla de la variación visual: la descarga la reenvía para obtener el mismo diseño. */
  seed?: number
  certificateId?: string
  error?: string
}

export interface User {
  uid: string
  email: string
  displayName?: string
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}