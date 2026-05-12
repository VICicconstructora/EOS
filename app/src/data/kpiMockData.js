// Helper to generate trend data
const generateTrend = (target, variance, periods = 6) => {
  const data = [];
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const currentMonth = new Date().getMonth(); // 0-indexed
  
  for (let i = periods; i > 0; i--) {
    let m = currentMonth - i;
    if (m < 0) m += 12;
    // Add some random noise but keep it around target
    const noise = (Math.random() - 0.5) * variance;
    data.push({
      period: months[m],
      target: target,
      actual: target + noise
    });
  }
  return data;
};

// Helper to evaluate traffic light status
const evaluateStatus = (value, rules) => {
  if (rules.type === 'higher_is_better') {
    if (value >= rules.green) return 'success';
    if (value >= rules.yellow) return 'warning';
    return 'danger';
  } else { // lower_is_better
    if (value <= rules.green) return 'success';
    if (value <= rules.yellow) return 'warning';
    return 'danger';
  }
};

// --- Nivel 5: Equipos ---
const equiposVentas = [
  {
    id: 'eq-ventas-1',
    title: 'Equipo B2B',
    owner: 'Carlos Ruiz',
    currentValue: 450000,
    targetValue: 500000,
    format: 'currency',
    rules: { type: 'higher_is_better', green: 480000, yellow: 450000 }
  },
  {
    id: 'eq-ventas-2',
    title: 'Equipo Retail',
    owner: 'Ana Gómez',
    currentValue: 800000,
    targetValue: 700000,
    format: 'currency',
    rules: { type: 'higher_is_better', green: 700000, yellow: 600000 }
  }
];

// --- Nivel 4: Coordinaciones ---
const coordsVentas = [
  {
    id: 'coord-vta-norte',
    title: 'Ventas Norte',
    owner: 'Luis Torres',
    currentValue: 1250000,
    targetValue: 1200000,
    format: 'currency',
    rules: { type: 'higher_is_better', green: 1200000, yellow: 1000000 },
    childrenAggregationType: 'sum',
    children: equiposVentas
  },
  {
    id: 'coord-vta-sur',
    title: 'Ventas Sur',
    owner: 'Marta Peña',
    currentValue: 400000, // Very low!
    targetValue: 800000,
    format: 'currency',
    rules: { type: 'higher_is_better', green: 800000, yellow: 600000 },
    childrenAggregationType: 'sum',
    children: []
  }
];

const coordsOps = [
  {
    id: 'coord-ops-logistica',
    title: 'Logística',
    owner: 'Pedro Paz',
    currentValue: 92,
    targetValue: 98,
    format: 'percentage',
    rules: { type: 'higher_is_better', green: 95, yellow: 90 },
    childrenAggregationType: 'none',
    children: []
  },
  {
    id: 'coord-ops-calidad',
    title: 'Defectos',
    owner: 'Sara Gil',
    currentValue: 4.5, // High defects
    targetValue: 2.0,
    format: 'percentage',
    rules: { type: 'lower_is_better', green: 2.0, yellow: 3.5 },
    childrenAggregationType: 'none',
    children: []
  }
]

// --- Nivel 3: Direcciones ---
const dirComercial = [
  {
    id: 'dir-nacional',
    title: 'Mercado Nacional',
    owner: 'Javier Roca',
    currentValue: 1650000,
    targetValue: 2000000,
    format: 'currency',
    rules: { type: 'higher_is_better', green: 2000000, yellow: 1700000 },
    childrenAggregationType: 'sum',
    children: coordsVentas
  },
  {
    id: 'dir-export',
    title: 'Exportaciones',
    owner: 'Sofia Luna',
    currentValue: 500000,
    targetValue: 450000,
    format: 'currency',
    rules: { type: 'higher_is_better', green: 450000, yellow: 400000 },
    childrenAggregationType: 'sum',
    children: []
  }
];

const dirProduccion = [
  {
    id: 'dir-planta1',
    title: 'Planta Principal',
    owner: 'Mario Soto',
    currentValue: 85,
    targetValue: 90,
    format: 'percentage', // OEE for example
    rules: { type: 'higher_is_better', green: 90, yellow: 80 },
    childrenAggregationType: 'none',
    children: coordsOps
  }
];

// --- Nivel 2: Gerencias ---
const gerencias = [
  {
    id: 'ger-comercial',
    title: 'Gerencia Comercial',
    owner: 'Roberto Silva',
    currentValue: 2150000, // Sum of 1650000 + 500000
    targetValue: 2450000,
    format: 'currency',
    rules: { type: 'higher_is_better', green: 2400000, yellow: 2100000 },
    childrenAggregationType: 'sum',
    children: dirComercial
  },
  {
    id: 'ger-operaciones',
    title: 'Gerencia Operaciones',
    owner: 'Carmen Vega',
    currentValue: 12.5, // Costs in millions
    targetValue: 10.0,
    format: 'currency',
    rules: { type: 'lower_is_better', green: 10.0, yellow: 11.5 }, // 12.5 is RED
    childrenAggregationType: 'none',
    children: dirProduccion
  },
  {
    id: 'ger-rrhh',
    title: 'Gerencia RRHH',
    owner: 'Lucia Rey',
    currentValue: 15, // Turnover %
    targetValue: 10,
    format: 'percentage',
    rules: { type: 'lower_is_better', green: 10, yellow: 14 }, // 15 is RED
    childrenAggregationType: 'none',
    children: []
  }
];

// --- Nivel 1: CEO ---
// Recursively enrich the nodes with history and calculated status
const enrichNode = (node) => {
  const variance = node.format === 'percentage' 
    ? (node.targetValue * 0.2) // 20% variance for percentages
    : (node.targetValue * 0.15); // 15% variance for numbers/currency
    
  node.history = generateTrend(node.targetValue, variance);
  // Guarantee the latest period in history matches the current value exactly for consistency
  node.history[node.history.length - 1].actual = node.currentValue;
  
  node.status = evaluateStatus(node.currentValue, node.rules);
  
  if (node.children) {
    node.children = node.children.map(enrichNode);
  }
  return node;
};

const rootNodes = [
  {
    id: 'ceo-ingresos',
    title: 'Ingresos Totales',
    owner: 'CEO',
    currentValue: 2150000, // Linked to Gerencia Comercial
    targetValue: 2450000,
    format: 'currency',
    rules: { type: 'higher_is_better', green: 2400000, yellow: 2100000 },
    childrenAggregationType: 'sum',
    children: [gerencias[0]] // Gerencia Comercial
  },
  {
    id: 'ceo-ebitda',
    title: 'Margen EBITDA',
    owner: 'CEO',
    currentValue: 18.5,
    targetValue: 22.0,
    format: 'percentage',
    rules: { type: 'higher_is_better', green: 22.0, yellow: 19.0 },
    childrenAggregationType: 'none',
    children: gerencias // Connects to Ops and RRHH conceptually
  }
];

export const mockKpiTree = rootNodes.map(enrichNode);
