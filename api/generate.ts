// Punto de entrada de la función de Vercel: POST /api/generate.
// El código vive en `_src` (el guion bajo evita que Vercel lo convierta en funciones adicionales).
import handler from './_src/generate.js'

export default handler
