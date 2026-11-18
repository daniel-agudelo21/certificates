# Certificados IA

Aplicación web interna para que un equipo de diseño genere certificados con plantillas de diseño por código, los previsualice y los descargue como PNG o PDF.

Es de uso interno, con muy pocos usuarios y pocas generaciones al día, por lo que corre completamente en planes gratuitos y **no tiene login**.

## Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **API**: Express (handlers estilo Vercel Functions), Node.js 20, TypeScript, Zod
- **Render**: SVG + `canvas` + `sharp` (plantillas por estilo, tipografías libres incluidas en `api/fonts/`)
- **Datos**: Firestore (plantillas y registro de certificados)
- **Archivos**: ninguno. Los certificados no se guardan: se generan al descargar.
- **Deploy**: Vercel (monorepo)

## Estructura

```
certificates/
├── frontend/            # React + Vite
│   └── src/ (components, hooks, services, types.ts)
├── api/
│   └── src/
│       ├── generate.ts          # POST /api/generate
│       ├── templates.ts         # CRUD /api/templates
│       ├── local-server.ts      # Servidor Express para desarrollo
│       ├── config.ts            # Configuración y variables de entorno
│       ├── models/schemas.ts    # Validación con Zod
│       └── services/            # background-templates, overlay-engine, gemini-client, storage
├── vercel.json
└── package.json
```

## Configuración

Copia `.env.example` a `api/.env` y completa los valores (nunca los subas al repositorio):

| Variable | Obligatoria | Uso |
|----------|-------------|-----|
| `FIREBASE_PROJECT_ID` | Sí | Proyecto de Firestore |
| `FIREBASE_STORAGE_BUCKET` | Sí | Bucket de Firebase |

En producción, define las mismas variables en Vercel → Settings → Environment Variables.

Firestore necesita credenciales de Google (por ejemplo `GOOGLE_APPLICATION_CREDENTIALS`) para que funcionen las plantillas, también en local.

## Desarrollo local

```bash
npm run install:all
npm run dev            # frontend (http://localhost:5173) + API (http://localhost:3000)
```

```bash
npm run dev:frontend   # solo Vite
npm run dev:api        # solo la API (tsx watch src/local-server.ts)
npm run build          # build de todo
npm run lint
npm run deploy         # vercel --prod
```

## Flujo de uso

1. Subir el logo y elegir su posición (5 opciones); los colores se toman del logo y se pueden cambiar. Luego elegir las frases, el curso (opcional) y la firma.
2. Posicionar el logo y los textos fijos en el canvas.
3. Generar: se muestran los 4 estilos en miniatura para elegir: se dibuja el fondo según el estilo y los colores en formato horizontal (2048×1536), se añaden textos y logo, y se ajusta a 300 DPI al descargar el elegido. No consume cuota de ninguna API ni guarda archivos.
4. Previsualizar y descargar PNG o PDF.
5. Guardar y cargar plantillas con configuraciones frecuentes.

## Estilos

Cada vez que generas se crean los 4 estilos (formal, moderno, académico y creativo), cada uno con su propia tipografía y varias versiones de marco, esquinas y fondo. Si pulsas «Ver otras variaciones» salen diseños nuevos; el que eliges se descarga idéntico a su miniatura.

## Límites

- Rate limit: 10 solicitudes por minuto (global, sin usuarios).
- Generar un certificado no usa ninguna API de pago. Los modelos de imagen de Google (Nano Banana) no tienen cupo gratuito, por eso no se usan.

## Datos (Firestore)

```
templates/{templateId}      name, data (CertificateData), thumbnail?, createdAt, updatedAt
certificates/{certificateId}  courseName, url, style, colors, createdAt
rateLimits/anonymous        requests: number[]
```

## Solución de problemas

| Problema | Solución |
|----------|----------|
| Error al compilar `sharp`/`canvas` | `npm rebuild` en `api/` |
| Falta una fuente o el texto sale en otra tipografía | Verificar que existan los `.ttf` en `api/fonts/` |
| Plantillas no cargan en local | Verificar credenciales de Google para Firestore |
| Logo no aparece | Usar PNG/SVG con fondo transparente |
| Falla el deploy en Vercel | Verificar las variables de entorno en Settings |

## Licencia

Uso interno.
