import { LOGO_REGIONS, flexAlign } from '../services/logoPlacement'
import type { LogoData, LogoPlacement } from '../types'

/** Dibuja el logo dentro de su zona segura, igual que el render final (el padre debe ser `relative`). */
export function PlacedLogo({ logo, placement, size }: { logo: LogoData; placement: LogoPlacement; size: number }) {
  const r = LOGO_REGIONS[placement]
  return (
    <div
      className="pointer-events-none absolute flex"
      style={{
        left: `${r.x * 100}%`,
        top: `${r.y * 100}%`,
        width: `${r.w * 100}%`,
        height: `${r.h * 100}%`,
        justifyContent: flexAlign(r.alignX),
        alignItems: flexAlign(r.alignY),
      }}
    >
      <img src={logo.base64} alt="" className="object-contain" style={{ maxWidth: `${size}%`, maxHeight: `${size}%` }} />
    </div>
  )
}
