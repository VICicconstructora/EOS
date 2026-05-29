import React, { useState } from 'react';
import KpiDashboard from '../components/kpi/KpiDashboard';
import { KpisProyectosChart } from '../components/charts/KpisProyectosChart';
import { FlujosHistoricoChart } from '../components/charts/FlujosHistoricoChart';
import ProyectosResumenTable from '../components/kpi/ProyectosResumenTable';
import { useTranslation } from 'react-i18next';

export default function KpisPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('estrategicos');

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Indicadores Estratégicos</h1>
          <p className="text-slate-500 mt-1">Navegación en cascada de KPIs organizacionales</p>
        </div>
      </div>

      <div className="mb-4 flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('estrategicos')}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'estrategicos'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          KPIs Estratégicos
        </button>
        <button
          onClick={() => setActiveTab('proyectos')}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'proyectos'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          KPIs Proyectos (Financiero)
        </button>
        <button
          onClick={() => setActiveTab('historico')}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'historico'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Flujos Históricos
        </button>
        <button
          onClick={() => setActiveTab('resumen')}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'resumen'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Resumen Proyectos
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        {activeTab === 'estrategicos' && <KpiDashboard />}
        {activeTab === 'proyectos' && <KpisProyectosChart />}
        {activeTab === 'historico' && <FlujosHistoricoChart />}
        {activeTab === 'resumen' && <ProyectosResumenTable />}
      </div>
    </div>
  );
}
