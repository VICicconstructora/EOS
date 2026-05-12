import React from 'react';
import KpiDashboard from '../components/kpi/KpiDashboard';

export default function KpisPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Indicadores Estratégicos</h1>
          <p className="text-slate-500 mt-1">Navegación en cascada de KPIs organizacionales</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <KpiDashboard />
      </div>
    </div>
  );
}
