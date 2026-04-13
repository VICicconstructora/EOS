// src/components/guia/GuiaEOS.jsx
// Componente reutilizable — tab educativo para los 6 módulos EOS
import { Link } from 'react-router-dom'
import { BookOpen, ArrowRight } from 'lucide-react'

const GUIA_CONTENT = {
  vision: {
    color: 'var(--eos-vision)',
    que_es: 'El componente Visión define a dónde va IC Constructora y cómo llegar. Se captura en el V/TO (Vision/Traction Organizer) — un documento de dos páginas que responde las 8 preguntas fundamentales del negocio.',
    para_que: 'Alinear a todo el equipo hacia los mismos valores, propósito y metas. Cuando la visión está clara y compartida, las decisiones cotidianas se toman más rápido y en la misma dirección.',
    conceptos: ['Core Values — valores no negociables', 'Core Focus — propósito + nicho', '10-Year Target — la gran meta', 'Marketing Strategy — cliente ideal y propuesta única', '3-Year Picture — imagen vivida del futuro', '1-Year Plan — objetivos del año'],
    accion: { label: 'Completar el V/TO', link: '/vision' },
    marco: 'vto',
  },
  personas: {
    color: 'var(--eos-people)',
    que_es: 'El componente Personas se basa en un principio simple: necesitas a las personas correctas en los asientos correctos. Primero define qué asientos necesitas (Accountability Chart), luego evalúa si las personas correctas los ocupan (People Analyzer + GWC).',
    para_que: 'Eliminar la fricción que viene de tener personas incorrectas en roles equivocados. Una empresa con las personas correctas en los asientos correctos ejecuta hasta 3 veces más rápido.',
    conceptos: ['GWC — Entiende / Quiere / Puede', 'Accountability Chart — quién es responsable de qué', 'People Analyzer — evaluación objetiva del equipo', 'Visionary vs Integrator — los dos roles clave', 'Right people, right seats'],
    accion: { label: 'Ver el equipo directivo', link: '/personas' },
    marco: 'accountability-chart',
  },
  datos: {
    color: 'var(--eos-data)',
    que_es: 'El componente Datos elimina la gestión por opiniones y la reemplaza por números. El Scorecard semanal da visibilidad temprana de problemas antes de que se conviertan en crisis. Cada directivo reporta una métrica clave cada semana.',
    para_que: 'Saber en tiempo real si el negocio está en buen camino. Un semáforo en amarillo puede corregirse; uno en rojo ya es crisis. El Scorecard da la visibilidad que los reportes mensuales no pueden dar.',
    conceptos: ['Scorecard semanal — 5 a 15 métricas', 'Semáforo verde / amarillo / rojo', 'Métricas predictivas vs. históricas', 'Una métrica por persona', 'Tendencia de 13 semanas'],
    accion: { label: 'Ver el Scorecard', link: '/datos' },
    marco: 'scorecard',
  },
  asuntos: {
    color: 'var(--eos-issues)',
    que_es: 'El componente Asuntos es donde la empresa resuelve sus problemas de forma sistemática. Todos los problemas, obstáculos, ideas y oportunidades van a una lista centralizada. En cada reunión L10 se priorizan y resuelven usando el proceso IDS.',
    para_que: 'Eliminar los elefantes en la habitación — esos problemas que todos conocen pero nadie aborda. El IDS asegura que los problemas se resuelvan para siempre, no solo se tapen temporalmente.',
    conceptos: ['IDS — Identificar, Discutir, Solucionar', 'Issues List — repositorio centralizado', 'Resolver para siempre, no tapar', 'Los asuntos son un regalo', 'Síntoma vs. problema real'],
    accion: { label: 'Ver la lista de asuntos', link: '/asuntos' },
    marco: 'issues-list',
  },
  procesos: {
    color: 'var(--eos-process)',
    que_es: 'El componente Procesos convierte el conocimiento tácito de las personas en procesos documentados que cualquiera puede seguir. Se enfoca en los 6 a 10 procesos medulares del negocio — los que, si se hacen bien y consistentemente, definen el éxito.',
    para_que: 'Crear consistencia y escalabilidad. Cuando los procesos están documentados y seguidos por todos, el negocio deja de depender de personas específicas para funcionar bien.',
    conceptos: ['Procesos medulares — los 6 a 10 críticos', 'Documentar — simplificar — implementar', '"Seguido por todos" es el estándar', 'Escalabilidad sin dependencia de personas', 'KPI por proceso'],
    accion: { label: 'Ver los procesos', link: '/procesos' },
    marco: 'process-documenter',
  },
  traccion: {
    color: 'var(--eos-traction)',
    que_es: 'El componente Tracción es la disciplina de ejecución. Convierte la visión en resultados concretos a través de dos herramientas: las Rocas (prioridades trimestrales) y el Meeting Pulse (reuniones estructuradas semanales, trimestrales y anuales).',
    para_que: 'Pasar del modo reactivo al proactivo. Sin Tracción, las empresas trabajan mucho pero avanzan poco porque todo parece urgente. Las Rocas crean el enfoque; el Meeting Pulse crea el ritmo.',
    conceptos: ['Rocas — 3 a 7 prioridades del trimestre', 'El mundo de 90 días', 'En camino / En riesgo — sin grises', 'Meeting Pulse — L10, trimestral, anual', 'L10 — 90 minutos, 6 segmentos'],
    accion: { label: 'Ver las Rocas del trimestre', link: '/traccion' },
    marco: 'meeting-pulse',
  },
}

export default function GuiaEOS({ module }) {
  const content = GUIA_CONTENT[module]
  if (!content) return null

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

      {/* Header educativo */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)', padding: 'var(--space-5)', background: `${content.color}08`, border: `1px solid ${content.color}20`, borderRadius: 'var(--radius-lg)' }}>
        <BookOpen size={22} style={{ color: content.color, flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: content.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Sistema EOS — Componente {module.charAt(0).toUpperCase() + module.slice(1)}
          </p>
          <p style={{ fontSize: '0.925rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>{content.que_es}</p>
        </div>
      </div>

      {/* Grid: Para qué sirve + Conceptos clave */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="card">
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--space-3)' }}>
            ¿Para qué sirve?
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.7 }}>{content.para_que}</p>
        </div>

        <div className="card">
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--space-3)' }}>
            Conceptos clave del libro
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {content.conceptos.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: content.color, flexShrink: 0, marginTop: 6 }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Links de acción */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <Link to={content.accion.link} className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowRight size={14} /> {content.accion.label}
        </Link>
        <Link to="/biblioteca" className="btn btn-ghost" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <BookOpen size={14} /> Ver marcos de referencia
        </Link>
      </div>

      {/* Referencia al libro */}
      <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${content.color}` }}>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Basado en <strong style={{ color: 'var(--text-primary)' }}>Tracción</strong> de Gino Wickman —
          el manual del sistema EOS (Entrepreneurial Operating System).
        </p>
      </div>
    </div>
  )
}
