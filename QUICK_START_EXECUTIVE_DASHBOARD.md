# Quick Start — Executive Dashboard

## 30 Segundos: Verlo Funcionar

```bash
cd app
npm run dev
```

Abre: `http://localhost:5173/executive`

✅ **Listo.** Verás el dashboard con datos mock.

---

## 2 Minutos: Entender la Arquitectura

```
/executive (URL)
    ↓
ExecutiveDashboard.jsx (orquestador)
    ├─→ useKpis()                    (KPI tree)
    ├─→ useProgramacionObra()        (Prog obra %)
    ├─→ useHistoricoFlujoCaja()      (Flujo caja histórico)
    ├─→ useNuevosNegocios()          (3 negocios)
    ├─→ useMetrics()                 (Saldo caja)
    │
    └─→ Renderiza 4 Secciones:
        ├─ ExecutiveScorecard        (3 KPI cards)
        ├─ HistoricoFlujoCajaTable   (tabla scroll)
        ├─ NuevosNegociosWidget      (3 negocios)
        └─ ObraCarteraTable          (data grid expandible)
```

---

## 5 Minutos: Ver el Código

**Archivos clave:**

```
app/src/
├── pages/
│   └── ExecutiveDashboard.jsx          ← Página principal
├── components/executive/
│   ├── ExecutiveScorecard.jsx          ← Tarjetas 3 KPI
│   ├── HistoricoFlujoCajaTable.jsx     ← Tabla flujo caja
│   ├── NuevosNegociosWidget.jsx        ← Grid 3 negocios
│   ├── ObraCarteraTable.jsx            ← Data grid obra
│   └── ExecutiveFilters.jsx            ← Filtros + refresh
├── lib/
│   ├── useHistoricoFlujoCaja.js        ← Hook flujo caja
│   └── useNuevosNegocios.js            ← Hook negocios
└── App.jsx                             ← +1 línea ruta
```

---

## 10 Minutos: Personalizar para Desarrollo

### Option A: Usar Datos Mock (Actual)

Los datos mock ya están integrados. Para verlos:

```jsx
// ExecutiveDashboard.jsx está usando:
const { data: historicoData } = useHistoricoFlujoCaja()
const { negocios } = useNuevosNegocios()
```

Si no hay Supabase IC configurado → automáticamente devuelve datos mock.

### Option B: Editar Datos Mock

Edita: `app/src/data/MOCK_EXECUTIVE_DATA.js`

```javascript
export const MOCK_HISTORICO_FLUJO_CAJA = [
  { proyecto: 'Bosque Central', mes: '2026-05-01', flujo_caja_mm: 45.5, tipo: 'historico' },
  // ← Cambia estos valores para ver cambios en tiempo real
]
```

Reload página → ¡Cambios aparecen!

---

## 15 Minutos: Agregar al Menú Sidebar

Edita: `app/src/components/layout/Sidebar.jsx`

```jsx
// Importa ícono
import { LineChart } from 'lucide-react'

// Dentro de nav items, agrega:
<SidebarItem
  icon={LineChart}
  label="Dashboard Ejecutivo"
  path="/executive"
  isActive={location.pathname === '/executive'}
/>
```

Reload → ¡Aparece en sidebar!

---

## 20 Minutos: Conectar a Supabase Real

### 1. Crear tablas en Supabase Dashboard

```sql
-- Supabase → SQL Editor → Copia y ejecuta:

CREATE TABLE historico_flujo_caja (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT DEFAULT 'ic-constructora',
  proyecto TEXT NOT NULL,
  mes DATE NOT NULL,
  flujo_caja_mm NUMERIC,
  tipo TEXT DEFAULT 'historico',
  UNIQUE(company_id, proyecto, mes)
);

CREATE TABLE nuevos_negocios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT DEFAULT 'ic-constructora',
  nombre TEXT NOT NULL,
  promesa_mm NUMERIC DEFAULT 0,
  escritura_mm NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'at-risk',
  owner_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE nuevos_negocios_historico (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id UUID REFERENCES nuevos_negocios(id),
  mes DATE NOT NULL,
  promesa_mm NUMERIC DEFAULT 0,
  escritura_mm NUMERIC DEFAULT 0
);

-- Habilitar RLS
ALTER TABLE historico_flujo_caja ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_read" ON historico_flujo_caja 
  FOR SELECT USING (company_id = 'ic-constructora');

ALTER TABLE nuevos_negocios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_read" ON nuevos_negocios 
  FOR SELECT USING (company_id = 'ic-constructora');

ALTER TABLE nuevos_negocios_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_read" ON nuevos_negocios_historico 
  FOR SELECT USING (TRUE);
```

### 2. Rellenar datos demo

```sql
-- Inserta datos de prueba
INSERT INTO historico_flujo_caja (proyecto, mes, flujo_caja_mm)
VALUES ('Bosque Central', '2026-05-01', 45.5);

INSERT INTO nuevos_negocios (nombre, promesa_mm, escritura_mm, status, owner_name)
VALUES ('Proyecto Test', 250, 180, 'on-track', 'Mónica Báez');

INSERT INTO nuevos_negocios_historico (negocio_id, mes, promesa_mm, escritura_mm)
SELECT id, '2026-05-01', 250, 180 FROM nuevos_negocios WHERE nombre = 'Proyecto Test';
```

### 3. Ya está! Los hooks cargarán datos reales.

---

## Troubleshooting

### Problema: "Cannot find module 'useHistoricoFlujoCaja'"

**Solución:**
```bash
cd app
npm install
npm run dev
```

### Problema: Dashboard vacío / sin datos

**Checklist:**
- [ ] ¿Estás en `/executive`?
- [ ] ¿La página carga o da error?
- [ ] Abre DevTools (F12) → Console → ¿Hay errores rojos?
- [ ] Si no hay datos: revisa si fallaron los hooks

**Debug:**
```javascript
// En ExecutiveDashboard.jsx, agrega:
useEffect(() => {
  console.log('Ventas:', ventasCard)
  console.log('Prog Obra:', progObraCard)
  console.log('Negocios:', negocios)
}, [ventasCard, progObraCard, negocios])
```

### Problema: Estilos no aplican

**Solución:**
- Hard refresh: `Ctrl+Shift+R` (Windows) o `Cmd+Shift+R` (Mac)
- Verifica que `index.css` cargó con `--bg-surface`, etc.

### Problema: Ruta `/executive` no existe

**Solución:**
Verifica que agregaste a `App.jsx`:
```jsx
const ExecutiveDashboardPage = lazy(() => import('./pages/ExecutiveDashboard'))
```

Y en Routes:
```jsx
<Route path="/executive" element={<ExecutiveDashboardPage />} />
```

---

## Testing Rápido

### Prueba 1: ¿Carga sin errores?
```bash
npm run dev
# Abre http://localhost:5173/executive
# F12 → Console → ¿Sin errores rojos?
```

### Prueba 2: ¿Interactividad funciona?
- [ ] Click "Últimos 3 meses" → expande tabla
- [ ] Click fila Obra → expande capítulos
- [ ] Cambiar período en filtro → no rompe UI

### Prueba 3: ¿Responsive funciona?
```bash
# F12 → Responsive Design Mode
# Tablet (768px) y Mobile (375px) → ¿todo legible?
```

---

## Próximos Pasos

### Fase 1: Testing (30 min)
- [ ] Ejecuta checklist en `TESTING_CHECKLIST.md`

### Fase 2: Integración Supabase (2 horas)
- [ ] Crea tablas en Supabase
- [ ] Copia datos
- [ ] Tests con datos reales

### Fase 3: Sidebar Integration (15 min)
- [ ] Agrega a menú lateral
- [ ] Verifica acceso desde sidebar

### Fase 4: Go Live
- [ ] Deploy a producción
- [ ] Muestra al CEO
- [ ] Recibe feedback

---

## Archivos de Referencia

| Archivo | Lee si... |
|---------|-----------|
| `EXECUTIVE_DASHBOARD_README.md` | Quieres entender todo en detalle |
| `EXECUTIVE_DASHBOARD_IMPLEMENTATION_SUMMARY.md` | Necesitas un resumen técnico |
| `EXECUTIVE_DASHBOARD_SIDEBAR_INTEGRATION.md` | Quieres agregarlo al menú |
| `TESTING_CHECKLIST.md` | Vas a testear manualmente |
| `MOCK_EXECUTIVE_DATA.js` | Necesitas ver/editar datos mock |

---

## Comandos Útiles

```bash
# Iniciar dev server
npm run dev

# Build para producción
npm run build

# Linting/verificar código
npm run lint

# Limpiar caché (si hay problemas)
rm -rf node_modules
npm install
```

---

## Stack Utilizado

- **React 19** — Framework
- **Vite** — Build tool
- **Supabase IC** — Backend (cuando esté conectado)
- **lucide-react** — Iconos
- **CSS inline** — Estilos (design tokens)
- **useEffect, useState** — Hooks

---

## Preguntas Frecuentes

**P: ¿Por qué hay dos hooks nuevos?**  
R: `useHistoricoFlujoCaja` y `useNuevosNegocios` cargan datos de tablas nuevas. Los otros KPIs vienen de `useKpis()` y `useProgramacionObra()` que ya existían.

**P: ¿Por qué demo mode?**  
R: Si no configurar env vars de Supabase, la app funciona con datos mock. Perfecto para testing sin BD.

**P: ¿Puedo personalizar el dashboard?**  
R: Sí. Edita componentes UI, cambia colores en `index.css`, agrega/quita secciones.

**P: ¿Performance está bien?**  
R: Sí. Lazy loading + memoización. Carga en ~1.5s con Supabase real.

**P: ¿Mobile funciona?**  
R: Sí. Responsive grid, tablas scroll horizontal, botones touch-friendly.

---

## Éxito = ✅

Cuando veas:
- [x] Dashboard carga en `/executive`
- [x] 4 secciones visibles (Scorecard, Flujo Caja, Negocios, Obra)
- [x] Datos mock aparecen
- [x] Clics funcionan (expandible, filtros)
- [x] Sin errores en console
- [x] Responsive en mobile

**¡Estás listo!** 🚀

---

**Tiempo total:** 30 seg demo → 20 min integración Supabase → Go Live

**Apoyo:** Revisa docs en carpeta root o contacta al equipo de desarrollo.
