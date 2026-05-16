import React, { useState, useEffect } from 'react';
import { KpiCard } from './KpiCard';
import { KpiDrillModal } from './KpiDrillModal';
import { KpiSettingsModal } from './KpiSettingsModal';
import { KpiAiChat } from './KpiAiChat';
import { updateKpiRulesInTree, applyStoredRulesToTree } from '../../utils/kpiHelpers';
import { useKpis } from '../../lib/useKpis';
import { Settings, AlertCircle, Sparkles } from 'lucide-react';
import { useTramitesFrancisco } from '../../lib/useTramitesFrancisco';
import { useProgramacionObra } from '../../lib/useProgramacionObra';
import { useProgramacionIntermedia } from '../../lib/useProgramacionIntermedia';
import './kpi.css';

const STORAGE_KEY = 'ic_kpi_rules_overrides_v1'

const loadOverrides = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}
const saveOverrides = (o) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(o)) } catch {}
}

const nodeLevels = (n) => {
  const lvl = n.level
  if (!lvl) return [1]
  return Array.isArray(lvl) ? lvl : [lvl]
}

const KpiLevelRows = ({ data, onCardClick }) => {
  // expandedByLevel[N] = id del nodo expandido en el nivel N
  // Nivel 1: cualquier expansión → muestra todos los nodos de nivel 2 sin parentId
  // Nivel 2+: solo muestra hijos cuyo cascadeParentId coincide con el nodo expandido
  const [expandedByLevel, setExpandedByLevel] = useState({})

  const allLevels = [...new Set(data.flatMap(nodeLevels))].sort((a, b) => a - b)
  const firstLvl = allLevels[0] ?? 1

  // Devuelve el id del padre en cascada para un nodo en un nivel dado
  const getCascadeParentId = (node, lvl) =>
    node.cascadeParentIds?.[lvl] ?? node.cascadeParentId ?? null

  // Nodos a mostrar para un nivel específico, filtrados por padre expandido
  const getNodesForLevel = (lvl) => {
    const nodesAtLevel = data.filter(n => nodeLevels(n).includes(lvl))
    if (lvl === firstLvl) return nodesAtLevel

    const lvlIdx = allLevels.indexOf(lvl)
    const prevLvl = allLevels[lvlIdx - 1]
    const expandedParentId = expandedByLevel[prevLvl]
    if (expandedParentId === undefined) return []

    if (lvl === firstLvl + 1) {
      // Nivel 2: se muestran todos los nodos sin restricción de padre
      return nodesAtLevel.filter(n => !getCascadeParentId(n, lvl))
    }

    // Nivel 3+: solo hijos del nodo expandido
    return nodesAtLevel.filter(n => getCascadeParentId(n, lvl) === expandedParentId)
  }

  const handleExpandClick = (lvl, nodeId) => {
    setExpandedByLevel(prev => {
      const next = { ...prev }
      if (next[lvl] === nodeId) {
        // Colapsar: eliminar este nivel y todos los inferiores
        const lvlIdx = allLevels.indexOf(lvl)
        allLevels.slice(lvlIdx).forEach(l => delete next[l])
      } else {
        // Expandir: fijar este nodo, limpiar niveles más profundos
        next[lvl] = nodeId
        const lvlIdx = allLevels.indexOf(lvl)
        allLevels.slice(lvlIdx + 1).forEach(l => delete next[l])
      }
      return next
    })
  }

  const visibleLevels = allLevels.filter(lvl => {
    if (lvl === firstLvl) return true
    const lvlIdx = allLevels.indexOf(lvl)
    const prevLvl = allLevels[lvlIdx - 1]
    return expandedByLevel[prevLvl] !== undefined
  })

  return (
    <div className="kpi-levels">
      {visibleLevels.map((lvl, idx) => {
        const rowNodes = getNodesForLevel(lvl)
        if (rowNodes.length === 0) return null
        const rowClass = rowNodes.length >= 7 ? 'kpi-row kpi-row--scroll' : 'kpi-row'
        const nextLvlIdx = allLevels.indexOf(lvl) + 1
        const nextLvl = nextLvlIdx < allLevels.length ? allLevels[nextLvlIdx] : null

        return (
          <div key={lvl} className={`kpi-level-section ${idx > 0 ? 'kpi-level-section--nested' : ''}`}>
            <div className={rowClass}>
              {rowNodes.map(node => {
                const displayNode = node.levelOwners?.[lvl]
                  ? { ...node, owner: node.levelOwners[lvl] }
                  : node

                const isExpanded = expandedByLevel[lvl] === node.id

                // Tiene hijos en el nivel siguiente?
                const hasChildrenBelow = nextLvl !== null && data.some(n => {
                  if (!nodeLevels(n).includes(nextLvl)) return false
                  if (nextLvl === firstLvl + 1) return !getCascadeParentId(n, nextLvl)
                  return getCascadeParentId(n, nextLvl) === node.id
                })

                return (
                  <KpiCard
                    key={`${node.id}-${lvl}`}
                    node={displayNode}
                    isExpanded={isExpanded}
                    onClick={onCardClick}
                    onExpandClick={hasChildrenBelow ? () => handleExpandClick(lvl, node.id) : null}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const KpiDashboard = () => {
  const [overrides, setOverrides] = useState(loadOverrides)
  const [data, setData] = useState([])
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [drillRoot, setDrillRoot] = useState(null)

  const { tree: realTree, loading, error, isConfigured } = useKpis('total')
  const { nodes: franciscoNodes } = useTramitesFrancisco()
  const { nodes: obraNodes } = useProgramacionObra()
  const { nodes: interMediaNodes } = useProgramacionIntermedia()

  // Reconstruir el árbol cuando llegan datos
  useEffect(() => {
    if (realTree && realTree.length > 0) {
      const merged = [...obraNodes, ...interMediaNodes, ...realTree, ...franciscoNodes]
      setData(applyStoredRulesToTree(merged, overrides))
    } else {
      setData([])
    }
  }, [realTree, overrides, franciscoNodes, obraNodes, interMediaNodes])

  const handleSaveRules = (kpiId, newRules) => {
    const next = { ...overrides, [kpiId]: newRules }
    setOverrides(next)
    saveOverrides(next)
    setData(updateKpiRulesInTree(data, kpiId, newRules))
  }

  const handleCardClick = (node) => {
    setDrillRoot(node)
  }

  return (
    <div className="kpi-dashboard relative">
      <div className="flex flex-wrap justify-between items-center mb-8 gap-3">
        <h1 className="kpi-dashboard-title m-0">Dashboard Corporativo en Cascada</h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsChatOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors"
          >
            <Sparkles size={16} />
            <span>Consultar IA</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <Settings size={18} />
            <span>Configurar Reglas</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <strong>No se pudieron cargar los KPIs:</strong> {error.message || String(error)}.
            Revisa la configuración de Supabase IC.
          </div>
        </div>
      )}

      {!isConfigured && (
        <div className="mb-4 flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <div>
            Supabase IC no está configurado (faltan <code>VITE_SUPABASE_IC_URL</code> y <code>VITE_SUPABASE_IC_ANON_KEY</code> en <code>.env</code>).
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-slate-500">Cargando indicadores...</p>
      ) : data.length > 0 ? (
        <KpiLevelRows data={data} onCardClick={handleCardClick} />
      ) : (
        <p className="text-slate-500">Sin datos para mostrar.</p>
      )}

      <KpiDrillModal
        isOpen={!!drillRoot}
        rootNode={drillRoot}
        onClose={() => setDrillRoot(null)}
      />

      <KpiSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        data={data}
        onSave={handleSaveRules}
      />

      <KpiAiChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        kpiData={data}
      />
    </div>
  );
};

export default KpiDashboard;
