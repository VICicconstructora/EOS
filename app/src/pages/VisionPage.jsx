// src/pages/VisionPage.jsx
import { useState } from 'react'
import { Eye, ChevronRight, ChevronLeft, Plus, X, CheckCircle2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import GuiaEOS from '../components/guia/GuiaEOS'

// ─── Constantes de los 8 pasos ────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Valores',       title: 'Valores Centrales',       subtitle: '¿Qué principios guían a IC Constructora sin importar las circunstancias?' },
  { id: 2, label: 'Enfoque',       title: 'Enfoque Central',         subtitle: 'El propósito de la empresa y el nicho en el que compiten.' },
  { id: 3, label: 'Meta 10 años',  title: 'Meta a 10 Años',          subtitle: 'El gran objetivo audaz que motiva a todo el equipo por una década.' },
  { id: 4, label: 'Marketing',     title: 'Estrategia de Marketing', subtitle: '¿Quién es el cliente ideal y qué hace única a IC Constructora?' },
  { id: 5, label: '3 Años',        title: 'Imagen a 3 Años',         subtitle: '¿Cómo luce la empresa en 3 años? Ingresos, empleados, logros clave.' },
  { id: 6, label: '1 Año',         title: 'Plan a 1 Año',            subtitle: 'De 3 a 7 objetivos concretos y medibles para este año.' },
  { id: 7, label: 'Rocas',         title: 'Rocas del Trimestre',     subtitle: 'Las 3–7 prioridades más importantes del trimestre actual.' },
  { id: 8, label: 'Revisión',      title: 'Revisión Final',          subtitle: 'Verifica que todo esté correcto antes de completar tu V/TO.' },
]

// ─── Barra de progreso ────────────────────────────────────────────────────────
function ProgressBar({ currentStep, totalSteps }) {
  return (
    <div style={{ marginBottom: 'var(--space-8)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Paso {currentStep} de {totalSteps}
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--eos-vision)', fontWeight: 600 }}>
          {Math.round((currentStep / totalSteps) * 100)}% completado
        </span>
      </div>
      {/* barra */}
      <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${(currentStep / totalSteps) * 100}%`,
          background: 'linear-gradient(90deg, var(--eos-vision), var(--brand-primary))',
          borderRadius: 'var(--radius-full)',
          transition: 'width 0.4s ease',
        }} />
      </div>
      {/* etiquetas de pasos */}
      <div style={{ display: 'flex', marginTop: 'var(--space-3)', gap: 4 }}>
        {STEPS.map(s => (
          <div
            key={s.id}
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: '0.6rem',
              color: s.id === currentStep ? 'var(--eos-vision)' : s.id < currentStep ? 'var(--brand-primary)' : 'var(--text-muted)',
              fontWeight: s.id === currentStep ? 700 : 400,
              transition: 'color 0.3s',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            {s.id < currentStep ? '✓' : s.id === currentStep ? s.label : s.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Chip de valor central ────────────────────────────────────────────────────
function ValueChip({ value, onRemove, gold }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      padding: '4px 12px',
      borderRadius: 'var(--radius-full)',
      background: gold ? 'rgba(232,160,32,0.15)' : 'var(--bg-elevated)',
      border: `1px solid ${gold ? 'var(--brand-primary)' : 'var(--border-medium)'}`,
      color: gold ? 'var(--brand-primary)' : 'var(--text-primary)',
      fontSize: '0.85rem',
      fontWeight: 600,
    }}>
      {value}
      {onRemove && (
        <button
          onClick={onRemove}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            color: 'inherit',
            opacity: 0.7,
          }}
        >
          <X size={13} />
        </button>
      )}
    </div>
  )
}

// ─── Fila de resumen final ─────────────────────────────────────────────────────
function ReviewRow({ label, children }) {
  return (
    <div style={{
      padding: 'var(--space-4)',
      background: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-md)',
      borderLeft: '3px solid var(--eos-vision)',
    }}>
      <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--eos-vision)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-2)' }}>
        {label}
      </p>
      <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{children}</div>
    </div>
  )
}

// ─── Wizard ───────────────────────────────────────────────────────────────────
function VTOWizard({ initialData, onComplete }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [chipInput, setChipInput] = useState('')

  const [formData, setFormData] = useState({
    core_values: initialData?.core_values ?? [],
    core_focus: initialData?.core_focus ?? '',
    niche: initialData?.niche ?? '',
    ten_year_target: initialData?.ten_year_target ?? '',
    marketing_strategy: initialData?.marketing_strategy ?? '',
    three_year_picture: initialData?.three_year_picture ?? '',
    one_year_plan: initialData?.one_year_plan ?? '',
    quarterly_rocks_text: initialData?.quarterly_rocks_text ?? '',
  })

  function set(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  function addChip() {
    const v = chipInput.trim()
    if (!v || formData.core_values.includes(v)) { setChipInput(''); return }
    set('core_values', [...formData.core_values, v])
    setChipInput('')
  }

  function removeChip(idx) {
    set('core_values', formData.core_values.filter((_, i) => i !== idx))
  }

  function handleChipKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); addChip() }
  }

  async function handleComplete() {
    setSaving(true)
    await onComplete({ ...formData, is_complete: true })
    setSaving(false)
  }

  const canNext = () => {
    if (step === 1) return formData.core_values.length > 0
    if (step === 2) return formData.core_focus.trim().length > 0
    if (step === 3) return formData.ten_year_target.trim().length > 0
    if (step === 4) return formData.marketing_strategy.trim().length > 0
    if (step === 5) return formData.three_year_picture.trim().length > 0
    if (step === 6) return formData.one_year_plan.trim().length > 0
    if (step === 7) return formData.quarterly_rocks_text.trim().length > 0
    return true
  }

  const currentStepMeta = STEPS[step - 1]

  return (
    <div className="fade-in">
      <ProgressBar currentStep={step} totalSteps={8} />

      <div className="card" style={{ padding: 'var(--space-8)' }}>
        {/* Encabezado del paso */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 'var(--radius-full)',
              background: 'var(--eos-vision)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '0.9rem', flexShrink: 0,
            }}>
              {step}
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {currentStepMeta.title}
            </h2>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginLeft: 44 }}>
            {currentStepMeta.subtitle}
          </p>
        </div>

        {/* Contenido por paso */}
        <div style={{ minHeight: 220 }}>

          {/* Paso 1 — Valores Centrales */}
          {step === 1 && (
            <div>
              <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <input
                  className="form-input"
                  placeholder="Escribe un valor y presiona Enter o Agregar..."
                  value={chipInput}
                  onChange={e => setChipInput(e.target.value)}
                  onKeyDown={handleChipKeyDown}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary" onClick={addChip} style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                  <Plus size={16} /> Agregar
                </button>
              </div>
              {formData.core_values.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Aún no has agregado valores. Ejemplos: Integridad, Excelencia, Seguridad...
                </p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {formData.core_values.map((v, i) => (
                    <ValueChip key={i} value={v} onRemove={() => removeChip(i)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Paso 2 — Enfoque Central */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <div>
                <label className="form-label">Propósito / Causa Central</label>
                <textarea
                  className="form-input"
                  rows={4}
                  placeholder="¿Por qué existe IC Constructora más allá de ganar dinero? ¿Qué impacto tiene en sus clientes y comunidad?"
                  value={formData.core_focus}
                  onChange={e => set('core_focus', e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div>
                <label className="form-label">Nicho — ¿En qué son los mejores?</label>
                <input
                  className="form-input"
                  placeholder="Ej: Construcción industrial en el noreste de México para manufactura automotriz"
                  value={formData.niche}
                  onChange={e => set('niche', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Paso 3 — Meta a 10 Años */}
          {step === 3 && (
            <div>
              <label className="form-label">Describe la meta a 10 años</label>
              <textarea
                className="form-input"
                rows={7}
                placeholder="Ej: Ser la constructora industrial número uno del noreste de México, con presencia en 5 estados y más de $500 millones en proyectos anuales."
                value={formData.ten_year_target}
                onChange={e => set('ten_year_target', e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
          )}

          {/* Paso 4 — Estrategia de Marketing */}
          {step === 4 && (
            <div>
              <label className="form-label">Estrategia de Marketing</label>
              <textarea
                className="form-input"
                rows={7}
                placeholder="¿Quién es el cliente ideal de IC Constructora? ¿Qué los hace únicos frente a la competencia? ¿Cuál es su garantía o promesa diferenciadora?"
                value={formData.marketing_strategy}
                onChange={e => set('marketing_strategy', e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
          )}

          {/* Paso 5 — Imagen a 3 Años */}
          {step === 5 && (
            <div>
              <label className="form-label">¿Cómo luce IC Constructora en 3 años?</label>
              <textarea
                className="form-input"
                rows={7}
                placeholder="Describe ingresos esperados, número de empleados, proyectos en cartera, presencia geográfica, reconocimientos o certificaciones clave, cultura organizacional..."
                value={formData.three_year_picture}
                onChange={e => set('three_year_picture', e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
          )}

          {/* Paso 6 — Plan a 1 Año */}
          {step === 6 && (
            <div>
              <label className="form-label">Objetivos para este año (3–7)</label>
              <textarea
                className="form-input"
                rows={7}
                placeholder="Lista los 3 a 7 objetivos más importantes para este año. Sé específico y medible. Ej:&#10;1. Cerrar $120M en contratos nuevos&#10;2. Certificar ISO 9001&#10;3. Reducir accidentes a cero&#10;..."
                value={formData.one_year_plan}
                onChange={e => set('one_year_plan', e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
          )}

          {/* Paso 7 — Rocas del Trimestre */}
          {step === 7 && (
            <div>
              <label className="form-label">Rocas del Trimestre Actual</label>
              <textarea
                className="form-input"
                rows={7}
                placeholder="¿Cuáles son las 3–7 prioridades más importantes de este trimestre? Ej:&#10;1. Terminar etapa 2 del proyecto Ternium&#10;2. Contratar 2 ingenieros de proyectos&#10;3. Implementar sistema de costeo por obra&#10;..."
                value={formData.quarterly_rocks_text}
                onChange={e => set('quarterly_rocks_text', e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>
          )}

          {/* Paso 8 — Revisión Final */}
          {step === 8 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <ReviewRow label="Valores Centrales">
                {formData.core_values.length === 0
                  ? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin valores definidos</span>
                  : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {formData.core_values.map((v, i) => <ValueChip key={i} value={v} />)}
                    </div>
                }
              </ReviewRow>
              <ReviewRow label="Propósito / Enfoque Central">
                <p style={{ whiteSpace: 'pre-wrap' }}>{formData.core_focus || '—'}</p>
                {formData.niche && <p style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Nicho: {formData.niche}</p>}
              </ReviewRow>
              <ReviewRow label="Meta a 10 Años">
                <p style={{ whiteSpace: 'pre-wrap' }}>{formData.ten_year_target || '—'}</p>
              </ReviewRow>
              <ReviewRow label="Estrategia de Marketing">
                <p style={{ whiteSpace: 'pre-wrap' }}>{formData.marketing_strategy || '—'}</p>
              </ReviewRow>
              <ReviewRow label="Imagen a 3 Años">
                <p style={{ whiteSpace: 'pre-wrap' }}>{formData.three_year_picture || '—'}</p>
              </ReviewRow>
              <ReviewRow label="Plan a 1 Año">
                <p style={{ whiteSpace: 'pre-wrap' }}>{formData.one_year_plan || '—'}</p>
              </ReviewRow>
              <ReviewRow label="Rocas del Trimestre">
                <p style={{ whiteSpace: 'pre-wrap' }}>{formData.quarterly_rocks_text || '—'}</p>
              </ReviewRow>
            </div>
          )}
        </div>

        {/* Navegación */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-8)', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            className="btn btn-ghost"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 1}
            style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: step === 1 ? 0.3 : 1 }}
          >
            <ChevronLeft size={18} /> Anterior
          </button>

          <div style={{ display: 'flex', gap: 6 }}>
            {STEPS.map(s => (
              <div key={s.id} style={{
                width: s.id === step ? 20 : 8,
                height: 8,
                borderRadius: 'var(--radius-full)',
                background: s.id < step ? 'var(--brand-primary)' : s.id === step ? 'var(--eos-vision)' : 'var(--border-medium)',
                transition: 'all 0.3s',
              }} />
            ))}
          </div>

          {step < 8 ? (
            <button
              className="btn btn-primary"
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: canNext() ? 1 : 0.4 }}
            >
              Siguiente <ChevronRight size={18} />
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={handleComplete}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--status-success)', borderColor: 'var(--status-success)' }}
            >
              {saving ? 'Guardando…' : <><CheckCircle2 size={18} /> Completar V/TO</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Vista completa del V/TO ──────────────────────────────────────────────────
function VTOView({ vto, onEdit }) {
  const sections = [
    { label: 'Propósito / Enfoque Central', value: vto.core_focus },
    { label: 'Nicho', value: vto.niche },
    { label: 'Meta a 10 Años', value: vto.ten_year_target },
    { label: 'Estrategia de Marketing', value: vto.marketing_strategy },
    { label: 'Imagen a 3 Años', value: vto.three_year_picture },
    { label: 'Plan a 1 Año', value: vto.one_year_plan },
    { label: 'Rocas del Trimestre', value: vto.quarterly_rocks_text },
  ]

  return (
    <div className="fade-in">
      {/* Banner de completado */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
        padding: 'var(--space-4) var(--space-6)',
        background: 'rgba(59,130,246,0.08)',
        border: '1px solid rgba(59,130,246,0.25)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: 'var(--space-6)',
      }}>
        <CheckCircle2 size={22} style={{ color: 'var(--eos-vision)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>V/TO Completo</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>La visión de IC Constructora está definida. Revísala y actualízala cada trimestre.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onEdit} style={{ whiteSpace: 'nowrap' }}>
          Editar V/TO
        </button>
      </div>

      {/* Valores Centrales — full width */}
      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <h3 className="card-title" style={{ marginBottom: 'var(--space-4)', color: 'var(--eos-vision)' }}>
          Valores Centrales
        </h3>
        {(!vto.core_values || vto.core_values.length === 0) ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No definidos</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {vto.core_values.map((v, i) => <ValueChip key={i} value={v} gold />)}
          </div>
        )}
      </div>

      {/* Secciones en grid 2 columnas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-5)' }}>
        {sections.map(s => (
          <div key={s.label} className="card">
            <h3 style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--eos-vision)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-3)' }}>
              {s.label}
            </h3>
            {s.value ? (
              <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {s.value}
              </p>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No definido</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function VisionPage() {
  const { vto, saveVTO, isDemoMode } = useApp()
  const [editMode, setEditMode] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [activeTab, setActiveTab] = useState('modulo')

  const showWizard = editMode || !vto?.is_complete

  async function handleSave(data) {
    setSaveError(null)
    const { success, error } = await saveVTO(data)
    if (success) {
      setEditMode(false)
    } else {
      setSaveError(error || 'Error al guardar. Intenta de nuevo.')
    }
  }

  return (
    <div className="fade-in">
      {/* Tab selector */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 'var(--space-5)', borderBottom: '1px solid var(--border-subtle)' }}>
        {[['modulo', 'Visión'], ['guia', 'Guía EOS']].map(([k, l]) => (
          <button key={k} onClick={() => setActiveTab(k)} style={{
            padding: 'var(--space-3) var(--space-5)', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: 600,
            color: activeTab === k ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: `2px solid ${activeTab === k ? 'var(--brand-primary)' : 'transparent'}`,
            marginBottom: -1,
          }}>{l}</button>
        ))}
      </div>

      {activeTab === 'modulo' && (
        <div>
          {/* Page Header */}
          <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
            <div>
              <h1 className="page-title">
                <div className="page-title-icon" style={{ background: 'var(--eos-vision)' }}>
                  <Eye size={22} color="white" />
                </div>
                Visión — V/TO
              </h1>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: 'var(--space-2)', marginLeft: 44 }}>
                Vision/Traction Organizer de IC Constructora
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              {isDemoMode && (
                <span style={{
                  fontSize: '0.75rem',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(232,160,32,0.15)',
                  color: 'var(--brand-primary)',
                  border: '1px solid rgba(232,160,32,0.3)',
                  fontWeight: 600,
                }}>
                  Modo Demo
                </span>
              )}
              {vto?.is_complete && !editMode && (
                <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  Editar V/TO
                </button>
              )}
              {editMode && (
                <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(false)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <X size={15} /> Cancelar edición
                </button>
              )}
            </div>
          </div>

          {/* Error de guardado */}
          {saveError && (
            <div style={{
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-5)',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--status-error)',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-4)',
            }}>
              <span>{saveError}</span>
              <button onClick={() => setSaveError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex' }}>
                <X size={16} />
              </button>
            </div>
          )}

          {/* Contenido principal */}
          {showWizard ? (
            <VTOWizard
              key={editMode ? 'edit' : 'new'}
              initialData={vto}
              onComplete={handleSave}
            />
          ) : (
            <VTOView vto={vto} onEdit={() => setEditMode(true)} />
          )}
        </div>
      )}
      {activeTab === 'guia' && <GuiaEOS module="vision" />}
    </div>
  )
}
