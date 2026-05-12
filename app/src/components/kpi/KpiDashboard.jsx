import React, { useState, useEffect } from 'react';
import { KpiCard } from './KpiCard';
import { KpiDrillModal } from './KpiDrillModal';
import { KpiSettingsModal } from './KpiSettingsModal';
import { KpiAiChat } from './KpiAiChat';
import { mockKpiTree } from '../../data/kpiMockData';
import { updateKpiRulesInTree, applyStoredRulesToTree } from '../../utils/kpiHelpers';
import { useKpis } from '../../lib/useKpis';
import { Settings, Database, FlaskConical, AlertCircle, Sparkles } from 'lucide-react';
import { useTramitesFrancisco } from '../../lib/useTramitesFrancisco';
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
  const allLevels = [...new Set(data.flatMap(nodeLevels))].sort((a, b) => a - b)
  return (
    <div className="kpi-levels">
      {allLevels.map((lvl, idx) => (
        <div key={lvl} className={`kpi-level-section ${idx > 0 ? 'kpi-level-section--nested' : ''}`}>
          <div className="kpi-row">
            {data.filter(n => nodeLevels(n).includes(lvl)).map(node => {
              const displayNode = node.levelOwners?.[lvl]
                ? { ...node, owner: node.levelOwners[lvl] }
                : node
              return (
                <KpiCard
                  key={`${node.id}-${lvl}`}
                  node={displayNode}
                  isExpanded={false}
                  onClick={onCardClick}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export const KpiDashboard = () => {
  const [mode, setMode] = useState('real') // 'real' | 'mock'
  const [overrides, setOverrides] = useState(loadOverrides)
  const [data, setData] = useState([])
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [drillRoot, setDrillRoot] = useState(null) // nodo cuyo contenido se muestra en el modal

  const { tree: realTree, loading, error, isConfigured } = useKpis('total')
  const { nodes: franciscoNodes } = useTramitesFrancisco()

  // Si no está configurado el Supabase IC, forzar mock
  useEffect(() => {
    if (!isConfigured && mode === 'real') setMode('mock')
  }, [isConfigured])

  // Reconstruir el árbol cuando cambia el modo o llegan datos
  useEffect(() => {
    const baseTree = mode === 'real' ? realTree : mockKpiTree
    if (baseTree && baseTree.length > 0) {
      const withFrancisco = franciscoNodes.length > 0
        ? [...baseTree, ...franciscoNodes]
        : baseTree
      setData(applyStoredRulesToTree(withFrancisco, overrides))
    } else {
      setData([])
    }
  }, [mode, realTree, overrides, franciscoNodes])

  const handleSaveRules = (kpiId, newRules) => {
    const next = { ...overrides, [kpiId]: newRules }
    setOverrides(next)
    saveOverrides(next)
    setData(updateKpiRulesInTree(data, kpiId, newRules))
  }

  const handleCardClick = (node) => {
    if (node.children && node.children.length > 0) {
      setDrillRoot(node)
    }
  }

  return (
    <div className="kpi-dashboard relative">
      <div className="flex flex-wrap justify-between items-center mb-8 gap-3">
        <h1 className="kpi-dashboard-title m-0">Dashboard Corporativo en Cascada</h1>

        <div className="flex items-center gap-2">
          {/* Toggle Real/Mock */}
          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden bg-white shadow-sm">
            <button
              onClick={() => setMode('real')}
              disabled={!isConfigured}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
                mode === 'real'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              } ${!isConfigured ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isConfigured ? 'Datos reales desde Supabase IC' : 'Supabase IC no configurado'}
            >
              <Database size={16} />
              Real
            </button>
            <button
              onClick={() => setMode('mock')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
                mode === 'mock'
                  ? 'bg-amber-500 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
              title="Datos mock para demo / preview de la UI"
            >
              <FlaskConical size={16} />
              Demo
            </button>
          </div>

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

      {/* Estado: error real → ofrecer caer a mock */}
      {mode === 'real' && error && (
        <div className="mb-4 flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <strong>No se pudieron cargar los KPIs reales:</strong> {error.message || String(error)}.
            Cambia a modo Demo o revisa la configuración de Supabase IC.
          </div>
        </div>
      )}

      {!isConfigured && (
        <div className="mb-4 flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
          <div>
            Supabase IC no está configurado (faltan <code>VITE_SUPABASE_IC_URL</code> y <code>VITE_SUPABASE_IC_ANON_KEY</code> en <code>.env</code>). Mostrando datos demo.
          </div>
        </div>
      )}

      {mode === 'real' && loading ? (
        <p className="text-slate-500">Cargando indicadores reales...</p>
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
