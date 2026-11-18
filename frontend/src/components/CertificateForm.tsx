import { useState, useCallback, useMemo } from 'react'
import { useGenerateCertificate } from '../hooks/useGenerateCertificate'
import { useTemplates } from '../hooks/useTemplates'
import { LogoPlacementPicker } from './LogoPlacementPicker'
import { CertificatePreview } from './CertificatePreview'
import { TemplateManager } from './TemplateManager'
import { FolderOpen, RefreshCw, Image, Palette, Settings, Sparkles, Award, FileText, X, Circle, CircleCheck, Wand2, PenLine } from 'lucide-react'
import { SectionHeader } from './SectionHeader'
import { extractPalette } from '../services/palette'
import { loadScaledImage } from '../services/image'
import { downloadCertificate } from '../services/api'
import { LOGO_SIZE_DEFAULT } from '../services/logoPlacement'
import type { CertificateData, CertificateStyle, ColorScheme, FixedText } from '../types'

const DEFAULT_COLORS: ColorScheme = {
  primary: '#AB99E6',
  secondary: '#F6F3FD',
  accent: '#F5B7A3',
}

const DEFAULT_FIXED_TEXTS: FixedText[] = []

const OPENING_PHRASES = ['Certifica que:', 'Certifican que:', 'Hace constar que:', 'Le otorga el reconocimiento a:', 'Otorga el presente certificado a:']
const COURSE_PHRASES = ['completó el curso', 'completó el curso de', 'participó en el', 'aprobó el', 'realizó el curso de', 'asistió al']

const DEFAULT_DATA = {
  openingPhrase: OPENING_PHRASES[0],
  coursePhrase: COURSE_PHRASES[0],
  courseName: '',
  signature: { name: '', role: '', image: null },
  colors: DEFAULT_COLORS,
  logo: null,
  logoPlacement: 'top' as const,
  logoSize: LOGO_SIZE_DEFAULT,
  fixedTexts: DEFAULT_FIXED_TEXTS,
}


/** Campo de frase: opciones con un clic o texto libre. */
function PhraseField({ id, label, value, options, onChange, placeholder }: { id: string; label: string; value: string; options: string[]; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} type="text" value={value} onChange={(e) => onChange(e.target.value)} className="input" placeholder={placeholder} maxLength={60} autoComplete="off" />
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={`Opciones para ${label.toLowerCase()}`}>
        {options.map((opt) => {
          const selected = value === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              aria-pressed={selected}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${selected ? 'border-lilac-300 bg-lilac-200 font-semibold text-lilac-700' : 'border-line bg-white text-ink-soft hover:bg-lilac-100'}`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ColorField({ id, label, hint, value, onChange }: { id: string; label: string; hint: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-white/70 p-4">
      <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} className="swatch" />
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-semibold text-ink">{label}</label>
        <p className="text-xs text-ink-muted">{hint}</p>
        <p className="mt-0.5 font-mono text-xs uppercase text-ink-soft">{value}</p>
      </div>
    </div>
  )
}

type Step = { key: string; label: string; done: boolean; required: boolean; target?: string; hint?: string }

function Checklist({ steps }: { steps: Step[] }) {
  const missing = steps.filter((s) => s.required && !s.done)
  const goTo = (target?: string) => {
    const el = target ? document.getElementById(target) : null
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el?.focus({ preventScroll: true })
  }
  return (
    <section className={`rounded-card border p-5 md:p-6 ${missing.length ? 'border-butter-300 bg-butter-100/70' : 'border-mint-300 bg-mint-100/70'}`} aria-live="polite">
      <h2 className="text-lg font-semibold">
        {missing.length ? `Faltan ${missing.length} ${missing.length === 1 ? 'dato' : 'datos'} para generar` : 'Todo listo para generar'}
      </h2>
      <ul className="mt-3 space-y-2">
        {steps.map((step) => (
          <li key={step.key} className="flex items-start gap-3 text-sm">
            {step.done ? (
              <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-mint-700" aria-label="Completado" />
            ) : (
              <Circle className={`mt-0.5 h-5 w-5 shrink-0 ${step.required ? 'text-butter-700' : 'text-ink-muted'}`} aria-label="Pendiente" />
            )}
            <span className="min-w-0">
              {!step.done && step.target ? (
                <button type="button" onClick={() => goTo(step.target)} className="font-semibold text-ink underline decoration-butter-300 decoration-2 underline-offset-2 hover:decoration-ink">
                  {step.label}
                </button>
              ) : (
                <span className="font-semibold text-ink">{step.label}</span>
              )}
              <span className="text-ink-muted"> · {step.required ? 'obligatorio' : 'opcional'}</span>
              {step.hint && <span className="block text-ink-muted">{step.hint}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function CertificateForm() {
  const [data, setData] = useState<CertificateData>({
    ...DEFAULT_DATA,
  })

  const [logoPalette, setLogoPalette] = useState<ColorScheme | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [advanced, setAdvanced] = useState(false)
  const { generate, loading, progress, result, error } = useGenerateCertificate()
  const { templates, create, remove } = useTemplates()
  // Copia de los datos con los que se generó el certificado que se está mostrando.
  const [generatedWith, setGeneratedWith] = useState<string | null>(null)
  // Datos exactos de la última generación: la descarga se pide con estos, aunque el formulario ya haya cambiado.
  const [generatedData, setGeneratedData] = useState<CertificateData | null>(null)
  const [generatedSeed, setGeneratedSeed] = useState<number | undefined>(undefined)
  const hasResults = !!result?.variants?.length
  const outdated = useMemo(
    () => !!result?.variants?.length && generatedWith !== null && JSON.stringify(data) !== generatedWith,
    [data, result, generatedWith],
  )

  const updateField = useCallback(<K extends keyof CertificateData>(field: K, value: CertificateData[K]) => {
    setData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleLogoUpload = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      const img = new window.Image()
      img.onload = async () => {
        updateField('logo', {
          size: file.size,
          base64,
          mimeType: file.type === 'image/svg+xml' ? 'image/svg+xml' : 'image/png',
          width: img.width,
          height: img.height,
          name: file.name,
        })
        // Los colores del certificado se toman del logo; el usuario puede cambiarlos después.
        const palette = await extractPalette(base64)
        setLogoPalette(palette)
        if (palette) updateField('colors', palette)
      }
      img.src = base64
    }
    reader.readAsDataURL(file)
  }, [updateField])

  const handleSignatureUpload = useCallback(async (file: File) => {
    try {
      const img = await loadScaledImage(file, 900)
      setData(prev => ({ ...prev, signature: { ...prev.signature, image: { ...img, mimeType: 'image/png', name: file.name } } }))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo cargar la firma')
    }
  }, [])

  const updateSignature = (patch: Partial<CertificateData['signature']>) =>
    setData(prev => ({ ...prev, signature: { ...prev.signature, ...patch } }))

  const handleGenerate = async () => {
    if (!data.logo) {
      if (!confirm('No hay logo subido. ¿Continuar sin logo?')) return
    }
    try {
      const snapshot = JSON.stringify(data)
      const response = await generate(data)
      setGeneratedWith(snapshot)
      setGeneratedData(data)
      setGeneratedSeed(response.seed)
    } catch {
      // Error handled in hook
    }
  }

  const [dragging, setDragging] = useState(false)

  const steps: Step[] = [
    { key: 'course', label: 'Curso', done: !!data.courseName.trim(), required: false, target: 'courseName', hint: 'En blanco queda una línea para escribirlo a mano' },
    { key: 'signature', label: 'Firma', done: !!data.signature.name.trim(), required: false, target: 'signatureName', hint: 'Nombre y cargo de quien firma; la imagen de la firma es opcional' },
    { key: 'logo', label: 'Logo', done: !!data.logo, required: false, hint: 'Sin logo se genera igual, solo sin tu marca' },
  ]

  const handleDownload = async (type: 'png' | 'pdf', style: CertificateStyle) => {
    if (!generatedData) return
    if (type === 'pdf') {
      alert('PDF: Implementar con jsPDF + html2canvas')
      return
    }
    try {
      // El certificado definitivo se genera en este momento: no queda guardado en ningún lado.
      const blob = await downloadCertificate(generatedData, style, generatedSeed)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `certificado-${style}.png`
      link.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'No se pudo descargar el certificado')
    }
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lilac-300 text-ink shadow-soft">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-none">Certificados IA</h1>
            <p className="mt-1 text-sm text-ink-muted">Diseña y descarga certificados listos para imprimir</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowTemplates(true)} className="btn btn-secondary">
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Plantillas</span>
          </button>
          <button onClick={() => setAdvanced(!advanced)} className={`btn ${advanced ? 'bg-mint-200 text-mint-700 hover:bg-mint-300' : 'btn-ghost'}`} aria-pressed={advanced}>
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Avanzado</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
          <div className="space-y-6">
            <section className="card p-6 md:p-8">
              <SectionHeader icon={<Image className="h-5 w-5" />} tone="sky" title="Logo" description="Súbelo y elige dónde va. PNG o SVG con fondo transparente, máx. 5 MB." />
              <input type="file" accept="image/png,image/svg+xml" onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} className="hidden" id="logo-upload" />
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragging(false)
                  const file = e.dataTransfer.files?.[0]
                  if (file && (file.type === 'image/png' || file.type === 'image/svg+xml')) handleLogoUpload(file)
                }}
                className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors duration-150 md:p-8 ${dragging ? 'border-sky-300 bg-sky-100' : 'border-lilac-200 bg-lilac-50/60'}`}
              >
                {data.logo ? (
                  <div className="flex flex-col items-center gap-4">
                    <img src={data.logo.base64} alt="Logo cargado" className="h-20 w-auto max-w-xs object-contain" />
                    <div className="text-center">
                      <p className="max-w-xs truncate font-semibold text-ink">{data.logo.name}</p>
                      <p className="text-sm text-ink-muted">{data.logo.width}×{data.logo.height}px · {(data.logo.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => document.getElementById('logo-upload')?.click()} className="btn btn-secondary">Cambiar logo</button>
                      <button type="button" onClick={() => { updateField('logo', null); setLogoPalette(null) }} className="btn btn-ghost">Quitar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-200 text-sky-700">
                      <Image className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-ink">Arrastra tu logo aquí</p>
                      <p className="text-sm text-ink-muted">o selecciona un archivo de tu equipo</p>
                    </div>
                    <button type="button" onClick={() => document.getElementById('logo-upload')?.click()} className="btn btn-primary">Seleccionar archivo</button>
                  </div>
                )}
              </div>
              <div className="mt-6">
                <LogoPlacementPicker logo={data.logo} placement={data.logoPlacement} size={data.logoSize} onPlacementChange={(v) => updateField('logoPlacement', v)} onSizeChange={(v) => updateField('logoSize', v)} />
              </div>
            </section>

            <section className="card p-6 md:p-8">
              <SectionHeader icon={<Palette className="h-5 w-5" />} tone="peach" title="Colores" description={logoPalette ? 'Tomados de tu logo. Puedes cambiarlos cuando quieras.' : 'El principal va en bordes y detalles, el secundario es el fondo y el acento da los toques de realce.'} />

              {logoPalette && (
                <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-sky-100/70 p-3 text-sm">
                  <span className="flex items-center gap-1.5">
                    {[logoPalette.primary, logoPalette.secondary, logoPalette.accent].map((c, i) => (
                      <span key={i} className="h-5 w-5 rounded-full ring-1 ring-line" style={{ backgroundColor: c }} />
                    ))}
                  </span>
                  <span className="text-ink-soft">Paleta detectada en tu logo</span>
                  <button
                    type="button"
                    onClick={() => updateField('colors', logoPalette)}
                    disabled={JSON.stringify(logoPalette) === JSON.stringify(data.colors)}
                    className="btn btn-secondary ml-auto px-4 py-1.5"
                  >
                    <Wand2 className="h-4 w-4" />
                    Usar colores del logo
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <ColorField id="color-primary" label="Principal" hint="Bordes y detalles" value={data.colors.primary} onChange={(v) => updateField('colors', { ...data.colors, primary: v })} />
                <ColorField id="color-secondary" label="Secundario" hint="Fondo" value={data.colors.secondary} onChange={(v) => updateField('colors', { ...data.colors, secondary: v })} />
                <ColorField id="color-accent" label="Acento" hint="Toques de realce" value={data.colors.accent} onChange={(v) => updateField('colors', { ...data.colors, accent: v })} />
              </div>
            </section>

            <section className="card p-6 md:p-8">
              <SectionHeader icon={<FileText className="h-5 w-5" />} tone="lilac" title="Datos del certificado" description="Elige las frases o escribe las tuyas. Al generar obtendrás el certificado en 4 estilos para elegir. El nombre del participante queda como una línea para escribir a mano al imprimir; el curso es opcional y, en blanco, también queda una línea." />
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <PhraseField id="openingPhrase" label="Frase de apertura" value={data.openingPhrase} options={OPENING_PHRASES} onChange={(v) => updateField('openingPhrase', v)} placeholder="Ej: Certifica que:" />
                </div>
                <div className="md:col-span-2">
                  <PhraseField id="coursePhrase" label="Frase del curso" value={data.coursePhrase} options={COURSE_PHRASES} onChange={(v) => updateField('coursePhrase', v)} placeholder="Ej: completó el curso" />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="courseName" className="label">Curso <span className="font-normal text-ink-muted">· opcional</span></label>
                  <input id="courseName" type="text" value={data.courseName} onChange={(e) => updateField('courseName', e.target.value)} className="input" placeholder="Ej: Diseño digital" maxLength={120} autoComplete="off" />
                </div>
              </div>
            </section>

            <section className="card p-6 md:p-8">
              <SectionHeader icon={<PenLine className="h-5 w-5" />} tone="mint" title="Firma" description="Quién firma el certificado. La imagen de la firma es opcional: sin ella queda la línea para firmar a mano." />
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="signatureName" className="label">Nombre</label>
                  <input id="signatureName" type="text" value={data.signature.name} onChange={(e) => updateSignature({ name: e.target.value })} className="input" placeholder="Laura Gómez" maxLength={80} autoComplete="off" />
                </div>
                <div>
                  <label htmlFor="signatureRole" className="label">Cargo</label>
                  <input id="signatureRole" type="text" value={data.signature.role} onChange={(e) => updateSignature({ role: e.target.value })} className="input" placeholder="Directora académica" maxLength={80} autoComplete="off" />
                </div>
              </div>
              <input type="file" accept="image/png,image/jpeg" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleSignatureUpload(f); e.target.value = '' }} className="hidden" id="signature-upload" />
              <div className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-mint-300 bg-mint-100/50 p-4">
                {data.signature.image ? (
                  <>
                    <img src={data.signature.image.base64} alt="Firma cargada" className="h-16 max-w-[12rem] rounded-lg bg-white object-contain p-1" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{data.signature.image.name}</p>
                      <p className="text-xs text-ink-muted">PNG con fondo transparente o foto con fondo blanco</p>
                    </div>
                    <button type="button" onClick={() => document.getElementById('signature-upload')?.click()} className="btn btn-secondary">Cambiar</button>
                    <button type="button" onClick={() => updateSignature({ image: null })} className="btn btn-ghost">Quitar</button>
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">Imagen de la firma</p>
                      <p className="text-xs text-ink-muted">PNG o JPG. Si el fondo es blanco, se integra solo con el papel.</p>
                    </div>
                    <button type="button" onClick={() => document.getElementById('signature-upload')?.click()} className="btn btn-primary">Subir firma</button>
                  </>
                )}
              </div>
            </section>


            {advanced && (
              <section className="card p-6 md:p-8">
                <SectionHeader icon={<Settings className="h-5 w-5" />} tone="mint" title="Textos adicionales" description="Textos extra con la posición, el tamaño y el color que elijas, por ejemplo una leyenda o un número de resolución."
                  action={
                    <button type="button" className="btn btn-secondary" onClick={() => updateField('fixedTexts', [...data.fixedTexts, { id: String(Date.now()), label: 'Texto', value: 'Nuevo texto', position: { x: 0.5, y: 0.7 }, fontSize: 30, color: '#5E5B7A', fontFamily: 'serif' }])}>
                      Agregar texto
                    </button>
                  } />
                {data.fixedTexts.length === 0 && <p className="rounded-2xl bg-mint-100/50 p-4 text-sm text-ink-muted">Aún no hay textos adicionales.</p>}
                <div className="space-y-3">
                  {data.fixedTexts.map((text, index) => {
                    const update = (patch: Partial<typeof text>) => {
                      const newTexts = [...data.fixedTexts]
                      newTexts[index] = { ...text, ...patch }
                      updateField('fixedTexts', newTexts)
                    }
                    return (
                      <div key={text.id} className="grid grid-cols-2 gap-4 rounded-2xl border border-line bg-mint-100/50 p-4 md:grid-cols-12">
                        <div className="col-span-2 md:col-span-5">
                          <label className="label">Texto</label>
                          <input type="text" value={text.value} onChange={(e) => update({ value: e.target.value })} className="input text-sm" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="label">Tamaño (px)</label>
                          <input type="number" value={text.fontSize} onChange={(e) => update({ fontSize: Number(e.target.value) })} className="input text-sm" min="10" max="72" />
                        </div>
                        <div className="md:col-span-1">
                          <label className="label">Color</label>
                          <input type="color" value={text.color} onChange={(e) => update({ color: e.target.value })} className="h-[2.65rem] w-full cursor-pointer rounded-field border border-line bg-white p-1" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="label">Posición X (%)</label>
                          <input type="number" value={Math.round(text.position.x * 100)} onChange={(e) => update({ position: { ...text.position, x: Number(e.target.value) / 100 } })} className="input text-sm" min="0" max="100" step="1" />
                        </div>
                        <div className="col-span-2 md:col-span-12 md:text-right">
                          <button type="button" className="btn btn-ghost" onClick={() => updateField('fixedTexts', data.fixedTexts.filter((t) => t.id !== text.id))}>Quitar este texto</button>
                        </div>
                        <div className="md:col-span-2">
                          <label className="label">Posición Y (%)</label>
                          <input type="number" value={Math.round(text.position.y * 100)} onChange={(e) => update({ position: { ...text.position, y: Number(e.target.value) / 100 } })} className="input text-sm" min="0" max="100" step="1" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            <Checklist steps={steps} />

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <button onClick={handleGenerate} disabled={loading} className="btn btn-primary px-8 py-3.5 text-base shadow-soft">
                {loading ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generando…
                  </>
                ) : (
                  hasResults && !outdated ? (
                    <>
                      <RefreshCw className="h-5 w-5" />
                      Ver otras variaciones
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Generar certificado
                    </>
                  )
                )}
              </button>
            </div>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <CertificatePreview result={result} data={data} loading={loading} progress={progress} outdated={outdated} onDownload={handleDownload} />
          </aside>
        </div>
      </main>

      <TemplateManager
        templates={templates}
        onLoad={(template) => {
          setData({ ...DEFAULT_DATA, ...template.data, signature: { ...DEFAULT_DATA.signature, ...template.data.signature } })
          setShowTemplates(false)
        }}
        onSave={(name) => create({ name, data })}
        onDelete={remove}
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
      />

      {error && (
        <div role="alert" className="fixed bottom-4 right-4 z-50 flex max-w-md items-start gap-3 rounded-2xl border border-rose-200 bg-rose-100 p-4 text-rose-700 shadow-lift">
          <X className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">No se pudo generar el certificado</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}
