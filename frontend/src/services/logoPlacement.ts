import type { LogoPlacement } from '../types'

/** Hoja del certificado en píxeles; las zonas se expresan en esta escala y se convierten a %. */
const W = 2048
const H = 1536

export const LOGO_SIZE_MIN = 50
export const LOGO_SIZE_MAX = 120
export const LOGO_SIZE_DEFAULT = 85

type Align = 'start' | 'center' | 'end'

/**
 * Zonas máximas seguras del logo (dentro del marco, sin tocar adornos ni textos). El logo ocupa entre
 * LOGO_SIZE_MIN % y LOGO_SIZE_MAX % de su zona. Debe coincidir con LOGO_REGIONS de
 * api/src/services/overlay-engine.ts.
 */
const px = (x: number, y: number, w: number, h: number, alignX: Align, alignY: Align, label: string) => ({
  x: x / W, y: y / H, w: w / W, h: h / H, alignX, alignY, label,
})

export const LOGO_REGIONS: Record<LogoPlacement, ReturnType<typeof px>> = {
  top: px(624, 110, 800, 290, 'center', 'center', 'Arriba, centrado'),
  'top-left': px(300, 118, 410, 261, 'start', 'start', 'Arriba a la izquierda'),
  'top-right': px(1338, 118, 410, 261, 'end', 'start', 'Arriba a la derecha'),
  'bottom-left': px(300, 1144, 410, 261, 'start', 'end', 'Abajo a la izquierda'),
  'bottom-right': px(1338, 1144, 410, 261, 'end', 'end', 'Abajo a la derecha'),
}

export const LOGO_PLACEMENT_ORDER: LogoPlacement[] = ['top-left', 'top', 'top-right', 'bottom-left', 'bottom-right']

const FLEX: Record<Align, string> = { start: 'flex-start', center: 'center', end: 'flex-end' }
export const flexAlign = (a: Align) => FLEX[a]
