import { useState, useEffect } from 'react'
import { Download, XCircle } from 'lucide-react'
import { STYLE_LABELS } from '../services/styles'
import { PlacedLogo } from './PlacedLogo'
import type { GenerateResponse, CertificateData, CertificateStyle } from '../types'

interface CertificatePreviewProps {
  result: GenerateResponse | null
  data: CertificateData
  loading: boolean
  progress: string
  /** El formulario cambió después de generar: la imagen mostrada ya no coincide. */
  outdated: boolean
  onDownload: (type: 'png' | 'pdf', style: CertificateStyle) => void | Promise<void>
}

// Elige tinta oscura o clara según el fondo para que el borrador siempre se lea.
function readableInk(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const luminance = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return luminance > 0.6 ? '#38364F' : '#FFFFFF'
}

function Draft({ data, loading }: { data: CertificateData; loading: boolean }) {
  const ink = readableInk(data.colors.secondary)
  return (
    <div
      className={`paper ${loading ? 'animate-breathe' : ''}`}
      style={{ backgroundColor: data.colors.secondary, color: ink }}
      aria-label="Borrador del certificado"
    >
      <div className="absolute inset-2 rounded-sm border-[5px]" style={{ borderColor: data.colors.primary }} />
      <div className="absolute inset-[1.1rem] rounded-sm border" style={{ borderColor: data.colors.accent }} />

      {data.logo && <PlacedLogo logo={data.logo} placement={data.logoPlacement} size={data.logoSize} />}

      <p className="absolute inset-x-0 top-[31%] -translate-y-1/2 text-center truncate px-[10%] font-display text-[11px] font-bold sm:text-xs">{data.openingPhrase.trim()}</p>
      <span className="absolute left-1/2 top-[43.4%] h-px w-[47%] -translate-x-1/2" style={{ backgroundColor: data.colors.primary }} />
      <p className="absolute inset-x-0 top-[50%] -translate-y-1/2 truncate px-[10%] text-center text-[10px] opacity-70">{data.coursePhrase.trim()}</p>
      <p className="absolute inset-x-[14%] top-[57.5%] -translate-y-1/2 truncate text-center font-display text-xs font-bold sm:text-sm">
        {data.courseName.trim()}
      </p>
      <span className="absolute left-1/2 top-[60.2%] h-px w-[47%] -translate-x-1/2" style={{ backgroundColor: data.colors.primary }} />

      {data.signature.image && (
        <img
          src={data.signature.image.base64}
          alt=""
          className="absolute left-1/2 max-h-[6.5%] max-w-[26%] -translate-x-1/2 object-contain mix-blend-multiply"
          style={{ bottom: '26%' }}
        />
      )}
      <span className="absolute left-1/2 top-[74.5%] h-px w-[26%] -translate-x-1/2 opacity-60" style={{ backgroundColor: 'currentColor' }} />
      <p className="absolute inset-x-0 top-[76.7%] -translate-y-1/2 truncate text-center text-[9px] font-semibold">{data.signature.name}</p>
      <p className="absolute inset-x-0 top-[79.1%] -translate-y-1/2 truncate text-center text-[8px] opacity-70">{data.signature.role}</p>
    </div>
  )
}

export function CertificatePreview({ result, data, loading, progress, outdated, onDownload }: CertificatePreviewProps) {
  const variants = result?.variants ?? []
  const [downloading, setDownloading] = useState(false)
  const [selected, setSelected] = useState<CertificateStyle | null>(null)
  // Cada generación nueva vuelve a mostrar el primer estilo.
  useEffect(() => setSelected(null), [result?.certificateId])

  const current = variants.find((v) => v.style === selected) ?? variants[0]
  const url = current?.previewUrl

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Vista previa</h2>
        {outdated ? (
          <span className="rounded-full bg-butter-200 px-3 py-0.5 text-xs font-semibold text-butter-700">Cambios sin generar</span>
        ) : variants.length > 0 ? (
          <span className="text-sm text-ink-muted">Elige tu estilo favorito</span>
        ) : null}
      </div>

      {result?.error ? (
        <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-100 p-8 text-center text-rose-700">
          <XCircle className="mb-3 h-10 w-10" />
          <p className="font-semibold">No se pudo generar</p>
          <p className="mt-1 text-sm">{result.error}</p>
        </div>
      ) : url ? (
        <img src={url} alt={`Certificado, estilo ${STYLE_LABELS[current.style]}`} className="w-full rounded-xl object-contain shadow-lift" />
      ) : (
        <Draft data={data} loading={loading} />
      )}

      {variants.length > 1 && (
        <div role="radiogroup" aria-label="Estilo del certificado" className="mt-4 grid grid-cols-4 gap-2">
          {variants.map((v) => {
            const active = v.style === current.style
            return (
              <button
                key={v.style}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelected(v.style)}
                className={`overflow-hidden rounded-lg border-2 text-center transition-colors ${active ? 'border-lilac-400 bg-lilac-100' : 'border-line bg-white hover:border-lilac-200'}`}
              >
                <img src={v.previewUrl} alt="" className="aspect-[4/3] w-full object-cover" />
                <span className={`block px-1 py-1 text-xs ${active ? 'font-semibold text-lilac-700' : 'text-ink-soft'}`}>{STYLE_LABELS[v.style]}</span>
              </button>
            )
          })}
        </div>
      )}

      {url ? (
        <>
          {outdated && <p className="mt-3 rounded-xl bg-butter-100 p-3 text-center text-sm text-butter-700">Cambiaste algo después de generar. Pulsa «Generar certificado» para ver el resultado actualizado.</p>}
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              disabled={downloading}
              onClick={async () => {
                setDownloading(true)
                try {
                  await onDownload('png', current.style)
                } finally {
                  setDownloading(false)
                }
              }}
              className="btn btn-primary flex-1"
            >
              <Download className="h-4 w-4" />
              {downloading ? 'Preparando…' : 'PNG'}
            </button>
            <button type="button" onClick={() => onDownload('pdf', current.style)} className="btn btn-secondary flex-1">
              <Download className="h-4 w-4" />
              PDF
            </button>
          </div>
          <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Estilo</dt>
              <dd className="text-ink-soft">{STYLE_LABELS[current.style]}</dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="mt-4 text-center text-sm text-ink-muted">
          {loading
            ? progress || 'Generando los 4 estilos…'
            : 'Borrador con tus colores. Al pulsar «Generar certificado» verás el resultado en 4 estilos para elegir.'}
        </p>
      )}
    </div>
  )
}
