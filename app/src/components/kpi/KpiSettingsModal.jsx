import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { flattenKpiTree } from '../../utils/kpiHelpers';

export const KpiSettingsModal = ({ isOpen, onClose, data, onSave }) => {
  const [flatKpis, setFlatKpis] = useState([]);
  const [selectedKpiId, setSelectedKpiId] = useState('');
  
  // Form State
  const [ruleType, setRuleType] = useState('higher_is_better');
  const [greenThreshold, setGreenThreshold] = useState('');
  const [yellowThreshold, setYellowThreshold] = useState('');

  useEffect(() => {
    if (isOpen) {
      const flattened = flattenKpiTree(data);
      setFlatKpis(flattened);
      if (flattened.length > 0 && !selectedKpiId) {
        handleKpiSelect(flattened[0].id, flattened);
      }
    }
  }, [isOpen, data]);

  const handleKpiSelect = (id, list = flatKpis) => {
    setSelectedKpiId(id);
    const kpi = list.find(k => k.id === id);
    if (kpi) {
      setRuleType(kpi.rules.type);
      setGreenThreshold(kpi.rules.green.toString());
      setYellowThreshold(kpi.rules.yellow.toString());
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(selectedKpiId, {
      type: ruleType,
      green: Number(greenThreshold),
      yellow: Number(yellowThreshold)
    });
    onClose();
  };

  if (!isOpen) return null;

  const selectedKpi = flatKpis.find(k => k.id === selectedKpiId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          <X size={20} />
        </button>
        
        <h2 className="text-xl font-bold text-slate-800 mb-6">Configurar Reglas de KPI</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Seleccionar Indicador
            </label>
            <select 
              value={selectedKpiId}
              onChange={(e) => handleKpiSelect(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-indigo-500"
            >
              {flatKpis.map(kpi => (
                <option key={kpi.id} value={kpi.id}>
                  {kpi.title} (Actual: {kpi.currentValue})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-4">
            <p className="text-sm text-slate-600 mb-3">
              Define los umbrales para que el indicador cambie de color.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Comportamiento
                </label>
                <select 
                  value={ruleType}
                  onChange={(e) => setRuleType(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 outline-none focus:border-indigo-500"
                >
                  <option value="higher_is_better">Mayor es mejor (Ej: Ventas, Ingresos)</option>
                  <option value="lower_is_better">Menor es mejor (Ej: Defectos, Rotación)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-green-600 mb-1 flex items-center">
                    <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                    Umbral Verde
                  </label>
                  <input 
                    type="number" 
                    value={greenThreshold}
                    onChange={(e) => setGreenThreshold(e.target.value)}
                    className="w-full border border-green-200 focus:border-green-500 rounded-lg p-2.5 outline-none"
                    required
                  />
                  <span className="text-xs text-slate-500 mt-1 block">
                    {ruleType === 'higher_is_better' ? 'Verde si es ≥ a este valor' : 'Verde si es ≤ a este valor'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-yellow-600 mb-1 flex items-center">
                    <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
                    Umbral Amarillo
                  </label>
                  <input 
                    type="number" 
                    value={yellowThreshold}
                    onChange={(e) => setYellowThreshold(e.target.value)}
                    className="w-full border border-yellow-200 focus:border-yellow-500 rounded-lg p-2.5 outline-none"
                    required
                  />
                  <span className="text-xs text-slate-500 mt-1 block">
                    {ruleType === 'higher_is_better' ? 'Amarillo si es ≥ a este valor' : 'Amarillo si es ≤ a este valor'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 mr-2"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              Guardar Reglas
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
