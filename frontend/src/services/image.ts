/**
 * Lee una imagen (PNG/JPG) y la reduce a `maxSize` px de lado mayor, devolviéndola como PNG.
 * Una firma escaneada puede pesar varios MB y Vercel limita el cuerpo de la petición a ~4,5 MB.
 */
export function loadScaledImage(file: File, maxSize: number): Promise<{ base64: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.onload = () => {
      const img = new window.Image()
      img.onerror = () => reject(new Error('El archivo no es una imagen válida'))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const width = Math.max(1, Math.round(img.width * scale))
        const height = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('No se pudo procesar la imagen'))
        ctx.drawImage(img, 0, 0, width, height)
        resolve({ base64: canvas.toDataURL('image/png'), width, height })
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
