import { Request, Response } from 'express'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { TemplateSchema } from './models/schemas.js'

if (getApps().length === 0) {
  initializeApp()
}
const db = getFirestore()

const TEMPLATES_COLLECTION = 'templates'

export default async function handler(req: Request, res: Response) {
  try {
    const templatesRef = db.collection(TEMPLATES_COLLECTION)

    if (req.method === 'GET') {
      const snap = await templatesRef.orderBy('updatedAt', 'desc').limit(50).get()
      const templates = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      return res.status(200).json(templates)
    }

    if (req.method === 'POST') {
      const parseResult = TemplateSchema.omit({ id: true, createdAt: true, updatedAt: true }).safeParse(req.body)
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid template', details: parseResult.error.flatten() })
      }

      const now = Date.now()
      const templateData = {
        ...parseResult.data,
        createdAt: now,
        updatedAt: now,
      }

      const docRef = await templatesRef.add(templateData)
      return res.status(201).json({ id: docRef.id, ...templateData })
    }

    if (req.method === 'PUT') {
      const templateId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      if (!templateId) return res.status(400).json({ error: 'Missing template ID' })

      const parseResult = TemplateSchema.omit({ id: true, createdAt: true }).partial().safeParse(req.body)
      if (!parseResult.success) {
        return res.status(400).json({ error: 'Invalid template', details: parseResult.error.flatten() })
      }

      await templatesRef.doc(templateId).update({
        ...parseResult.data,
        updatedAt: Date.now(),
      })

      return res.status(200).json({ id: templateId, ...parseResult.data, updatedAt: Date.now() })
    }

    if (req.method === 'DELETE') {
      const templateId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      if (!templateId) return res.status(400).json({ error: 'Missing template ID' })

      await templatesRef.doc(templateId).delete()
      return res.status(204).send('')
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: any) {
    console.error('Templates error:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
}