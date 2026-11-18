import type { CertificateData, CertificateStyle } from '../models/schemas.js'

export const WIDTH = 2048
export const HEIGHT = 1536

// ---------- Utilidades de color ----------

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
}

/** Mezcla `hex` con `target` (0 = hex, 1 = target). */
export function mix(hex: string, target: string, t: number): string {
  const a = hexToRgb(hex)
  const b = hexToRgb(target)
  return rgbToHex([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t])
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

/** Colores de texto que siempre se leen sobre el fondo secundario. */
export function textPalette(colors: CertificateData['colors']) {
  const darkBg = luminance(colors.secondary) < 0.5
  return darkBg
    ? { strong: '#FFFFFF', soft: mix(colors.secondary, '#FFFFFF', 0.75), heading: mix(colors.primary, '#FFFFFF', 0.55) }
    : { strong: '#2F2D45', soft: '#5E5B7A', heading: mix(colors.primary, '#000000', 0.6) }
}

// ---------- Aleatoriedad reproducible ----------

export type Rng = () => number

/** mulberry32: la misma semilla da siempre la misma secuencia, así la vista previa y la descarga coinciden. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Semilla propia de cada estilo a partir de la semilla de la generación. */
export function seedFor(seed: number, style: string): number {
  let h = seed >>> 0
  for (const ch of style) h = Math.imul(h ^ ch.charCodeAt(0), 2654435761) >>> 0
  return h
}

const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)]
const between = (rng: Rng, a: number, b: number) => a + rng() * (b - a)
const n1 = (n: number) => n.toFixed(1)

// ---------- Piezas reutilizables ----------

const CORNERS = [
  { x: 0, y: 0, sx: 1, sy: 1 },
  { x: WIDTH, y: 0, sx: -1, sy: 1 },
  { x: 0, y: HEIGHT, sx: 1, sy: -1 },
  { x: WIDTH, y: HEIGHT, sx: -1, sy: -1 },
]

/** Repite `inner` en las cuatro esquinas, con el origen en la esquina interior del marco. */
function corners(inset: number, inner: string): string {
  return CORNERS.map(
    (c) => `<g transform="translate(${c.x + c.sx * inset} ${c.y + c.sy * inset}) scale(${c.sx} ${c.sy})">${inner}</g>`
  ).join('')
}

type SealInner = 'star' | 'ring' | 'diamond'

function seal(cx: number, cy: number, ribbon: string, accent: string, bg: string, teeth: number, inner: SealInner, scale = 0.5, ribbons = true, opacity = 1): string {
  const points: string[] = []
  for (let i = 0; i < teeth * 2; i++) {
    const r = i % 2 === 0 ? 118 : 104
    const a = (Math.PI * i) / teeth
    points.push(`${n1(cx + r * Math.cos(a))},${n1(cy + r * Math.sin(a))}`)
  }
  let center: string
  if (inner === 'star') {
    const star: string[] = []
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 46 : 20
      const a = (Math.PI * i) / 5 - Math.PI / 2
      star.push(`${n1(cx + r * Math.cos(a))},${n1(cy + r * Math.sin(a))}`)
    }
    center = `<polygon points="${star.join(' ')}" fill="${bg}"/>`
  } else if (inner === 'ring') {
    center = `<circle cx="${cx}" cy="${cy}" r="50" fill="none" stroke="${bg}" stroke-width="8"/><circle cx="${cx}" cy="${cy}" r="22" fill="${bg}"/>`
  } else {
    center = `<rect x="${cx - 34}" y="${cy - 34}" width="68" height="68" fill="${bg}" transform="rotate(45 ${cx} ${cy})"/>`
  }
  return `
    <g transform="translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})" opacity="${n1(opacity)}">
    ${
      ribbons
        ? `<polygon points="${cx - 70},${cy + 80} ${cx - 118},${cy + 230} ${cx - 70},${cy + 200} ${cx - 30},${cy + 236} ${cx - 20},${cy + 90}" fill="${ribbon}"/>
    <polygon points="${cx + 70},${cy + 80} ${cx + 118},${cy + 230} ${cx + 70},${cy + 200} ${cx + 30},${cy + 236} ${cx + 20},${cy + 90}" fill="${ribbon}" opacity="0.85"/>`
        : ''
    }
    <polygon points="${points.join(' ')}" fill="${accent}"/>
    <circle cx="${cx}" cy="${cy}" r="86" fill="none" stroke="${bg}" stroke-width="3" stroke-dasharray="4 9" stroke-linecap="round"/>
    ${center}
    </g>`
}

/** Entorno que algunas plantillas necesitan para no chocar con el logo. */
type Env = { avoidSide: 'left' | 'right' | null }

/**
 * Decide tamaño y lugar de la medalla según la semilla. Siempre en una zona libre:
 *  - side: chica, en el costado a media altura.
 *  - signature: mediana, al lado de la firma.
 *  - corner: grande, en una esquina inferior.
 *  - giant: enorme y muy tenue, de emblema de fondo en el centro (sin listones).
 *  - bleed: enorme y tenue, saliéndose por una esquina inferior (sin listones).
 * Las de abajo se ponen del lado contrario al logo cuando este va en una esquina inferior.
 * `behind` se dibuja debajo del marco y los textos; `front` encima del fondo.
 */
function placeSeal(
  rng: Rng,
  o: { ribbon: string; accent: string; bg: string; teeth: number; inner: SealInner },
  env: Env
): { behind: string; front: string } {
  const roll = rng()
  const kind = roll < 0.25 ? 'side' : roll < 0.5 ? 'signature' : roll < 0.7 ? 'corner' : roll < 0.85 ? 'giant' : 'bleed'
  const side: 'left' | 'right' = env.avoidSide === 'right' ? 'left' : env.avoidSide === 'left' ? 'right' : rng() < 0.5 ? 'left' : 'right'
  const fromSide = (d: number) => (side === 'right' ? WIDTH - d : d)
  const draw = (cx: number, cy: number, scale: number, ribbons: boolean, opacity: number) =>
    seal(cx, cy, o.ribbon, o.accent, o.bg, o.teeth, o.inner, scale, ribbons, opacity)

  switch (kind) {
    case 'side':
      return { behind: '', front: draw(fromSide(266), HEIGHT * 0.62, between(rng, 0.45, 0.6), true, 1) }
    case 'signature':
      return { behind: '', front: draw(fromSide(488), 1155, between(rng, 0.6, 0.75), true, 1) }
    case 'corner':
      return { behind: '', front: draw(fromSide(430), 1125, between(rng, 0.9, 1.15), true, 1) }
    case 'giant':
      return { behind: draw(WIDTH / 2, between(rng, 640, 760), between(rng, 2.8, 3.6), false, between(rng, 0.1, 0.15)), front: '' }
    default:
      return { behind: draw(fromSide(between(rng, 80, 220)), HEIGHT - between(rng, 60, 180), between(rng, 2.3, 3.0), false, between(rng, 0.16, 0.24)), front: '' }
  }
}

/** Trama muy tenue sobre todo el fondo (queda debajo de los textos). */
function patternFill(kind: 'none' | 'dots' | 'diagonal', color: string): string {
  if (kind === 'dots') {
    return `<defs><pattern id="pat" width="36" height="36" patternUnits="userSpaceOnUse"><circle cx="18" cy="18" r="2.4" fill="${color}" opacity="0.2"/></pattern></defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#pat)"/>`
  }
  if (kind === 'diagonal') {
    return `<defs><pattern id="pat" width="30" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="30" height="2" fill="${color}" opacity="0.16"/></pattern></defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#pat)"/>`
  }
  return ''
}

// ---------- Plantillas por estilo ----------
// Cada plantilla tiene varias versiones de marco, esquinas, trama y adornos; `rng` decide cuál sale.
// Los adornos quedan en los márgenes y esquinas (≤ 274 px): el centro, la firma y las zonas del logo no se tocan.

type Colors = CertificateData['colors']

function formal({ primary, secondary, accent }: Colors, rng: Rng, env: Env): string {
  const dark = mix(primary, '#000000', 0.25)
  const border = pick(rng, [10, 14, 18, 22])
  const accentInset = pick(rng, [96, 104, 112])
  const vignette = pick(rng, [0.1, 0.2, 0.3])
  const pattern = pick(rng, ['none', 'dots', 'diagonal'] as const)
  const corner = pick(rng, ['arcs', 'brackets', 'fleur', 'steps'] as const)
  const ribbon = pick(rng, [primary, dark])
  const inner = pick(rng, ['star', 'ring', 'diamond'] as const)
  const teeth = pick(rng, [20, 28, 36])
  const medal = placeSeal(rng, { ribbon, accent, bg: secondary, teeth, inner }, env)

  const motif = {
    arcs: `<path d="M0 190 A190 190 0 0 0 190 0" fill="none" stroke="${dark}" stroke-width="3"/>
           <path d="M0 140 A140 140 0 0 0 140 0" fill="none" stroke="${accent}" stroke-width="2"/>
           <circle cx="30" cy="30" r="11" fill="${accent}"/>`,
    brackets: `<path d="M0 170 V0 H170" fill="none" stroke="${dark}" stroke-width="4"/>
               <path d="M0 130 V0 H130" fill="none" stroke="${accent}" stroke-width="2"/>
               <rect x="24" y="24" width="24" height="24" fill="${accent}" transform="rotate(45 36 36)"/>`,
    fleur: `<path d="M0 0 H190 A190 190 0 0 1 0 190 Z" fill="${primary}" opacity="0.14"/>
            <path d="M0 190 A190 190 0 0 0 190 0" fill="none" stroke="${dark}" stroke-width="3"/>
            <circle cx="56" cy="56" r="9" fill="${accent}"/><circle cx="104" cy="36" r="6" fill="${accent}"/><circle cx="36" cy="104" r="6" fill="${accent}"/>`,
    steps: `<path d="M0 0 H170 V26 H26 V170 H0 Z" fill="${primary}"/>
            <path d="M42 42 H128 V54 H54 V128 H42 Z" fill="${accent}"/>`,
  }[corner]

  return `
    <defs><radialGradient id="vignette" cx="50%" cy="50%" r="75%">
      <stop offset="60%" stop-color="${primary}" stop-opacity="0"/><stop offset="100%" stop-color="${primary}" stop-opacity="${vignette}"/>
    </radialGradient></defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="${secondary}"/>
    ${patternFill(pattern, primary)}
    ${medal.behind}
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#vignette)"/>
    <rect x="48" y="48" width="${WIDTH - 96}" height="${HEIGHT - 96}" fill="none" stroke="${primary}" stroke-width="${border}"/>
    <rect x="84" y="84" width="${WIDTH - 168}" height="${HEIGHT - 168}" fill="none" stroke="${dark}" stroke-width="3"/>
    <rect x="${accentInset}" y="${accentInset}" width="${WIDTH - accentInset * 2}" height="${HEIGHT - accentInset * 2}" fill="none" stroke="${accent}" stroke-width="2"/>
    ${corners(84, motif)}
    ${medal.front}`
}

function moderno({ primary, secondary, accent }: Colors, rng: Rng): string {
  const dark = mix(primary, '#000000', 0.45)
  const [p, a] = rng() < 0.35 ? [accent, primary] : [primary, accent]
  const layout = pick(rng, ['circles', 'diagonal', 'bar', 'dots'] as const)
  // La barra lateral ocupa el borde izquierdo: con ella no se dibuja marco.
  const frame = layout === 'bar' ? 'none' : pick(rng, ['line', 'brackets', 'none'] as const)

  let art = ''
  if (layout === 'circles') {
    art = `
      <circle cx="0" cy="0" r="${n1(between(rng, 380, 520))}" fill="${p}" opacity="${n1(between(rng, 0.3, 0.45))}"/>
      <circle cx="${WIDTH}" cy="${HEIGHT}" r="${n1(between(rng, 440, 560))}" fill="${a}" opacity="${n1(between(rng, 0.25, 0.38))}"/>
      <circle cx="${WIDTH}" cy="${n1(between(rng, 100, 200))}" r="${n1(between(rng, 140, 240))}" fill="${p}" opacity="${n1(between(rng, 0.16, 0.26))}"/>
      <circle cx="${n1(between(rng, 100, 200))}" cy="${HEIGHT - 120}" r="${n1(between(rng, 110, 190))}" fill="${a}" opacity="${n1(between(rng, 0.16, 0.24))}"/>`
  } else if (layout === 'diagonal') {
    const w1 = between(rng, 480, 620)
    const w2 = between(rng, 520, 680)
    art = `
      <polygon points="0,0 ${n1(w1)},0 0,${n1(w1 * 0.75)}" fill="${p}" opacity="0.34"/>
      <line x1="0" y1="${n1(w1 * 0.75 + 46)}" x2="${n1(w1 + 62)}" y2="0" stroke="${p}" stroke-width="6" opacity="0.4"/>
      <polygon points="${WIDTH},${HEIGHT} ${n1(WIDTH - w2)},${HEIGHT} ${WIDTH},${n1(HEIGHT - w2 * 0.75)}" fill="${a}" opacity="0.3"/>
      <line x1="${WIDTH}" y1="${n1(HEIGHT - w2 * 0.75 - 46)}" x2="${n1(WIDTH - w2 - 62)}" y2="${HEIGHT}" stroke="${a}" stroke-width="6" opacity="0.4"/>`
  } else if (layout === 'bar') {
    const bar = between(rng, 70, 110)
    art = `
      <rect x="0" y="0" width="${n1(bar)}" height="${HEIGHT}" fill="${p}" opacity="0.88"/>
      <rect x="${n1(bar + 18)}" y="0" width="8" height="${HEIGHT}" fill="${a}" opacity="0.9"/>
      <circle cx="${WIDTH}" cy="${HEIGHT}" r="${n1(between(rng, 380, 480))}" fill="${a}" opacity="0.26"/>`
  } else {
    const dots: string[] = []
    for (let r = 0; r < 6; r++) for (let c = 0; c < 5; c++) {
      dots.push(`<circle cx="${110 + c * 32}" cy="${110 + r * 32}" r="6" fill="${p}" opacity="0.5"/>`)
      dots.push(`<circle cx="${WIDTH - 110 - c * 32}" cy="${HEIGHT - 110 - r * 32}" r="6" fill="${a}" opacity="0.5"/>`)
    }
    art = `${dots.join('')}<circle cx="${WIDTH}" cy="${n1(between(rng, 90, 190))}" r="${n1(between(rng, 180, 260))}" fill="${a}" opacity="0.2"/>`
  }

  const frameArt =
    frame === 'line'
      ? `<rect x="90" y="90" width="${WIDTH - 180}" height="${HEIGHT - 180}" fill="none" stroke="${dark}" stroke-width="2" opacity="0.55"/>`
      : frame === 'brackets'
        ? corners(96, `<path d="M0 120 V0 H120" fill="none" stroke="${dark}" stroke-width="6" opacity="0.6"/>`)
        : ''

  return `
    <rect width="${WIDTH}" height="${HEIGHT}" fill="${secondary}"/>
    ${art}
    ${frameArt}`
}

function academico({ primary, secondary, accent }: Colors, rng: Rng, env: Env): string {
  const dark = mix(primary, '#000000', 0.35)
  const frames = pick(rng, ['triple', 'thick', 'ruled'] as const)
  const corner = pick(rng, ['blocks', 'notched', 'circles', 'crest'] as const)
  const ribbon = pick(rng, [primary, dark])
  const inner = pick(rng, ['star', 'ring', 'diamond'] as const)
  const teeth = pick(rng, [20, 28, 36])
  const medal = placeSeal(rng, { ribbon, accent, bg: secondary, teeth, inner }, env)

  const frameArt = {
    triple: `<rect x="40" y="40" width="${WIDTH - 80}" height="${HEIGHT - 80}" fill="none" stroke="${dark}" stroke-width="8"/>
             <rect x="64" y="64" width="${WIDTH - 128}" height="${HEIGHT - 128}" fill="none" stroke="${dark}" stroke-width="2"/>
             <rect x="80" y="80" width="${WIDTH - 160}" height="${HEIGHT - 160}" fill="none" stroke="${accent}" stroke-width="3"/>`,
    thick: `<rect x="46" y="46" width="${WIDTH - 92}" height="${HEIGHT - 92}" fill="none" stroke="${dark}" stroke-width="18"/>
            <rect x="80" y="80" width="${WIDTH - 160}" height="${HEIGHT - 160}" fill="none" stroke="${accent}" stroke-width="3"/>`,
    ruled: `<rect x="40" y="40" width="${WIDTH - 80}" height="${HEIGHT - 80}" fill="none" stroke="${dark}" stroke-width="4"/>
            <rect x="56" y="56" width="${WIDTH - 112}" height="${HEIGHT - 112}" fill="none" stroke="${accent}" stroke-width="2"/>
            <rect x="68" y="68" width="${WIDTH - 136}" height="${HEIGHT - 136}" fill="none" stroke="${dark}" stroke-width="2"/>
            <rect x="80" y="80" width="${WIDTH - 160}" height="${HEIGHT - 160}" fill="none" stroke="${accent}" stroke-width="3"/>`,
  }[frames]

  const motif = {
    blocks: `<rect x="0" y="0" width="110" height="110" fill="${primary}"/>
             <rect x="16" y="16" width="78" height="78" fill="none" stroke="${secondary}" stroke-width="3"/>
             <circle cx="55" cy="55" r="14" fill="${accent}"/>`,
    notched: `<polygon points="0,0 120,0 120,72 72,120 0,120" fill="${primary}"/>
              <polygon points="18,18 102,18 102,66 66,102 18,102" fill="none" stroke="${secondary}" stroke-width="3"/>
              <circle cx="50" cy="50" r="12" fill="${accent}"/>`,
    circles: `<circle cx="64" cy="64" r="70" fill="${primary}"/>
              <circle cx="64" cy="64" r="48" fill="none" stroke="${secondary}" stroke-width="3"/>
              <circle cx="64" cy="64" r="14" fill="${accent}"/>`,
    crest: `<path d="M0 0 H140 L0 140 Z" fill="${primary}"/>
            <path d="M0 0 H72 L0 72 Z" fill="${accent}"/>`,
  }[corner]

  return `
    <rect width="${WIDTH}" height="${HEIGHT}" fill="${secondary}"/>
    ${medal.behind}
    ${frameArt}
    ${corners(80, motif)}
    ${medal.front}`
}

function creativo({ primary, secondary, accent }: Colors, rng: Rng): string {
  const dark = mix(primary, '#000000', 0.3)
  const [p, a] = rng() < 0.4 ? [accent, primary] : [primary, accent]
  const blur = Math.round(between(rng, 55, 90))
  const border = pick(rng, ['dotted', 'dashed', 'double', 'none'] as const)

  // Manchas en los bordes de la hoja (el centro queda limpio para el texto).
  const anchors = [[0.1, 0.15], [0.9, 0.2], [0.88, 0.88], [0.12, 0.9], [0.5, 0.0], [0.5, 1.0], [0.0, 0.5], [1.0, 0.55]]
  for (let i = anchors.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[anchors[i], anchors[j]] = [anchors[j], anchors[i]]
  }
  const blobs = anchors.slice(0, 4 + Math.floor(rng() * 3)).map(([x, y], i) =>
    `<ellipse cx="${n1(x * WIDTH + between(rng, -60, 60))}" cy="${n1(y * HEIGHT + between(rng, -60, 60))}" rx="${n1(between(rng, 260, 560))}" ry="${n1(between(rng, 200, 420))}" fill="${i % 2 ? a : p}" opacity="${n1(between(rng, 0.35, 0.6))}"/>`
  )

  const borderArt = {
    dotted: `<rect x="72" y="72" width="${WIDTH - 144}" height="${HEIGHT - 144}" rx="36" fill="none" stroke="${dark}" stroke-width="8" stroke-dasharray="1 20" stroke-linecap="round" opacity="0.7"/>`,
    dashed: `<rect x="72" y="72" width="${WIDTH - 144}" height="${HEIGHT - 144}" rx="36" fill="none" stroke="${dark}" stroke-width="4" stroke-dasharray="26 18" opacity="0.6"/>`,
    double: `<rect x="70" y="70" width="${WIDTH - 140}" height="${HEIGHT - 140}" rx="40" fill="none" stroke="${dark}" stroke-width="3" opacity="0.6"/>
             <rect x="90" y="90" width="${WIDTH - 180}" height="${HEIGHT - 180}" rx="28" fill="none" stroke="${dark}" stroke-width="2" opacity="0.4"/>`,
    none: '',
  }[border]

  // Confeti en las bandas laterales (no toca las zonas del logo ni los textos).
  const confetti: string[] = []
  const count = 10 + Math.floor(rng() * 13)
  for (let i = 0; i < count; i++) {
    const x = rng() < 0.5 ? between(rng, 110, 250) : between(rng, 1800, 1940)
    const y = between(rng, 130, 1410)
    const size = between(rng, 5, 11)
    const color = rng() < 0.5 ? p : a
    const op = n1(between(rng, 0.55, 0.8))
    confetti.push(
      rng() < 0.5
        ? `<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(size)}" fill="${color}" opacity="${op}"/>`
        : `<rect x="${n1(x - size)}" y="${n1(y - size)}" width="${n1(size * 2)}" height="${n1(size * 2)}" fill="${color}" opacity="${op}" transform="rotate(45 ${n1(x)} ${n1(y)})"/>`
    )
  }

  return `
    <defs><filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${blur}"/></filter></defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="${secondary}"/>
    <g filter="url(#soft)">${blobs.join('')}</g>
    ${borderArt}
    ${confetti.join('')}`
}

const TEMPLATES: Record<CertificateStyle, (c: Colors, rng: Rng, env: Env) => string> = {
  formal,
  moderno,
  academico,
  creativo,
}

/**
 * Devuelve el fondo del certificado como SVG (2048×1536, horizontal 4:3).
 * `seed` elige entre las versiones de cada estilo: la misma semilla produce siempre el mismo fondo.
 */
export function buildBackgroundSvg(data: CertificateData, style: CertificateStyle, seed: number): string {
  const rng = createRng(seedFor(seed, style))
  // Con el logo en una esquina inferior, la medalla de abajo se pone del lado contrario.
  const place = data.logo ? data.logoPlacement : null
  const env: Env = { avoidSide: place === 'bottom-left' ? 'left' : place === 'bottom-right' ? 'right' : null }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  ${TEMPLATES[style](data.colors, rng, env)}
</svg>`
}
