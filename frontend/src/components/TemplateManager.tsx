import { useState } from 'react'
import { X, Plus, Save, FolderOpen } from 'lucide-react'
import { TemplateCard } from './TemplateCard'
import type { Template } from '../types'

interface TemplateManagerProps {
  templates: Template[]
  onLoad: (template: Template) => void
  onSave: (name: string) => Promise<unknown>
  onDelete: (id: string) => Promise<unknown>
  isOpen: boolean
  onClose: () => void
}

export function TemplateManager({ templates, onLoad, onSave, onDelete, isOpen, onClose }: TemplateManagerProps) {
  const [showSave, setShowSave] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!saveName.trim() || saving) return
    setSaving(true)
    try {
      await onSave(saveName.trim())
      setShowSave(false)
      setSaveName('')
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No se pudo guardar la plantilla')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="templates-title"
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-card border border-line bg-white shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line p-5 md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lilac-200 text-lilac-700">
              <FolderOpen className="h-5 w-5" />
            </div>
            <h2 id="templates-title" className="text-xl font-semibold">Plantillas guardadas</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSave(true)} className="btn btn-secondary">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Guardar actual</span>
            </button>
            <button onClick={onClose} className="btn btn-ghost p-2" aria-label="Cerrar">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 md:p-6">
          {templates.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-lilac-100 text-lilac-700">
                <FolderOpen className="h-6 w-6" />
              </div>
              <p className="font-display text-lg font-semibold">Aún no hay plantillas</p>
              <p className="mt-1 text-sm text-ink-muted">Configura un certificado y usa «Guardar actual» para reutilizarlo.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onLoad={onLoad}
                  onEdit={() => {}}
                  onDelete={(id) => { onDelete(id).catch(() => alert('No se pudo eliminar la plantilla')) }}
                />
              ))}
            </div>
          )}
        </div>

        {showSave && (
          <div className="rounded-b-card border-t border-line bg-lilac-50 p-5 md:p-6">
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <label htmlFor="template-name" className="sr-only">Nombre de la plantilla</label>
              <input
                id="template-name"
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Nombre de la plantilla"
                className="input"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
              <button onClick={handleSave} disabled={saving || !saveName.trim()} className="btn btn-primary">
                <Save className="h-4 w-4" />
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
              <button onClick={() => { setShowSave(false); setSaveName('') }} className="btn btn-ghost" disabled={saving}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
