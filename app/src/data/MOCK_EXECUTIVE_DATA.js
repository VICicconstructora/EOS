// app/src/data/MOCK_EXECUTIVE_DATA.js
// Datos mock para testing del Executive Dashboard sin Supabase

export const MOCK_HISTORICO_FLUJO_CAJA = [
  {
    proyecto: 'Bosque Central',
    mes: '2026-05-01',
    flujo_caja_mm: 45.5,
    tipo: 'historico',
  },
  {
    proyecto: 'Bosque Central',
    mes: '2026-04-01',
    flujo_caja_mm: -12.3,
    tipo: 'historico',
  },
  {
    proyecto: 'Bosque Central',
    mes: '2026-03-01',
    flujo_caja_mm: 38.2,
    tipo: 'historico',
  },
  {
    proyecto: 'Gaia',
    mes: '2026-05-01',
    flujo_caja_mm: 28.7,
    tipo: 'historico',
  },
  {
    proyecto: 'Gaia',
    mes: '2026-04-01',
    flujo_caja_mm: 15.1,
    tipo: 'historico',
  },
  {
    proyecto: 'Gaia',
    mes: '2026-03-01',
    flujo_caja_mm: 22.5,
    tipo: 'historico',
  },
  {
    proyecto: 'Praia Natura',
    mes: '2026-05-01',
    flujo_caja_mm: 32.1,
    tipo: 'historico',
  },
  {
    proyecto: 'Praia Natura',
    mes: '2026-04-01',
    flujo_caja_mm: 8.5,
    tipo: 'historico',
  },
  {
    proyecto: 'Praia Natura',
    mes: '2026-03-01',
    flujo_caja_mm: 19.3,
    tipo: 'historico',
  },
  {
    proyecto: 'Primera Este',
    mes: '2026-05-01',
    flujo_caja_mm: 18.6,
    tipo: 'historico',
  },
  {
    proyecto: 'Primera Este',
    mes: '2026-04-01',
    flujo_caja_mm: -5.2,
    tipo: 'historico',
  },
  {
    proyecto: 'Primera Este',
    mes: '2026-03-01',
    flujo_caja_mm: 14.7,
    tipo: 'historico',
  },
  {
    proyecto: 'Castilla Imperial',
    mes: '2026-05-01',
    flujo_caja_mm: 25.3,
    tipo: 'historico',
  },
  {
    proyecto: 'Castilla Imperial',
    mes: '2026-04-01',
    flujo_caja_mm: 12.1,
    tipo: 'historico',
  },
  {
    proyecto: 'Castilla Imperial',
    mes: '2026-03-01',
    flujo_caja_mm: 16.8,
    tipo: 'historico',
  },
  {
    proyecto: 'Castilla Living',
    mes: '2026-05-01',
    flujo_caja_mm: 21.4,
    tipo: 'proyectado',
  },
  {
    proyecto: 'Castilla Living',
    mes: '2026-04-01',
    flujo_caja_mm: 9.6,
    tipo: 'historico',
  },
  {
    proyecto: 'Castilla Living',
    mes: '2026-03-01',
    flujo_caja_mm: 13.2,
    tipo: 'historico',
  },
  {
    proyecto: 'La Hacienda',
    mes: '2026-05-01',
    flujo_caja_mm: -8.1,
    tipo: 'historico',
  },
  {
    proyecto: 'La Hacienda',
    mes: '2026-04-01',
    flujo_caja_mm: 5.3,
    tipo: 'historico',
  },
  {
    proyecto: 'La Hacienda',
    mes: '2026-03-01',
    flujo_caja_mm: 11.4,
    tipo: 'historico',
  },
  {
    proyecto: 'Reserva De Oporto',
    mes: '2026-05-01',
    flujo_caja_mm: 35.8,
    tipo: 'historico',
  },
  {
    proyecto: 'Reserva De Oporto',
    mes: '2026-04-01',
    flujo_caja_mm: 22.6,
    tipo: 'historico',
  },
  {
    proyecto: 'Reserva De Oporto',
    mes: '2026-03-01',
    flujo_caja_mm: 28.9,
    tipo: 'historico',
  },
]

export const MOCK_NUEVOS_NEGOCIOS = [
  {
    id: 'neg-001',
    nombre: 'Proyecto Nueva Esperanza',
    promesa_mm: 250,
    escritura_mm: 180,
    status: 'on-track',
    owner_name: 'Mónica Báez',
    estado: 'activo',
    created_at: '2026-04-15',
    history: [
      { mes: 'Mar', promesa: 150, escritura: 75 },
      { mes: 'Abr', promesa: 200, escritura: 120 },
      { mes: 'May', promesa: 250, escritura: 180 },
    ],
  },
  {
    id: 'neg-002',
    nombre: 'Residencial Campestre Sur',
    promesa_mm: 180,
    escritura_mm: 95,
    status: 'at-risk',
    owner_name: 'Mónica Báez',
    estado: 'activo',
    created_at: '2026-04-22',
    history: [
      { mes: 'Mar', promesa: 100, escritura: 30 },
      { mes: 'Abr', promesa: 140, escritura: 60 },
      { mes: 'May', promesa: 180, escritura: 95 },
    ],
  },
  {
    id: 'neg-003',
    nombre: 'Urban Living Centro',
    promesa_mm: 220,
    escritura_mm: 55,
    status: 'stalled',
    owner_name: 'Mónica Báez',
    estado: 'activo',
    created_at: '2026-05-01',
    history: [
      { mes: 'Mar', promesa: 220, escritura: 10 },
      { mes: 'Abr', promesa: 220, escritura: 20 },
      { mes: 'May', promesa: 220, escritura: 55 },
    ],
  },
]

export const MOCK_OBRA_CARTERA = [
  {
    id: 'p-001',
    nombre: 'Bosque Central',
    carteraPre: 125.4,
    carteraPost: 245.8,
    progObra: 76.5,
    status: 'success',
    detalles: [
      { capitulo: 'Estructura', ppto: 120, real: 110, pct: 92 },
      { capitulo: 'Acabados', ppto: 150, real: 132, pct: 88 },
      { capitulo: 'Instalaciones', ppto: 100, real: 75, pct: 75 },
    ],
  },
  {
    id: 'p-002',
    nombre: 'Gaia',
    carteraPre: 95.2,
    carteraPost: 185.6,
    progObra: 68.3,
    status: 'warning',
    detalles: [
      { capitulo: 'Estructura', ppto: 100, real: 85, pct: 85 },
      { capitulo: 'Acabados', ppto: 120, real: 95, pct: 79 },
      { capitulo: 'Instalaciones', ppto: 85, real: 58, pct: 68 },
    ],
  },
  {
    id: 'p-003',
    nombre: 'Praia Natura',
    carteraPre: 142.7,
    carteraPost: 267.3,
    progObra: 82.1,
    status: 'success',
    detalles: [
      { capitulo: 'Estructura', ppto: 140, real: 133, pct: 95 },
      { capitulo: 'Acabados', ppto: 170, real: 155, pct: 91 },
      { capitulo: 'Instalaciones', ppto: 120, real: 98, pct: 82 },
    ],
  },
  {
    id: 'p-004',
    nombre: 'Primera Este',
    carteraPre: 78.5,
    carteraPost: 156.2,
    progObra: 55.7,
    status: 'danger',
    detalles: [
      { capitulo: 'Estructura', ppto: 80, real: 56, pct: 70 },
      { capitulo: 'Acabados', ppto: 100, real: 65, pct: 65 },
      { capitulo: 'Instalaciones', ppto: 70, real: 35, pct: 50 },
    ],
  },
  {
    id: 'p-005',
    nombre: 'Castilla Imperial',
    carteraPre: 112.3,
    carteraPost: 223.8,
    progObra: 71.2,
    status: 'warning',
    detalles: [
      { capitulo: 'Estructura', ppto: 110, real: 95, pct: 86 },
      { capitulo: 'Acabados', ppto: 140, real: 112, pct: 80 },
      { capitulo: 'Instalaciones', ppto: 95, real: 68, pct: 72 },
    ],
  },
  {
    id: 'p-006',
    nombre: 'Castilla Living',
    carteraPre: 98.6,
    carteraPost: 195.4,
    progObra: 64.9,
    status: 'warning',
    detalles: [
      { capitulo: 'Estructura', ppto: 95, real: 78, pct: 82 },
      { capitulo: 'Acabados', ppto: 120, real: 90, pct: 75 },
      { capitulo: 'Instalaciones', ppto: 85, real: 55, pct: 65 },
    ],
  },
  {
    id: 'p-007',
    nombre: 'La Hacienda',
    carteraPre: 156.8,
    carteraPost: 298.5,
    progObra: 48.2,
    status: 'danger',
    detalles: [
      { capitulo: 'Estructura', ppto: 150, real: 90, pct: 60 },
      { capitulo: 'Acabados', ppto: 180, real: 95, pct: 53 },
      { capitulo: 'Instalaciones', ppto: 140, real: 55, pct: 39 },
    ],
  },
  {
    id: 'p-008',
    nombre: 'Reserva De Oporto',
    carteraPre: 134.5,
    carteraPost: 267.1,
    progObra: 79.4,
    status: 'success',
    detalles: [
      { capitulo: 'Estructura', ppto: 130, real: 126, pct: 97 },
      { capitulo: 'Acabados', ppto: 165, real: 152, pct: 92 },
      { capitulo: 'Instalaciones', ppto: 115, real: 98, pct: 85 },
    ],
  },
]

// Helper para simular respuesta de hook sin Supabase
export function useMockExecutiveData() {
  return {
    historico: {
      data: MOCK_HISTORICO_FLUJO_CAJA,
      movies: [
        { key: '2026-05-01', label: 'May 2026' },
        { key: '2026-04-01', label: 'Abr 2026' },
        { key: '2026-03-01', label: 'Mar 2026' },
      ],
      projects: [
        'Bosque Central',
        'Gaia',
        'Praia Natura',
        'Primera Este',
        'Castilla Imperial',
        'Castilla Living',
        'La Hacienda',
        'Reserva De Oporto',
      ],
      loading: false,
      error: null,
    },
    negocios: {
      data: MOCK_NUEVOS_NEGOCIOS,
      loading: false,
      error: null,
    },
    obraCartera: {
      data: MOCK_OBRA_CARTERA,
      loading: false,
      error: null,
    },
  }
}
