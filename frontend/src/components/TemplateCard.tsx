import { Pencil, Trash2, Image as ImageIcon, Check } from 'lucide-react'
import type { Template } from '../types'

interface TemplateCardProps {
  template: Template
  onLoad: (template: Template) => void
  onEdit: (template: Template) => void
  onDelete: (id: string) => void
}

const STYLE_BADGE: Record<string, string> = {
  formal: 'bg-butter-200 text-butter-700',
  moderno: 'bg-sky-200 text-sky-700',
  academico: 'bg-lilac-200 text-lilac-700',
  creativo: 'bg-peach-200 text-peach-700',
}

const ICON_BUTTON =
  'flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-ink-soft shadow-soft transition-colors hover:text-ink focus-visible:opacity-100'

export function TemplateCard({ template, onLoad, onEdit, onDelete }: TemplateCardProps) {
  const date = new Date(template.updatedAt).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="group rounded-2xl border border-line bg-white p-3 shadow-soft transition-shadow hover:shadow-lift">
      <div className="relative mb-3 aspect-[3/4] overflow-hidden rounded-xl bg-lilac-100">
        {template.thumbnail ? (
          <img src={template.thumbnail} alt={template.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lilac-400">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}
        <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
          <button onClick={() => onLoad(template)} className={ICON_BUTTON} title="Usar plantilla" aria-label="Usar plantilla">
            <Check className="h-4 w-4" />
          </button>
          <button onClick={() => onEdit(template)} className={ICON_BUTTON} title="Editar" aria-label="Editar plantilla">
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              if (confirm(`¿Eliminar "${template.name}"?`)) onDelete(template.id)
            }}
            className={`${ICON_BUTTON} hover:!text-rose-700`}
            title="Eliminar"
            aria-label="Eliminar plantilla"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2 px-1 pb-1">
        <h3 className="truncate font-display text-base font-semibold">{template.name}</h3>
        <div className="flex items-center justify-between gap-2">
          {template.data.style ? (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STYLE_BADGE[template.data.style] ?? 'bg-lilac-200 text-lilac-700'}`}>
              {template.data.style}
            </span>
          ) : <span />}
          <span className="text-xs text-ink-muted">{date}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {[template.data.colors.primary, template.data.colors.secondary, template.data.colors.accent].map((c, i) => (
            <span key={i} className="h-4 w-4 rounded-full ring-1 ring-line" style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
    </div>
  )
}
