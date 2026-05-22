import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';

export function FlujosHistoricoChart() {
  const { t, isDemoMode } = useApp();
  const [flujoData, setFlujoData] = useState([]);
  const [anualesData, setAnualesData] = useState([]);
  const [selectedProyecto, setSelectedProyecto] = useState('todos');
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [isDemoMode]);

  async function loadData() {
    setLoading(true);
    try {
      if (isDemoMode) {
        // Datos mock para demo
        setFlujoData(generateMockFlujosData());
        setAnualesData(generateMockAnualesData());
        setProyectos(['Bosque Central CBR', 'Gaia CBR', 'Praia Natura CBR']);
      } else {
        // Cargar desde Supabase
        if (!supabase) {
          setFlujoData(generateMockFlujosData());
          setAnualesData(generateMockAnualesData());
          setProyectos(['Bosque Central CBR', 'Gaia CBR', 'Praia Natura CBR']);
          return;
        }

        // Obtener flujos mensuales
        const { data: flujosList, error: flujoError } = await supabase
          .from('vw_flujo_real_vs_proyeccion')
          .select('*')
          .eq('company_id', 'ic-constructora')
          .order('fecha_periodo', { ascending: false });

        if (flujoError) throw flujoError;

        // Obtener flujos anuales
        const { data: anualesList, error: anualesError } = await supabase
          .from('vw_flujo_anual_proyectos')
          .select('*')
          .eq('company_id', 'ic-constructora')
          .order('año', { ascending: false });

        if (anualesError) throw anualesError;

        setFlujoData(flujosList || []);
        setAnualesData(anualesList || []);

        // Extraer proyectos únicos
        const uniqueProyectos = [...new Set(flujosList?.map(f => f.proyecto) || [])];
        setProyectos(uniqueProyectos);
      }
    } catch (error) {
      console.error('Error loading flujo data:', error);
      setFlujoData(generateMockFlujosData());
      setAnualesData(generateMockAnualesData());
    } finally {
      setLoading(false);
    }
  }

  function generateMockFlujosData() {
    return [
      { proyecto: 'Bosque Central CBR', fecha_periodo: '2025-12', flujo_real: 125000000, flujo_proyeccion: 120000000, varianza: 5000000, porcentaje_varianza: 4.17 },
      { proyecto: 'Bosque Central CBR', fecha_periodo: '2025-11', flujo_real: 115000000, flujo_proyeccion: 118000000, varianza: -3000000, porcentaje_varianza: -2.54 },
      { proyecto: 'Gaia CBR', fecha_periodo: '2025-12', flujo_real: 95000000, flujo_proyeccion: 92000000, varianza: 3000000, porcentaje_varianza: 3.26 },
      { proyecto: 'Gaia CBR', fecha_periodo: '2025-11', flujo_real: 88000000, flujo_proyeccion: 90000000, varianza: -2000000, porcentaje_varianza: -2.22 },
    ];
  }

  function generateMockAnualesData() {
    return [
      { proyecto: 'Bosque Central CBR', año: 2025, flujo_real_anual: 1450000000, flujo_proyeccion_anual: 1430000000, varianza_anual: 20000000, periodos_reales: 12, periodos_proyectados: 12 },
      { proyecto: 'Gaia CBR', año: 2025, flujo_real_anual: 1120000000, flujo_proyeccion_anual: 1100000000, varianza_anual: 20000000, periodos_reales: 12, periodos_proyectados: 12 },
      { proyecto: 'Praia Natura CBR', año: 2025, flujo_real_anual: 890000000, flujo_proyeccion_anual: 900000000, varianza_anual: -10000000, periodos_reales: 12, periodos_proyectados: 12 },
    ];
  }

  const filteredFlujoCurrent = selectedProyecto === 'todos'
    ? flujoData.slice(0, 12)
    : flujoData.filter(f => f.proyecto === selectedProyecto).slice(0, 12);

  const filteredAnuales = selectedProyecto === 'todos'
    ? anualesData
    : anualesData.filter(f => f.proyecto === selectedProyecto);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Cargando datos...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Controles */}
      <div className="flex gap-4 items-center">
        <label className="text-sm font-medium text-slate-700">Filtrar por Proyecto:</label>
        <select
          value={selectedProyecto}
          onChange={(e) => setSelectedProyecto(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="todos">Todos los proyectos</option>
          {proyectos.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* Flujos Mensuales */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Flujos Mensuales: Real vs Proyección</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={filteredFlujoCurrent}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha_periodo" />
            <YAxis />
            <Tooltip
              formatter={(value) => value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
            />
            <Legend />
            <Line type="monotone" dataKey="flujo_real" stroke="#10b981" name="Flujo Real" strokeWidth={2} />
            <Line type="monotone" dataKey="flujo_proyeccion" stroke="#3b82f6" name="Flujo Proyección" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Varianza Mensual */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Varianza Mensual (Real - Proyección)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={filteredFlujoCurrent}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha_periodo" />
            <YAxis />
            <Tooltip
              formatter={(value) => value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
            />
            <Bar dataKey="varianza" fill="#ef4444" name="Varianza" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Anuales */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Flujos Anuales por Proyecto</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={filteredAnuales}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="proyecto" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip
              formatter={(value) => value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
            />
            <Legend />
            <Bar dataKey="flujo_real_anual" fill="#10b981" name="Real Anual" />
            <Bar dataKey="flujo_proyeccion_anual" fill="#3b82f6" name="Proyección Anual" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla Resumen */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Resumen Actual (Últimos 3 Períodos)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-200">
              <tr>
                <th className="text-left px-4 py-2">Proyecto</th>
                <th className="text-right px-4 py-2">Período</th>
                <th className="text-right px-4 py-2">Flujo Real</th>
                <th className="text-right px-4 py-2">Proyección</th>
                <th className="text-right px-4 py-2">Varianza</th>
                <th className="text-right px-4 py-2">% Varianza</th>
              </tr>
            </thead>
            <tbody>
              {filteredFlujoCurrent.slice(0, 3).map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-100'}>
                  <td className="px-4 py-2">{row.proyecto}</td>
                  <td className="text-right px-4 py-2">{row.fecha_periodo}</td>
                  <td className="text-right px-4 py-2 text-green-700 font-medium">
                    {(row.flujo_real / 1000000).toFixed(1)}M
                  </td>
                  <td className="text-right px-4 py-2 text-blue-700 font-medium">
                    {(row.flujo_proyeccion / 1000000).toFixed(1)}M
                  </td>
                  <td className="text-right px-4 py-2 font-medium">
                    <span className={row.varianza >= 0 ? 'text-green-700' : 'text-red-700'}>
                      {(row.varianza / 1000000).toFixed(1)}M
                    </span>
                  </td>
                  <td className="text-right px-4 py-2 font-medium">
                    <span className={row.porcentaje_varianza >= 0 ? 'text-green-700' : 'text-red-700'}>
                      {row.porcentaje_varianza?.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
