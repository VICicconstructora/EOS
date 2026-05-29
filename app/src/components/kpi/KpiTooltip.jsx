import React from 'react';
import { LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip } from 'recharts';
import './kpi.css';

const fmt = (v, format) => {
  if (v == null || isNaN(v)) return '—';
  const n = Number(v);
  if (format === 'currency') return `$${n.toLocaleString('es-CO', { maximumFractionDigits: 1 })}`;
  if (format === 'percentage') return `${n.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`;
  return n.toLocaleString('es-CO', { maximumFractionDigits: 0 });
};

export const KpiTooltip = ({ node }) => {
  const hasHistory = node.history && node.history.length > 0;

  // Cumplimiento explícito
  let cumpl = null;
  if (node.format === 'percentage') {
    cumpl = node.currentValue;
  } else if (node.targetValue && node.targetValue !== 0) {
    cumpl = Math.round((node.currentValue / node.targetValue) * 1000) / 10;
  }

  const cumplColor = cumpl == null ? '#64748b'
    : (node.status === 'success' ? '#10b981'
       : node.status === 'warning' ? '#f59e0b'
       : '#ef4444');

  const meta = node._meta || {};

  return (
    <div className="kpi-tooltip">
      <div className="kpi-tooltip-header">
        <strong>{node.title}</strong>
        {node.owner && <span style={{ marginLeft: 6, fontWeight: 400, color: '#64748b' }}>· {node.owner}</span>}
      </div>

      {/* Bloque PPTO vs Real */}
      <div className="kpi-tooltip-comparativa">
        <div className="kpi-tooltip-row">
          <span className="kpi-tooltip-label">PPTO</span>
          <span className="kpi-tooltip-value">{fmt(node.targetValue, node.format)}</span>
        </div>
        <div className="kpi-tooltip-row">
          <span className="kpi-tooltip-label">Real</span>
          <span className="kpi-tooltip-value">{fmt(node.currentValue, node.format)}</span>
        </div>
        {cumpl != null && (
          <div className="kpi-tooltip-row" style={{ borderTop: '1px solid #e2e8f0', paddingTop: 4, marginTop: 4 }}>
            <span className="kpi-tooltip-label" style={{ fontWeight: 600 }}>Cumplimiento</span>
            <span className="kpi-tooltip-value" style={{ color: cumplColor, fontWeight: 700 }}>
              {cumpl.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%
            </span>
          </div>
        )}
        {meta.unitsPpto != null && meta.unitsReal != null && (
          <div className="kpi-tooltip-row" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
            <span>Unidades</span>
            <span>{Number(meta.unitsReal).toLocaleString('es-CO', { maximumFractionDigits: 0 })} / {Number(meta.unitsPpto).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
          </div>
        )}
      </div>

      {hasHistory && (
        <>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 6, marginBottom: 2 }}>Tendencia 12 meses</div>
          <div className="kpi-tooltip-chart">
            <ResponsiveContainer width="100%" height={80}>
              <LineChart data={node.history}>
                <XAxis dataKey="period" hide />
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <Line
                  type="monotone"
                  dataKey="target"
                  stroke="#94a3b8"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke={node.status === 'success' ? '#10b981' : node.status === 'warning' ? '#f59e0b' : '#ef4444'}
                  strokeWidth={2}
                  dot={{ r: 2.5 }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
            <span>línea sólida = real</span>
            <span>línea punteada = PPTO</span>
          </div>
        </>
      )}
    </div>
  );
};
