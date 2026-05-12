import React, { useState } from 'react';
import { KpiCard } from './KpiCard';
import './kpi.css';

export const KpiRow = ({ nodes, level }) => {
  const [expandedNodeId, setExpandedNodeId] = useState(null);

  const handleNodeClick = (node) => {
    if (!node.children || node.children.length === 0) return;
    
    if (expandedNodeId === node.id) {
      setExpandedNodeId(null); // Toggle off if already open
    } else {
      setExpandedNodeId(node.id); // Open and accordion others
    }
  };

  const expandedNode = nodes.find(n => n.id === expandedNodeId);

  return (
    <div className="kpi-level-container">
      <div className="kpi-row">
        {nodes.map(node => (
          <KpiCard 
            key={node.id} 
            node={node} 
            isExpanded={expandedNodeId === node.id}
            onClick={handleNodeClick}
          />
        ))}
      </div>
      
      {/* Recursively render the next level if a node is expanded */}
      {expandedNode && expandedNode.children && expandedNode.children.length > 0 && (
        <div className="kpi-row-children">
          <KpiRow key={expandedNode.id} nodes={expandedNode.children} level={level + 1} />
        </div>
      )}
    </div>
  );
};
