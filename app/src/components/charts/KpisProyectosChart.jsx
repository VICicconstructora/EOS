import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useKpisProyectos } from '../../lib/useKpisProyectos';
import { useTranslation } from 'react-i18next';

export function KpisProyectosChart() {
  const { t } = useTranslation();
  const { kpis, loading, error } = useKpisProyectos();

  if (loading) {
    return <div className="p-4 text-center">{t('cargando')}</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{t('error')}: {error}</div>;
  }

  if (!kpis || kpis.length === 0) {
    return <div className="p-4 text-gray-500">{t('sin_datos')}</div>;
  }

  const chartData = agruparPorProyecto(kpis);

  return (
    <div className="space-y-6">
      {Object.entries(chartData).map(([proyecto, datos]) => (
        <div key={proyecto} className="border rounded-lg p-4 bg-white">
          <h3 className="text-lg font-semibold mb-4">{proyecto}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={datos}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                label={{ value: 'TIR (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                formatter={(value) => value !== null ? `${value}%` : 'N/A'}
                labelFormatter={(label) => `Mes: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="tir_k"
                stroke="#2563eb"
                dot={{ r: 4 }}
                name="TIR K"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="tir_operativa"
                stroke="#7c3aed"
                dot={{ r: 4 }}
                name="TIR Operativa"
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ))}

      <div className="border rounded-lg p-4 bg-white">
        <h3 className="text-lg font-semibold mb-4">Comparativa General</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={kpis.map((k) => ({
            mes: k.fechaCalculo ? new Date(k.fechaCalculo).toISOString().substring(0, 7) : 'N/A',
            proyecto: k.proyecto,
            tir_k: parseFloat(k.tir_k),
            tir_operativa: parseFloat(k.tir_operativa),
          }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              label={{ value: 'TIR (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              formatter={(value) => value ? `${value.toFixed(2)}%` : 'N/A'}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="tir_k"
              stroke="#2563eb"
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="tir_operativa"
              stroke="#7c3aed"
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function agruparPorProyecto(kpis) {
  const grupos = {};

  kpis.forEach((kpi) => {
    if (!grupos[kpi.proyecto]) {
      grupos[kpi.proyecto] = [];
    }

    const mes = kpi.fechaCalculo ? new Date(kpi.fechaCalculo).toISOString().substring(0, 7) : 'N/A';

    grupos[kpi.proyecto].push({
      mes,
      tir_k: kpi.tir_k ? parseFloat(kpi.tir_k) : null,
      tir_operativa: kpi.tir_operativa ? parseFloat(kpi.tir_operativa) : null,
    });
  });

  Object.keys(grupos).forEach(proyecto => {
    grupos[proyecto].sort((a, b) => a.mes.localeCompare(b.mes));
  });

  return grupos;
}
