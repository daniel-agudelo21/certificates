import sharp from 'sharp'
import { createCanvas, loadImage, GlobalFonts, type SKRSContext2D, type Image } from '@napi-rs/canvas'
import * as path from 'path'
import * as fs from 'fs'
import { fileURLToPath } from 'url'
import type { CertificateData, CertificateStyle, LogoPlacement } from '../models/schemas.js'
import { buildBackgroundSvg, textPalette, WIDTH, HEIGHT } from './background-templates.js'

// api/_src/services -> api/fonts (en Vercel se incluyen con `includeFiles` en vercel.json)
const FONTS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../fonts')

const FONT_FILES = [
  { file: 'Merriweather_400Regular.ttf', family: 'Merriweather', weight: 'normal' },
  { file: 'Merriweather_700Bold.ttf', family: 'Merriweather', weight: 'bold' },
  { file: 'Inter_400Regular.ttf', family: 'Inter', weight: 'normal' },
  { file: 'Inter_600SemiBold.ttf', family: 'Inter', weight: '600' },
  { file: 'PlayfairDisplay_400Regular.ttf', family: 'Playfair Display', weight: 'normal' },
  { file: 'PlayfairDisplay_700Bold.ttf', family: 'Playfair Display', weight: 'bold' },
  { file: 'Lato_400Regular.ttf', family: 'Lato', weight: 'normal' },
  { file: 'Lato_700Bold.ttf', family: 'Lato', weight: 'bold' },
  { file: 'Montserrat_400Regular.ttf', family: 'Montserrat', weight: 'normal' },
  { file: 'Montserrat_700Bold.ttf', family: 'Montserrat', weight: 'bold' },
  { file: 'Caveat_400Regular.ttf', family: 'Caveat', weight: 'normal' },
  { file: 'Caveat_700Bold.ttf', family: 'Caveat', weight: 'bold' },
  { file: 'Poppins_400Regular.ttf', family: 'Poppins', weight: 'normal' },
  { file: 'Poppins_700Bold.ttf', family: 'Poppins', weight: 'bold' },
]

/**
 * Tipografía de cada estilo: `serif` para frases y curso, `sans` para la firma. `scale` compensa que
 * unas fuentes se ven más grandes o más chicas que otras con el mismo tamaño en px.
 */
const FONT_SETS: Record<CertificateStyle, { serif: string; sans: string; scale: number }> = {
  formal: { serif: 'Playfair Display', sans: 'Lato', scale: 1.04 },
  moderno: { serif: 'Montserrat', sans: 'Montserrat', scale: 0.9 },
  academico: { serif: 'Merriweather', sans: 'Inter', scale: 1 },
  creativo: { serif: 'Caveat', sans: 'Poppins', scale: 1.3 },
}

for (const f of FONT_FILES) {
  const fontPath = path.join(FONTS_DIR, f.file)
  if (!fs.existsSync(fontPath)) {
    console.warn(`Fuente no encontrada: ${fontPath}`)
    continue
  }
  try {
    // Regular y negrita comparten familia: skia elige el archivo según el peso que pida cada `ctx.font`.
    GlobalFonts.registerFromPath(fontPath, f.family)
  } catch (e) {
    console.warn(`No se pudo registrar la fuente ${f.file}:`, e)
  }
}

/** Parte el texto en líneas que caben en `maxWidth` (sin cortar palabras). */
function wrapLines(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

/** Dibuja texto centrado; reduce el tamaño hasta que quepa en `maxLines` líneas. Devuelve el alto usado. */
function drawFittedText(
  ctx: SKRSContext2D,
  text: string,
  opts: { x: number; y: number; maxWidth: number; maxLines: number; size: number; minSize: number; font: (size: number) => string; color: string }
): { height: number; lastBaseline: number; size: number } {
  let size = opts.size
  let lines: string[] = []
  for (; size >= opts.minSize; size -= 4) {
    ctx.font = opts.font(size)
    lines = wrapLines(ctx, text, opts.maxWidth)
    if (lines.length <= opts.maxLines && lines.every((l) => ctx.measureText(l).width <= opts.maxWidth)) break
  }
  const lineHeight = size * 1.25
  ctx.fillStyle = opts.color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const top = opts.y - ((lines.length - 1) * lineHeight) / 2
  lines.forEach((l, i) => ctx.fillText(l, opts.x, top + i * lineHeight))
  return { height: lines.length * lineHeight, lastBaseline: top + (lines.length - 1) * lineHeight, size }
}

/**
 * Zonas máximas seguras del logo, en píxeles de la hoja (2048×1536), y hacia dónde se alinea dentro de ellas.
 * Cada zona queda dentro del marco, sin tocar los adornos de esquina ni la frase de apertura (que empieza
 * en y≈452). El logo ocupa entre LOGO_SIZE_MIN % y LOGO_SIZE_MAX % de la zona, así nunca se sale del
 * espacio disponible. Debe coincidir con LOGO_REGIONS de frontend/src/services/logoPlacement.ts.
 */
const LOGO_SIZE_MIN = 50
const LOGO_SIZE_MAX = 100
type Align = 'start' | 'center' | 'end'
const LOGO_REGIONS: Record<LogoPlacement, { x: number; y: number; w: number; h: number; alignX: Align; alignY: Align }> = {
  top: { x: 624, y: 110, w: 800, h: 290, alignX: 'center', alignY: 'center' },
  'top-left': { x: 300, y: 118, w: 410, h: 261, alignX: 'start', alignY: 'start' },
  'top-right': { x: 1338, y: 118, w: 410, h: 261, alignX: 'end', alignY: 'start' },
  'bottom-left': { x: 300, y: 1144, w: 410, h: 261, alignX: 'start', alignY: 'end' },
  'bottom-right': { x: 1338, y: 1144, w: 410, h: 261, alignX: 'end', alignY: 'end' },
}

function align(start: number, size: number, used: number, mode: Align): number {
  return mode === 'start' ? start : mode === 'end' ? start + size - used : start + (size - used) / 2
}

// Marca de agua opcional: api/assets/watermark.(png|jpg|jpeg|svg). Si no existe, se omite.
const ASSETS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets')
const WATERMARK_OPACITY = 0.8
let watermarkPromise: Promise<Image | null> | null = null

function loadWatermark(): Promise<Image | null> {
  watermarkPromise ??= (async () => {
    for (const ext of ['png', 'jpg', 'jpeg', 'svg']) {
      const file = path.join(ASSETS_DIR, `watermark.${ext}`)
      if (!fs.existsSync(file)) continue
      try {
        return await loadImage(file)
      } catch (e) {
        console.warn(`No se pudo cargar la marca de agua ${file}:`, e)
      }
    }
    return null
  })()
  return watermarkPromise
}

/** Dibuja `img` centrada en (cx, bottom) sin salirse de maxW × maxH. */
function drawContained(ctx: SKRSContext2D, img: Image, cx: number, bottom: number, maxW: number, maxH: number) {
  const ratio = Math.min(maxW / img.width, maxH / img.height)
  const w = img.width * ratio
  const h = img.height * ratio
  ctx.drawImage(img, cx - w / 2, bottom - h, w, h)
}

function line(ctx: SKRSContext2D, x1: number, x2: number, y: number, color: string, width = 3) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(x1, y)
  ctx.lineTo(x2, y)
  ctx.stroke()
}

/**
 * Compone el certificado completo: fondo por plantilla + textos + logo + firma + marca de agua.
 *
 *   Frase de apertura (ej. «Certifica que:»)
 *   ______ Participante ______   (línea para escribir el nombre a mano)
 *   Frase del curso (ej. «completó el curso»)
 *   ______ Curso ______          (ídem)
 *   [firma]  ____ nombre / cargo ____
 *   [marca de agua]
 */
export async function renderCertificate(data: CertificateData, style: CertificateStyle, seed: number): Promise<Buffer> {
  const bgPng = await sharp(Buffer.from(buildBackgroundSvg(data, style, seed))).png().toBuffer()
  const fonts = FONT_SETS[style]
  const px = (size: number) => Math.round(size * fonts.scale)

  const canvas = createCanvas(WIDTH, HEIGHT)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(await loadImage(bgPng), 0, 0, WIDTH, HEIGHT)

  const ink = textPalette(data.colors)
  const cx = WIDTH / 2

  // Marca de agua (al fondo, debajo de todo lo demás)
  const watermark = await loadWatermark()
  if (watermark) {
    ctx.save()
    ctx.globalAlpha = WATERMARK_OPACITY
    drawContained(ctx, watermark, cx, HEIGHT - 135, WIDTH * 0.35, 105)
    ctx.restore()
  }

  // Encabezado fijo
  if (data.openingPhrase.trim()) {
    drawFittedText(ctx, data.openingPhrase.trim(), {
      x: cx, y: HEIGHT * 0.31, maxWidth: WIDTH * 0.8, maxLines: 1, size: 48, minSize: 28,
      font: (s) => `bold ${px(s)}px "${fonts.serif}"`, color: ink.heading,
    })
  }

  // Participante: siempre una línea en blanco para escribir el nombre a mano al imprimir
  const nameY = HEIGHT * 0.395
  const nameSize = 80
  line(ctx, cx - WIDTH * 0.24, cx + WIDTH * 0.24, nameY + nameSize * 0.75, data.colors.primary)

  if (data.coursePhrase.trim()) {
    drawFittedText(ctx, data.coursePhrase.trim(), {
      x: cx, y: HEIGHT * 0.5, maxWidth: WIDTH * 0.8, maxLines: 1, size: 40, minSize: 26,
      font: (s) => `${px(s)}px "${fonts.serif}"`, color: ink.soft,
    })
  }

  // Curso (opcional)
  const courseY = HEIGHT * 0.575
  const courseSize = 56
  const course = data.courseName.trim()
  if (course) {
    const r = drawFittedText(ctx, course, {
      x: cx, y: courseY, maxWidth: WIDTH * 0.72, maxLines: 2, size: courseSize, minSize: 32,
      font: (s) => `bold ${px(s)}px "${fonts.serif}"`, color: ink.heading,
    })
    line(ctx, cx - WIDTH * 0.24, cx + WIDTH * 0.24, r.lastBaseline + r.size * 0.75, data.colors.primary)
  } else {
    line(ctx, cx - WIDTH * 0.24, cx + WIDTH * 0.24, courseY + courseSize * 0.75, data.colors.primary)
  }

  // Firma: imagen opcional sobre la línea, y debajo nombre y cargo
  const sig = data.signature
  const sigLineY = HEIGHT * 0.745
  const sigHalf = WIDTH * 0.13
  if (sig.image) {
    const img = await loadImage(sig.image.base64)
    ctx.save()
    ctx.globalCompositeOperation = 'multiply' // el fondo blanco de una firma escaneada no tapa el papel
    drawContained(ctx, img, cx, sigLineY - 8, sigHalf * 2, 100)
    ctx.restore()
  }
  line(ctx, cx - sigHalf, cx + sigHalf, sigLineY, ink.soft, 2)
  if (sig.name.trim()) {
    drawFittedText(ctx, sig.name.trim(), {
      x: cx, y: sigLineY + 34, maxWidth: WIDTH * 0.4, maxLines: 1, size: 34, minSize: 22,
      font: (s) => `bold ${s}px "${fonts.sans}"`, color: ink.strong,
    })
  }
  if (sig.role.trim()) {
    drawFittedText(ctx, sig.role.trim(), {
      x: cx, y: sigLineY + 68, maxWidth: WIDTH * 0.4, maxLines: 1, size: 28, minSize: 20,
      font: (s) => `${s}px "${fonts.sans}"`, color: ink.soft,
    })
  }

  // Logo en una de las 5 posiciones estándar, con tamaño limitado a la zona segura
  if (data.logo) {
    const region = LOGO_REGIONS[data.logoPlacement]
    const scale = Math.min(LOGO_SIZE_MAX, Math.max(LOGO_SIZE_MIN, data.logoSize)) / 100
    const logoImg = await loadImage(data.logo.base64)
    const ratio = Math.min((region.w * scale) / data.logo.width, (region.h * scale) / data.logo.height)
    const w = data.logo.width * ratio
    const h = data.logo.height * ratio
    ctx.drawImage(logoImg, align(region.x, region.w, w, region.alignX), align(region.y, region.h, h, region.alignY), w, h)
  }

  // Textos fijos definidos por el usuario (posición normalizada 0–1)
  for (const text of data.fixedTexts) {
    const serif = text.fontFamily === 'serif' || text.fontFamily === 'Fraunces' || text.fontFamily === 'Merriweather'
    const size = Math.round(text.fontSize * (HEIGHT / 1536))
    ctx.font = `${size}px "${serif ? fonts.serif : fonts.sans}"`
    ctx.fillStyle = text.color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text.value, WIDTH * text.position.x, HEIGHT * text.position.y)
  }

  return canvas.toBuffer('image/png')
}

/** Versión liviana (JPEG 1024 px de ancho) para la vista previa: va dentro de la respuesta JSON. */
export async function createPreview(imageBuffer: Buffer): Promise<string> {
  const jpeg = await sharp(imageBuffer).resize({ width: 1024 }).jpeg({ quality: 82 }).toBuffer()
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`
}

export async function enhanceForPrint(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .png({ quality: 95, compressionLevel: 6 })
    .withMetadata({ density: 300 })
    .toBuffer()
}
