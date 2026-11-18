import type { ColorScheme } from '../types'

type RGB = [number, number, number]

const toHex = ([r, g, b]: RGB) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
const dist = (a: RGB, b: RGB) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
const mixWithWhite = (c: RGB, t: number): RGB => [c[0] + (255 - c[0]) * t, c[1] + (255 - c[1]) * t, c[2] + (255 - c[2]) * t]

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

function hslToRgb(h: number, s: number, l: number): RGB {
  h = ((h % 360) + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

/**
 * Obtiene una paleta de certificado a partir de los colores dominantes del logo:
 * principal = color más presente, acento = el siguiente color distinto, secundario = tinte muy claro del principal (fondo).
 * Devuelve null si no se pudo leer la imagen.
 */
export function extractPalette(src: string): Promise<ColorScheme | null> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => {
      try {
        const size = 96
        const scale = Math.min(size / img.width, size / img.height, 1) || 1
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return resolve(null)
        ctx.drawImage(img, 0, 0, w, h)
        const { data } = ctx.getImageData(0, 0, w, h)

        // Agrupa en cubos de 4 bits por canal, ignorando transparentes y casi blancos.
        const buckets = new Map<number, { n: number; sum: RGB }>()
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue
          const rgb: RGB = [data[i], data[i + 1], data[i + 2]]
          if (rgb[0] > 240 && rgb[1] > 240 && rgb[2] > 240) continue
          const key = ((rgb[0] >> 4) << 8) | ((rgb[1] >> 4) << 4) | (rgb[2] >> 4)
          const b = buckets.get(key) ?? { n: 0, sum: [0, 0, 0] as RGB }
          b.n++
          b.sum = [b.sum[0] + rgb[0], b.sum[1] + rgb[1], b.sum[2] + rgb[2]]
          buckets.set(key, b)
        }

        const colors = [...buckets.values()]
          .map((b) => {
            const rgb: RGB = [b.sum[0] / b.n, b.sum[1] / b.n, b.sum[2] / b.n]
            const [, s, l] = rgbToHsl(rgb)
            // Se prefieren colores con carácter (saturados y ni muy oscuros ni muy claros).
            const score = b.n * (0.35 + s) * (l > 0.12 && l < 0.92 ? 1 : 0.4)
            return { rgb, score, s }
          })
          .sort((a, b) => b.score - a.score)

        if (colors.length === 0) return resolve(null)

        const primary = colors[0].rgb
        const second = colors.find((c) => dist(c.rgb, primary) > 90 && c.s > 0.15)?.rgb
        let accent = second
        if (!accent) {
          // Logo de un solo color: el acento es un tono vecino, más claro.
          const [h, s, l] = rgbToHsl(primary)
          accent = s < 0.12 ? hslToRgb(h, 0, 0.62) : hslToRgb(h + 35, Math.max(0.35, s * 0.8), Math.min(0.72, Math.max(l, 0.6)))
        }

        resolve({ primary: toHex(primary), secondary: toHex(mixWithWhite(primary, 0.92)), accent: toHex(accent) })
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}
