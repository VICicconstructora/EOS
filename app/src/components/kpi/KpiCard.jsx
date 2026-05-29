import React, { useState } from 'react';
import { KpiTooltip } from './KpiTooltip';
import { ChevronDown, ChevronRight, Download, Loader2 } from 'lucide-react';
import './kpi.css';

export const KpiCard = ({ node, isExpanded, onClick, onExpandClick = () => {} }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [exporting, setExporting] = useState(false);

  const handleMouseMove = (e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const getTooltipStyle = () => {
    const OFFSET = 16;
    const TOOLTIP_W = 260;
    const TOOLTIP_H = 220;
    let x = mousePos.x + OFFSET;
    let y = mousePos.y + OFFSET;
    if (x + TOOLTIP_W > window.innerWidth - 8) x = mousePos.x - TOOLTIP_W - OFFSET;
    if (y + TOOLTIP_H > window.innerHeight - 8) y = mousePos.y - TOOLTIP_H - OFFSET;
    return { position: 'fixed', left: x, top: y, zIndex: 9999 };
  };

  async function handleExport(e) {
    e.stopPropagation();
    if (!node.onExport || exporting) return;
    setExporting(true);
    try { await node.onExport() } finally { setExporting(false) }
  }

  const formatValue = (val, format) => {
    if (val == null || isNaN(val)) return '—';
    const n = Number(val);
    if (format === 'currency') return `$${n.toLocaleString('es-CO', { maximumFractionDigits: 1 })}`;
    if (format === 'percentage') return `${n.toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`;
    return n.toLocaleString('es-CO', { maximumFractionDigits: 0 });
  };

  // Cumplimiento = currentValue / targetValue (excepto cuando ya es percentage,
  // en cuyo caso currentValue ya ES el cumplimiento)
  const computeCumplimiento = () => {
    if (node.format === 'percentage') return node.currentValue;
    if (node.rules?.type === 'lower_is_better') return null;
    if (!node.targetValue || node.targetValue === 0) return null;
    return Math.round((node.currentValue / node.targetValue) * 1000) / 10;
  };
  const cumplimiento = computeCumplimiento();

  const statusColor = {
    success: 'bg-green',
    warning: 'bg-yellow',
    danger: 'bg-red'
  }[node.status] || 'bg-gray';

  return (
    <div
      className={`kpi-card-wrapper ${isExpanded ? 'expanded' : ''}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onMouseMove={handleMouseMove}
    >
      <div className={`kpi-card ${statusColor}`} onClick={() => onClick(node)}>
        <div className="kpi-card-header">
          <span className="kpi-title">{node.title}</span>
          <span className="kpi-owner">{node.owner}</span>
        </div>
        <div className="kpi-card-body">
          <span className="kpi-value">{formatValue(node.currentValue, node.format)}</span>
          <span className="kpi-cumplimiento">
            {node.format === 'percentage'
              ? 'cumplimiento'
              : cumplimiento != null
                ? `${cumplimiento.toLocaleString('es-CO', { maximumFractionDigits: 1 })}% cumplimiento`
                : '—'}
          </span>
        </div>
        <div className="kpi-card-footer">
          {node.onExport ? (
            <button
              className="kpi-export-btn"
              onClick={handleExport}
              title="Exportar soporte a CSV"
              disabled={exporting}
            >
              {exporting
                ? <Loader2 size={13} className="kpi-export-spin" />
                : <Download size={13} />}
            </button>
          ) : <span />}
          {onExpandClick && (
            <span
              className="expand-icon"
              onClick={(e) => { e.stopPropagation(); onExpandClick(node); }}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
          )}
        </div>
      </div>
      {showTooltip && mousePos.x > 0 && (
        <div className="tooltip-container" style={getTooltipStyle()}>
          <KpiTooltip node={node} />
        </div>
      )}
    </div>
  );
};
