// src/pages/BibliotecaPage.jsx — Frases del libro + Marcos de referencia
import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { FRASES_LIBRO, COMPONENTE_LABELS, COMPONENTE_COLORS } from '../data/frases-libro'
import { MARCOS } from '../data/marcos-referencia'

const MODULE_PATHS = { vision: '/vision', personas: '/personas', datos: '/datos', asuntos: '/asuntos', procesos: '/procesos', traccion: '/traccion' }

function FrasaCard({ frase }) {
  const color = COMPONENTE_COLORS[frase.componente] || 'var(--brand-primary)'
  return (
    <div style={{ padding: 'var(--space-4) var(--space-5)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', borderLeft: `4px solid ${color}` }}>
      <p style={{ fontSize: '0.925rem', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.7, marginBottom: 'var(--space-2)' }}>
        "{frase.texto}"
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{frase.capitulo}</span>
        <span style={{ padding: '1px 7px', borderRadius: 'var(--radius-full)', fontSize: '0.68rem', fontWeight: 600, color, background: `${color}15` }}>
          {COMPONENTE_LABELS[frase.componente]}
        </span>
        {frase.destacada && <span style={{ fontSize: '0.68rem', color: 'var(--brand-primary)' }}>⭐ Destacada</span>}
      </div>
    </div>
  )
}

function MarcoCard({ marco }) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()
  const color = COMPONENTE_COLORS[marco.componente] || 'var(--brand-primary)'

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4) var(--space-5)', cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
        <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{marco.icono}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{marco.nombre}</p>
          <span style={{ fontSize: '0.72rem', padding: '1px 7px', borderRadius: 'var(--radius-full)', color, background: `${color}15`, fontWeight: 600 }}>
            {COMPONENTE_LABELS[marco.componente]}
          </span>
        </div>
        {expanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: 'var(--space-5)', background: 'var(--bg-elevated)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>¿Qué es?</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.7 }}>{marco.que_es}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>¿Para qué sirve?</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.7 }}>{marco.para_que}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Conceptos clave</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {marco.conceptos.map((c, i) => (
                <div key={i} style={{ padding: 'var(--space-3)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.85rem', color, marginBottom: 3 }}>{c.term}</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{c.def}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>¿Cómo se usa?</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.7 }}>{marco.como_se_usa}</p>
          </div>
          {MODULE_PATHS[marco.componente] && (
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(MODULE_PATHS[marco.componente])} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowRight size={13} /> Ver módulo en la app
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function BibliotecaPage() {
  const [activeTab, setActiveTab] = useState('frases')
  const [componentFilter, setComponentFilter] = useState('all')
  const [search, setSearch] = useState('')

  const allComponents = ['all', 'vision', 'personas', 'datos', 'asuntos', 'procesos', 'traccion', 'general']

  const filteredFrases = FRASES_LIBRO.filter(f => {
    const matchComp = componentFilter === 'all' || f.componente === componentFilter
    const matchSearch = !search || f.texto.toLowerCase().includes(search.toLowerCase())
    return matchComp && matchSearch
  })

  const filteredMarcos = MARCOS.filter(m =>
    componentFilter === 'all' || componentFilter === 'general' || m.componente === componentFilter
  )

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">
          <div className="page-title-icon" style={{ background: 'rgba(232,160,32,0.1)' }}>
            <BookOpen size={24} style={{ color: 'var(--brand-primary)' }} />
          </div>
          <div>
            <h1>Biblioteca EOS</h1>
            <p style={{ marginTop: 4 }}>Frases clave y marcos de referencia del libro <em>Tracción</em> — Gino Wickman</p>
          </div>
        </div>
      </div>

      {/* Tabs principales */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 'var(--space-5)', borderBottom: '1px solid var(--border-subtle)' }}>
        {[['frases', `Frases del Libro (${FRASES_LIBRO.length})`], ['marcos', `Marcos de Referencia (${MARCOS.length})`]].map(([k, l]) => (
          <button key={k} onClick={() => setActiveTab(k)} style={{
            padding: 'var(--space-3) var(--space-5)', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: 600,
            color: activeTab === k ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: `2px solid ${activeTab === k ? 'var(--brand-primary)' : 'transparent'}`,
            marginBottom: -1,
          }}>{l}</button>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
          {allComponents.filter(c => activeTab === 'frases' || c !== 'general').map(c => (
            <button key={c} onClick={() => setComponentFilter(c)} style={{
              padding: 'var(--space-2) var(--space-3)', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.78rem', fontWeight: 600,
              color: componentFilter === c ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: `2px solid ${componentFilter === c ? (COMPONENTE_COLORS[c] || 'var(--brand-primary)') : 'transparent'}`,
              marginBottom: -1,
            }}>{c === 'all' ? 'Todos' : COMPONENTE_LABELS[c] || c}</button>
          ))}
        </div>
        {activeTab === 'frases' && (
          <input className="form-input" style={{ width: 220, padding: '6px 12px', fontSize: '0.82rem' }}
            placeholder="Buscar frase..." value={search} onChange={e => setSearch(e.target.value)} />
        )}
      </div>

      {/* Contenido */}
      {activeTab === 'frases' && (
        filteredFrases.length === 0 ? (
          <div className="card empty-state">
            <p style={{ color: 'var(--text-muted)' }}>No hay frases que coincidan con la búsqueda.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {filteredFrases.map(f => <FrasaCard key={f.id} frase={f} />)}
          </div>
        )
      )}

      {activeTab === 'marcos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filteredMarcos.map(m => <MarcoCard key={m.id} marco={m} />)}
        </div>
      )}
    </div>
  )
}
