import { useState, useEffect, useCallback } from 'react'
import { getTemplates, saveTemplate, updateTemplate, deleteTemplate } from '../services/templates'
import type { Template } from '../types'

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTemplates()
      setTemplates(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar plantillas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  const create = async (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>) => {
    setError(null)
    try {
      const saved = await saveTemplate(template)
      setTemplates(prev => [saved, ...prev])
      return saved
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar plantilla')
      throw err
    }
  }

  const update = async (id: string, data: Partial<Template>) => {
    setError(null)
    try {
      const updated = await updateTemplate(id, data)
      setTemplates(prev => prev.map(t => t.id === id ? updated : t))
      return updated
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar plantilla')
      throw err
    }
  }

  const remove = async (id: string) => {
    setError(null)
    try {
      await deleteTemplate(id)
      setTemplates(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar plantilla')
      throw err
    }
  }

  return { templates, loading, error, loadTemplates, create, update, remove }
}