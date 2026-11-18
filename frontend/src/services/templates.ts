import type { Template } from '../types'

/**
 * Plantillas guardadas en el navegador (localStorage): no hay servidor ni base de datos.
 * Cada persona ve solo las suyas, y se pierden si borra los datos del navegador.
 */
const KEY = 'certificados-ia:plantillas:v1'

function read(): Template[] {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function write(list: Template[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // Casi siempre es QuotaExceededError: el logo y la firma se guardan como imagen dentro de la plantilla.
    throw new Error('No hay espacio en el navegador para guardar la plantilla. Prueba con un logo o una firma más livianos.')
  }
}

export async function getTemplates(): Promise<Template[]> {
  return read().sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function saveTemplate(template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): Promise<Template> {
  const now = Date.now()
  const saved: Template = { ...template, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
  write([saved, ...read()])
  return saved
}

export async function updateTemplate(id: string, data: Partial<Template>): Promise<Template> {
  const list = read()
  const index = list.findIndex((t) => t.id === id)
  if (index === -1) throw new Error('La plantilla ya no existe')
  const updated: Template = { ...list[index], ...data, id, updatedAt: Date.now() }
  list[index] = updated
  write(list)
  return updated
}

export async function deleteTemplate(id: string): Promise<void> {
  write(read().filter((t) => t.id !== id))
}
