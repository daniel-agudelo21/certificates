import { Image as ImageIcon } from 'lucide-react'
import { LOGO_REGIONS, LOGO_PLACEMENT_ORDER, LOGO_SIZE_MIN, LOGO_SIZE_MAX, LOGO_SIZE_DEFAULT } from '../services/logoPlacement'
import { PlacedLogo } from './PlacedLogo'
import type { LogoData, LogoPlacement } from '../types'

interface LogoPlacementPickerProps {
  logo: LogoData | null
  placement: LogoPlacement
  size: number
  onPlacementChange: (value: LogoPlacement) => void
  onSizeChange: (value: number) => void
}

/** Hoja en miniatura (4:3) con las 5 zonas posibles del logo y el control de tamaño. */
export function LogoPlacementPicker({ logo, placement, size, onPlacementChange, onSizeChange }: LogoPlacementPickerProps) {
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center">
      <div>
        <p className="label">Posición del logo</p>
        <div
          role="radiogroup"
          aria-label="Posición del logo"
          className="relative mx-auto aspect-[4/3] w-full max-w-sm rounded-2xl border border-line bg-white shadow-soft"
        >
          {LOGO_PLACEMENT_ORDER.map((key) => {
            const r = LOGO_REGIONS[key]
            const selected = placement === key
            // Marcador al tamaño por defecto, alineado dentro de su zona: así las zonas vecinas no se pisan.
            const k = LOGO_SIZE_DEFAULT / 100
            const mw = r.w * k
            const mh = r.h * k
            const mx = r.alignX === 'start' ? r.x : r.alignX === 'end' ? r.x + r.w - mw : r.x + (r.w - mw) / 2
            const my = r.alignY === 'start' ? r.y : r.alignY === 'end' ? r.y + r.h - mh : r.y + (r.h - mh) / 2
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={r.label}
                title={r.label}
                onClick={() => onPlacementChange(key)}
                className={`absolute flex items-center justify-center rounded-xl border-2 transition-colors ${
                  selected ? 'border-lilac-300 bg-lilac-50' : 'border-dashed border-lilac-200 bg-white/60 hover:border-lilac-300 hover:bg-lilac-50'
                }`}
                style={{ left: `${mx * 100}%`, top: `${my * 100}%`, width: `${mw * 100}%`, height: `${mh * 100}%` }}
              >
                {!(selected && logo) && <ImageIcon className={`h-4 w-4 ${selected ? 'text-lilac-500' : 'text-lilac-300'}`} />}
              </button>
            )
          })}
          {logo && <PlacedLogo logo={logo} placement={placement} size={size} />}
        </div>
        <p className="mt-2 text-center text-sm text-ink-muted">{LOGO_REGIONS[placement].label}</p>
      </div>

      <div>
        <label htmlFor="logoSize" className="label">Tamaño del logo <span className="font-normal text-ink-muted">· {size} %</span></label>
        <input
          id="logoSize"
          type="range"
          min={LOGO_SIZE_MIN}
          max={LOGO_SIZE_MAX}
          step={5}
          value={size}
          onChange={(e) => onSizeChange(Number(e.target.value))}
          className="w-full accent-lilac-400"
        />
        <div className="mt-1 flex justify-between text-xs text-ink-muted">
          <span>Más pequeño</span>
          <span>Más grande</span>
        </div>
        <p className="mt-3 text-sm text-ink-muted">
          El tamaño tiene un mínimo y un máximo: el máximo es lo más grande que cabe sin tocar el marco ni los textos.
        </p>
      </div>
    </div>
  )
}
