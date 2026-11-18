# Certificados IA

Aplicación web interna para que un equipo de diseño genere certificados, los previsualice en 4 estilos y descargue el que más le guste en PNG.

Es de uso interno, con muy pocos usuarios, y corre en el plan gratuito de Vercel. **No tiene login, base de datos ni claves de ningún servicio.**

## Cómo funciona

1. Subes el logo y eliges dónde va (5 posiciones) y su tamaño. Los colores se toman del logo y se pueden cambiar.
2. Eliges las frases («Certifica que:», «completó el curso»…), el curso (opcional) y la firma (nombre, cargo e imagen opcional).
3. **Generar** crea los 4 estilos (formal, moderno, académico y creativo), cada uno con su tipografía y varias versiones de marco, esquinas, fondo y medalla. **Ver otras variaciones** da diseños nuevos.
4. Eliges uno y lo descargas: el PNG se genera en ese momento a resolución de impresión. Nada se guarda en ningún servidor.

El nombre del participante queda como una línea en blanco para escribirlo a mano al imprimir. Las plantillas se guardan en el navegador de cada persona.

## Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **API**: una función de Vercel (`api/generate.ts`), TypeScript, Zod
- **Render**: SVG + `@napi-rs/canvas` + `sharp`, con tipografías libres incluidas en `api/fonts/`

## Estructura

```
certificates/
├── frontend/            # React + Vite
├── api/
│   ├── generate.ts      # Entrada de la función de Vercel: POST /api/generate
│   ├── _src/            # Código real (el guion bajo evita que Vercel lo trate como funciones)
│   ├── assets/          # Marca de agua («powered by hacku»)
│   └── fonts/           # Tipografías de los 4 estilos
├── vercel.json
└── package.json
```

## Desarrollo local

```bash
npm install
npm run dev            # frontend (http://localhost:5173) + API (http://localhost:3000)
```

```bash
npm run dev:frontend   # solo Vite
npm run dev:api        # solo la API (tsx watch api/_src/local-server.ts)
npm run build          # build del frontend y chequeo de tipos de la API
npm run lint
```

No hacen falta variables de entorno.

## Despliegue en Vercel

1. Sube el código a GitHub.
2. En vercel.com → **Add New… → Project**, importa el repositorio. Deja el *Root Directory* en la raíz: `vercel.json` ya define cómo construir (`npm run build --workspace=frontend`), de dónde servir (`frontend/dist`) y la función `api/generate.ts`.
3. No hay variables de entorno que configurar. Pulsa **Deploy**.
4. Cada `git push` a `main` actualiza el sitio.

Para probar antes de publicar: `npx vercel` crea un despliegue de prueba con un enlace temporal (pide iniciar sesión la primera vez).

## Límites

- **Límite de uso:** 10 solicitudes por minuto por instancia de la función, en memoria. Frena ráfagas, no es un límite global.
- **Plantillas:** viven en el `localStorage` del navegador (~5 MB); se pierden si se borran los datos del navegador. El logo y la firma van dentro de la plantilla, así que imágenes muy pesadas pueden llenar el espacio.
- **Vercel Hobby:** el plan gratuito es para uso no comercial; revisa sus términos si lo usa una empresa.

## Solución de problemas

| Problema | Solución |
|----------|----------|
| El texto sale en otra tipografía | Verificar que existan los `.ttf` en `api/fonts/` |
| No aparece «powered by hacku» | Verificar que exista `api/assets/watermark.png` |
| No se puede guardar una plantilla | El navegador no tiene espacio: usar un logo o una firma más livianos |
| El logo no aparece | Usar PNG o SVG con fondo transparente |

## Licencia

Uso interno.
