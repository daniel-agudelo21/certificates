import { z } from 'zod'

export const ColorSchemeSchema = z.object({
  primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
})

export const PositionSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
})

export const LogoDataSchema = z.object({
  base64: z.string().min(1),
  mimeType: z.enum(['image/png', 'image/svg+xml']),
  width: z.number().positive(),
  height: z.number().positive(),
})

export const FixedTextSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  position: PositionSchema,
  fontSize: z.number().min(10).max(72),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  fontFamily: z.string().min(1),
})

export const SignatureImageSchema = z.object({
  base64: z.string().min(1),
  mimeType: z.enum(['image/png', 'image/jpeg']),
  width: z.number().positive(),
  height: z.number().positive(),
})

// Nombre y cargo de quien firma; la imagen de la firma es opcional.
export const SignatureSchema = z.object({
  name: z.string().max(80).default(''),
  role: z.string().max(80).default(''),
  image: SignatureImageSchema.nullable().default(null),
})

// Cada generación produce un certificado por estilo; el usuario elige el que más le guste.
export const CERTIFICATE_STYLES = ['formal', 'moderno', 'academico', 'creativo'] as const
export type CertificateStyle = (typeof CERTIFICATE_STYLES)[number]

export type LogoPlacement = 'top' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

export const CertificateDataSchema = z.object({
  // Nombre y curso pueden ir vacíos: en el certificado queda una línea para escribirlos a mano.
  // Frases que enmarcan al participante y al curso (elegidas de una lista o escritas por el usuario).
  openingPhrase: z.string().max(60).default('Certifica que:'),
  coursePhrase: z.string().max(60).default('completó el curso'),
  courseName: z.string().max(120).default(''),
  signature: SignatureSchema.default({}),
  colors: ColorSchemeSchema,
  logo: LogoDataSchema.nullable(),
  // Una de 5 posiciones estándar; las coordenadas las decide el render.
  logoPlacement: z.enum(['top', 'top-left', 'top-right', 'bottom-left', 'bottom-right']).default('top'),
  // Tamaño del logo como % de la zona máxima de su posición (50–100).
  logoSize: z.number().min(50).max(120).default(85),
  fixedTexts: z.array(FixedTextSchema),
})

export const GenerateRequestSchema = z.object({
  templateId: z.string().optional(),
  data: CertificateDataSchema,
  // Sin `style`: devuelve la vista previa de los 4 estilos. Con `style`: devuelve ese certificado en PNG, a resolución de impresión.
  style: z.enum(CERTIFICATE_STYLES).optional(),
  // Semilla de la variación visual. La vista previa la genera y la devuelve; la descarga la reenvía para obtener el mismo diseño.
  seed: z.number().int().min(0).max(4294967295).optional(),
})

export const TemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(50),
  data: CertificateDataSchema,
  thumbnail: z.string().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
})

export type ColorScheme = z.infer<typeof ColorSchemeSchema>
export type Position = z.infer<typeof PositionSchema>
export type Signature = z.infer<typeof SignatureSchema>
export type LogoData = z.infer<typeof LogoDataSchema>
export type FixedText = z.infer<typeof FixedTextSchema>
export type CertificateData = z.infer<typeof CertificateDataSchema>
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>
export type Template = z.infer<typeof TemplateSchema>
