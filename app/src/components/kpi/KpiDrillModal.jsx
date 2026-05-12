import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, X, ChevronRight } from 'lucide-react'
import { KpiCard } from './KpiCard'
import './kpi.css'

// Modal de drill-down. Recibe el nodo raíz (rootNode) cuyo CONTENIDO se va a
// mostrar (sus hijos). Internamente mantiene un stack [rootNode, ...] y permite
// avanzar (cuando un hijo tiene a su vez hijos) y retroceder.
export const KpiDrillModal = ({ isOpen, rootNode, onClose }) => {
  const [stack, setStack] = useState([])

  // Reset cuando cambia el rootNode o se abre
  useEffect(() => {
    if (isOpen && rootNode) {
      setStack([rootNode])
    } else if (!isOpen) {
      setStack([])
    }
  }, [isOpen, rootNode])

  // ESC para cerrar
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const current = stack[stack.length - 1]
  const children = current?.children || []

  const handleCardClick = (node) => {
    if (node.children && node.children.length > 0) {
      setStack(prev => [...prev, node])
    }
  }

  const handleBack = () => {
    setStack(prev => prev.length > 1 ? prev.slice(0, -1) : prev)
  }

  if (!isOpen || !current) return null

  return createPortal(
    <div className="kpi-modal-overlay" onClick={onClose}>
      <div
        className="kpi-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kpi-modal-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="kpi-modal-header">
          <div className="kpi-modal-breadcrumb">
            {stack.map((n, i) => (
              <React.Fragment key={n.id}>
                {i > 0 && <ChevronRight size={14} className="kpi-modal-crumb-sep" />}
                <button
                  type="button"
                  className={`kpi-modal-crumb ${i === stack.length - 1 ? 'is-current' : ''}`}
                  onClick={() => setStack(prev => prev.slice(0, i + 1))}
                  disabled={i === stack.length - 1}
                >
                  {n.title}
                </button>
              </React.Fragment>
            ))}
          </div>

          <div className="kpi-modal-actions">
            {stack.length > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="kpi-modal-icon-btn"
                aria-label="Volver"
                title="Volver"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="kpi-modal-icon-btn"
              aria-label="Cerrar"
              title="Cerrar (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="kpi-modal-subtitle">
          <h2 id="kpi-modal-title">{current.title}</h2>
          {current.owner && <span className="kpi-modal-owner">{current.owner}</span>}
        </div>

        <div className="kpi-modal-body">
          {children.length === 0 ? (
            <div className="kpi-modal-empty">Sin desglose disponible.</div>
          ) : (
            <div className="kpi-modal-grid">
              {children.map(child => (
                <KpiCard
                  key={child.id}
                  node={child}
                  isExpanded={false}
                  onClick={handleCardClick}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default KpiDrillModal
