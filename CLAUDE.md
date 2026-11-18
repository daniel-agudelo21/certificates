# Certificados IA

Aplicación web interna para que un equipo de diseño genere certificados, los previsualice y los descargue. Los certificados se **renderizan por código** (plantillas SVG + canvas), sin IA. Idioma del producto y de la UI: **español**.

## Contexto y restricciones (leer antes de proponer cambios)

- **Uso muy bajo**: pocas personas, pocas generaciones al día (README estima ~3 certificados/día). La concurrencia es prácticamente nula.
- **Todo corre en el plan gratuito de Vercel (Hobby)**; sin base de datos ni almacenamiento. Ningún certificado ni plantilla se guarda en un servidor. Objetivo: **$0/mes**. (Hobby es para uso no comercial: revisar los términos si el equipo lo usa como empresa.)
- Consecuencias para el diseño:
  - Prefiere soluciones simples. **No** agregues colas, caché distribuida, workers, Redis, CDN ni infraestructura de escala.
  - Generar un certificado **no llama a ninguna API de pago**. Los modelos de imagen de Google (Nano Banana, etc.) tienen `limit: 0` en el free tier de este proyecto: **no los reintroduzcas** sin confirmar con el usuario que activó facturación.
  - Vercel Hobby limita la duración y el tamaño de las funciones (el `vercel.json` pide 30 s) y el cuerpo de las peticiones (~4,5 MB; por eso la firma se reduce en el navegador). Un flujo de generación más largo puede acercarse al límite.
  - No introduzcas servicios de pago ni dependencias que requieran tarjeta sin consultarlo.

## Decisiones tomadas

- **Sin autenticación ni login (intencional y definitivo)**: la app es de uso interno y se mantiene simple. No agregues login, JWT, `AuthGate`, roles ni límites por usuario. Todo se registra bajo el usuario `anonymous`.
- **No crear PRs ni gestionar el flujo de git**: Claude no abre pull requests ni hace push; solo hace commits si el usuario lo pide explícitamente.

## Stack

Monorepo npm workspaces (`frontend`, `api`), Node >= 20.

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite 5 + TypeScript + Tailwind 3 (`jspdf`, `html2canvas` para PDF, `lucide-react` iconos) |
| API | **Una sola función de Vercel** (`api/generate.ts`) con el código en `api/_src`; servidor Express solo para desarrollo local. TypeScript ESM (imports con extensión `.js`), Zod |
| Render | SVG por estilo (`background-templates.ts`) → `sharp` → `@napi-rs/canvas` (textos, logo; sin dependencias del sistema, a diferencia de `canvas`, que suele fallar en Vercel) → 300 DPI. Fuentes en `api/fonts/` |
| Datos | **Ninguno en el servidor**: las plantillas se guardan en el `localStorage` del navegador (`frontend/src/services/templates.ts`) |
| Archivos | **Ninguno**: los certificados no se guardan en ningún lado |
| Auth | **Ninguna, por decisión de diseño** (ver abajo) |
| Deploy | Vercel desde la raíz del repo (`vercel.json`): el frontend se construye con `npm run build --workspace=frontend` y se sirve desde `frontend/dist`; `/api/generate` es la función |

## Estructura

```
api/
  generate.ts            Entrada de la función de Vercel (POST /api/generate): solo reexporta el manejador
  _src/                  Código real. El guion bajo es obligatorio: Vercel convierte en función cada .ts de api/ que no lo tenga
    generate.ts          Manejador: valida, aplica el límite de uso y genera (vista previa o descarga)
    local-server.ts      Servidor Express para desarrollo local (puerto 3000)
    config.ts            Límites de uso
    models/schemas.ts    Schemas Zod (fuente de verdad del contrato de la API)
    services/background-templates.ts  Fondos SVG por estilo (formal/moderno/académico/creativo), semilla y colores de texto
    services/overlay-engine.ts  Canvas: frases, curso, líneas en blanco, firma, logo, marca de agua y textos fijos; sharp: 300 DPI
    services/certificate-id.ts  ID `CERT-YYYYMMDD-XXXXXX` que se devuelve en la vista previa
  assets/watermark.png   Logo «powered by hacku» (gris, fondo transparente) que va abajo en cada certificado
  fonts/                 Tipografías (OFL) de los 4 estilos
frontend/src/
  App.tsx                Renderiza directamente <CertificateForm />
  components/            CertificateForm, CertificatePreview, LogoPlacementPicker, PlacedLogo,
                         TemplateManager, TemplateCard, SectionHeader
  hooks/                 useGenerateCertificate, useTemplates
  services/              api.ts (fetch a `/api/generate`), templates.ts (localStorage), palette.ts, image.ts, logoPlacement.ts, styles.ts
  types.ts               Tipos del frontend (duplican los de Zod en la API)
```

## Pipeline de generación (`api/_src/generate.ts`)

1. Límite de uso en memoria (ventana 60 s, máx. 10 solicitudes). En Vercel vale por instancia de la función, no es global: frena ráfagas, no abusos sostenidos.
2. Validación con `GenerateRequestSchema`; los errores indican el campo exacto (`data.logoSize: ...`).
3. **Dos modos en el mismo endpoint, y no se guarda nada** (ni Blob ni disco; los certificados solo existen mientras se muestran o se descargan):
   - **Vista previa** (sin `style`): renderiza los **4 estilos** (`CERTIFICATE_STYLES`: formal, moderno, académico, creativo) en serie, para cuidar la memoria de Vercel, y devuelve `variants: [{style, previewUrl}]` con miniaturas JPEG de 1024 px como *data URL* (~170 KB en total). Unos 2 s, sin llamar a ninguna API. No hay selector de estilo: el usuario elige entre las miniaturas.
   - **Descarga** (con `style`): renderiza solo ese estilo, `enhanceForPrint` (PNG a 300 DPI) y lo devuelve como archivo (`image/png`, ~0,5 s). El frontend la pide con los datos de la **última generación**, no con los del formulario actual.
   - El render es **determinista** (vista previa = descarga). Por eso no hay IA en el flujo.
   - **Variación con semilla**: cada vista previa genera una `seed` aleatoria y la devuelve; la descarga la reenvía (el frontend guarda la de la última generación). Con la misma semilla el diseño es idéntico; con otra, cambia. Volver a pulsar el botón («Ver otras variaciones») da diseños nuevos. Cada plantilla de `background-templates.ts` tiene varias versiones (marco, esquinas, trama, sello, fondo) y `createRng(seedFor(seed, style))` elige cuál. **Todo lo aleatorio debe salir de ese `rng`, nunca de `Math.random()`**, o la miniatura dejará de coincidir con la descarga.
   - **Zonas reservadas** (los adornos no deben entrar): centro de la hoja (textos), zonas del logo (`LOGO_REGIONS`), firma, marca de agua y el sello. Los adornos viven en márgenes y esquinas (≤ 274 px del borde); los fondos difuminados (moderno/creativo) pueden ir detrás porque son de baja opacidad.
   - **Medalla (solo formal y académico)**: `placeSeal()` elige, según la semilla, entre 5 modos: `side` (chica, al costado), `signature` (mediana, junto a la firma), `corner` (grande, esquina inferior) y dos modos gigantes y tenues sin listones, `giant` (emblema de fondo al centro, ~10-15 % de opacidad) y `bleed` (saliéndose por una esquina inferior). Los modos de abajo se ponen del lado contrario al logo cuando este va en una esquina inferior (`Env.avoidSide`). Si cambias tamaños o posiciones, revisa que no pisen la firma, la marca de agua ni `LOGO_REGIONS`.
   - **Tipografía por estilo** (`FONT_SETS` en `overlay-engine.ts`): formal = Playfair Display + Lato; moderno = Montserrat; académico = Merriweather + Inter; creativo = Caveat + Poppins. Todas OFL y empaquetadas en `api/fonts/` (regular y negrita). `scale` compensa el tamaño visual de cada fuente. Al agregar una, verificar las tildes y la Ñ.
4. `renderCertificate(data, style)`: lienzo **horizontal 2048×1536 (4:3)**, igual que el lienzo de posición del logo del frontend. Fondo SVG del estilo. **El logo va en una de 5 posiciones estándar** (`logoPlacement`: `top`, `top-left`, `top-right`, `bottom-left`, `bottom-right`) y con un tamaño entre 50 y 100 % (`logoSize`, por defecto 85) **de la zona máxima segura de esa posición**. Las zonas (`LOGO_REGIONS`, en píxeles de la hoja 2048×1536) están dentro del marco y no tocan adornos ni la frase de apertura; el logo se alinea dentro de su zona (centrado arriba, hacia la esquina en las otras). Viven duplicadas en `api/src/services/overlay-engine.ts` y `frontend/src/services/logoPlacement.ts` y **deben coincidir**; la API rechaza `logoSize` fuera de 50–100. No hay posicionamiento ni tamaño libres, es intencional: si hace falta más espacio, se cambia la zona, no el límite. De arriba abajo: frase de apertura → **línea en blanco** para el participante → frase del curso → curso → firma (imagen opcional, línea, nombre, cargo) → marca de agua. El certificado ya no muestra ID (se genera en el servidor solo para nombrar el archivo). Las dos frases (`openingPhrase`, por defecto «Certifica que:», y `coursePhrase`, por defecto «completó el curso») se eligen con botones o se escriben (máx. 60 caracteres); vacías, no se dibujan. Las listas de opciones están en `OPENING_PHRASES` y `COURSE_PHRASES` (`CertificateForm.tsx`). No hay campo de título.

Los estilos son un parámetro del render (`style`), no un campo del certificado. Posiciones siempre como fracciones 0–1 del ancho/alto.

## Comandos

```bash
npm install             # instala todo (workspaces)
npm run dev             # frontend (5173) + API local (3000)
npm run dev:frontend    # solo Vite; proxy de /api -> http://localhost:3000
npm run dev:api         # solo la API: tsx watch _src/local-server.ts
npm run build           # build del frontend (tsc && vite build) y chequeo de tipos de la API (tsc --noEmit)
npm run lint
npx vercel              # despliegue de PRUEBA (enlace temporal); producción: npx vercel --prod
```

La API local (`api/_src/local-server.ts`) escucha en :3000 y no requiere Vercel CLI. No hay tests configurados. Antes de tocar la estructura de `api/`, comprobar qué funciones detectaría Vercel (con `@vercel/fs-detectors`, `detectBuilders`): debe salir exactamente una, `api/generate.ts`.

## Variables de entorno

**La app no necesita ninguna.** No hay claves de IA, ni base de datos, ni almacenamiento. Si en el futuro se agrega alguna: va en `api/.env` (ignorado por git; plantilla sin valores en `.env.example`) y en las variables de entorno de Vercel. **Nunca escribas valores reales en README, CLAUDE.md, código ni commits.**

## Estado actual / ojos con esto

- **Las plantillas viven en el navegador** (`localStorage`, ~5 MB): cada persona ve solo las suyas y se pierden si borra los datos del navegador. Guardan el logo y la firma como imagen, así que pueden llenar el espacio (el error se muestra al usuario). Si se necesitan compartidas, habría que agregar una base de datos.
- **Sin IA de imagen (nov 2026)**: los modelos de imagen de Gemini responden 429 con `limit: 0` en el free tier de este proyecto; por eso el render es por código. No los reintroduzcas sin confirmar que el usuario activó facturación.
- El despliegue en Vercel **no se ha probado todavía en la nube**: la estructura de funciones se verificó con el detector de Vercel y todo funciona en local, pero falta un primer despliegue de prueba.
- Las fuentes (OFL) se resuelven relativas al módulo (`api/fonts`) y llegan a la función por `includeFiles` en `vercel.json`; igual la marca de agua (`api/assets`).
- Los tipos de `schemas.ts` (API) y `types.ts` (frontend) se mantienen a mano en paralelo. Si cambias uno, actualiza el otro.
- El historial de git se reescribió antes del primer push porque contenía claves en el README; ya no hay ninguna. Conviene haber rotado la clave de Gemini que estuvo ahí.

## Diseño del frontend

- Estética **pastel y armoniosa**: fondo lila lechoso, texto índigo suave y cinco pastel (`lilac`, `mint`, `peach`, `sky`, `butter`) definidos en `frontend/tailwind.config.js`. Cada sección y cada estilo de certificado usa su propio pastel; no introduzcas colores saturados ni grises neutros.
- Tipografía: Bricolage Grotesque (títulos, `font-display`) + Figtree (texto). Clases base (`.card`, `.btn-*`, `.input`, `.label`, `.swatch`, `.paper`) en `frontend/src/index.css`.
- Orden del formulario: **Logo (con su selector de posición y tamaño) → Colores → Datos → Firma** → Textos adicionales («Avanzado»). El logo va primero porque de él se sacan los colores.
- Al subir un logo, `frontend/src/services/palette.ts` extrae su paleta (principal = color dominante, acento = siguiente color distinto, secundario = tinte claro del principal) y la aplica a los colores; el usuario puede editarlos y volver a la del logo con «Usar colores del logo».
- `SectionHeader` es el encabezado común de cada sección del formulario. La vista previa (`CertificatePreview`) es fija a la derecha: muestra un borrador en vivo antes de generar y, después, los 4 estilos como miniaturas para elegir (PNG/PDF actúan sobre el elegido).
- Tailwind se procesa con `frontend/postcss.config.js`; sin él el CSS sale sin compilar.

## Convenciones

- TypeScript estricto; ESM en la API (`import ... from './x.js'`).
- Validar toda entrada nueva de la API con Zod en `models/schemas.ts`.
- Textos de UI y mensajes de error de cara al usuario en español.
- Mantén los cambios mínimos y alineados con el estilo existente; no agregues abstracciones ni infraestructura para escala que este proyecto no necesita.
- Nunca imprimas ni commitees secretos; usa `.env` / variables de Vercel. Tampoco leas ni muestres el contenido de `api/.env`.
