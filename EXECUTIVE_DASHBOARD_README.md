# Executive Dashboard — Implementación Completa

## Resumen Ejecutivo

Dashboard ejecutivo para **Juan Paulo McAllister (CEO)** con 4 secciones visuales principales:

1. **Scorecard** — 3 KPIs clave (Ventas YTD, Prog. Obra, Saldo Caja)
2. **Histórico Flujo de Caja** — Tabla horizontal scrolleable (películas × proyectos)
3. **3 Nuevos Negocios** — Grid con promesa/escritura + drill-down histórico
4. **Control Obra + Cartera** — Data grid expandible por capítulo presupuestal

**Acceso:** `/executive` — Lazy-loaded, integrado en `App.jsx`, ruta `/executive`

---

## Archivos Creados

### Hooks (Data Layer)

| Archivo | Propósito | Estado |
|---------|-----------|--------|
| `lib/useHistoricoFlujoCaja.js` | Carga flujo caja histórico (películas × proyectos) | ✅ Demo-ready |
| `lib/useNuevosNegocios.js` | Carga 3 negocios + histórico últimos 3 meses | ✅ Demo-ready |

### Componentes (UI Layer)

| Archivo | Propósito | Responsivo |
|---------|-----------|-----------|
| `components/executive/ExecutiveScorecard.jsx` | 3 tarjetas KPI grandes | ✅ Grid 3col → mobile 2col |
| `components/executive/HistoricoFlujoCajaTable.jsx` | Tabla scroll horizontal | ✅ Sticky header + left col |
| `components/executive/NuevosNegociosWidget.jsx` | Grid 3 negocios + expandible | ✅ Auto-fit columns |
| `components/executive/ObraCarteraTable.jsx` | Data grid obra + cartera | ✅ Expandible por row |
| `components/executive/ExecutiveFilters.jsx` | Período + Proyecto + Refresh | ✅ Flex wrap |

### Página Principal

| Archivo | Propósito |
|---------|-----------|
| `pages/ExecutiveDashboard.jsx` | Orquestador: carga hooks, arma layout, maneja filtros |

### Modificaciones Existentes

| Archivo | Cambio |
|---------|--------|
| `src/App.jsx` | Agregó ruta `/executive`, lazy-loaded `ExecutiveDashboardPage` |

---

## Características Implementadas

### Sección 1: Scorecard (ExecutiveScorecard.jsx)

✅ 3 tarjetas grandes:
- **Ventas YTD** (Juan Paulo) — MM$ vs meta, % progreso, semáforo
- **Prog. Obra YTD** (Andrés) — % vs 100%, barra progreso, estado
- **Saldo Caja** (Juan José) — MM$ actual vs meta, status

Cada tarjeta:
- Valor principal grande (font 2.2rem)
- Barra de progreso colorida (rojo/amarillo/verde)
- % cumplimiento + indicador semáforo
- Dueño (owner) en texto pequeño
- Hover effect

**Grid:** 3 columnas desktop → auto-fit responsive

---

### Sección 2: Histórico Flujo de Caja (HistoricoFlujoCajaTable.jsx)

✅ Tabla horizontal scrolleable:
- **Columnas:** Películas (meses) en orden descendente
- **Filas:** Proyectos activos (Bosque Central, Gaia, etc.)
- **Celdas:** Flujo de caja en MM$
  - Positivo (verde), Negativo (rojo)
  - Italics si es proyectado vs histórico
  - Hover highlighting

Características:
- Header sticky (izquierda fija durante scroll)
- Leyenda de colores + interpretación
- Lazy-loading compatible

---

### Sección 3: Nuevos Negocios (NuevosNegociosWidget.jsx)

✅ Grid de 3 tarjetas (1 por negocio):
- Nombre proyecto + status badge (🟢 En marcha / 🟡 En riesgo / 🔴 Crítico)
- Propietario (owner) de Mónica
- **Valores grandes:**
  - Promesa MM$ (gris)
  - Escritura MM$ (verde)
- Botón "Últimos 3 meses" → expandible con tabla:
  - Mes | Promesa | Escritura

Flujo de datos:
1. Carga desde tabla `nuevos_negocios`
2. Enriquece con histórico de `nuevos_negocios_historico`
3. Renderiza cards con drill-down

---

### Sección 4: Obra + Cartera (ObraCarteraTable.jsx)

✅ Data grid expandible:
- **Columnas:** Proyecto | Cartera Pre | Cartera Post | Prog. Obra % | Status
- **Ordenamiento:** Por status (🔴 Crítico first → 🟢 En marcha last)
- **Expandible por fila:** Detalles por capítulo presupuestal
  - Capítulo | Presupuesto MM | Real MM | % Prog.

Interactividad:
- Click fila → expandir/colapsar detalles
- Chevron rotativo indica estado expandido
- Highlight por risk (background rojo si danger)

---

### Filtros & Refresh (ExecutiveFilters.jsx)

✅ Barra de filtros con:
- **Período:** YTD | Q2 2026 | Este mes | Mes anterior
- **Proyecto:** Todos | [lista 8 proyectos]
- **Botón Refresh:** Manual refresh + spinner, deshabilitado durante carga
- **Info:** Auto-refresh cada 4h (texto estático, implementación en Supabase real)

---

## Integración con Datos Reales

### Hooks Reutilizados

```javascript
// Datos existentes de Supabase IC:
const { tree: kpisTree } = useKpis()              // Ventas, cartera, trámites
const { tree: progObraTree } = useProgramacionObra()  // Programación obra
const { metrics } = useMetrics()                  // Saldo caja + otros
```

### Hooks Nuevos (Mock-ready)

```javascript
// useHistoricoFlujoCaja() → Query tabla 'historico_flujo_caja'
// Esperado: { proyecto, mes, flujo_caja_mm, tipo ('historico'|'proyectado') }

// useNuevosNegocios() → Query tabla 'nuevos_negocios'
// Esperado: { id, nombre, promesa_mm, escritura_mm, status, owner_name, created_at }
// + tabla 'nuevos_negocios_historico': { negocio_id, mes, promesa_mm, escritura_mm }
```

---

## TODO: Siguiente Fase (Integración Real)

### 1. Crear Tablas/Vistas en Supabase IC

```sql
-- historico_flujo_caja
CREATE TABLE historico_flujo_caja (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT DEFAULT 'ic-constructora',
  proyecto TEXT NOT NULL,
  mes DATE NOT NULL,  -- primer día del mes
  flujo_caja_mm NUMERIC,
  tipo TEXT DEFAULT 'historico',  -- 'historico' | 'proyectado'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, proyecto, mes)
);

-- nuevos_negocios
CREATE TABLE nuevos_negocios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id TEXT DEFAULT 'ic-constructora',
  nombre TEXT NOT NULL,
  promesa_mm NUMERIC DEFAULT 0,
  escritura_mm NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'at-risk',  -- 'on-track' | 'at-risk' | 'stalled'
  owner_name TEXT,
  estado TEXT DEFAULT 'activo',  -- 'activo' | 'cerrado'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- nuevos_negocios_historico
CREATE TABLE nuevos_negocios_historico (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  negocio_id UUID REFERENCES nuevos_negocios(id) ON DELETE CASCADE,
  mes DATE NOT NULL,
  promesa_mm NUMERIC DEFAULT 0,
  escritura_mm NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE historico_flujo_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE nuevos_negocios ENABLE ROW LEVEL SECURITY;
ALTER TABLE nuevos_negocios_historico ENABLE ROW LEVEL SECURITY;

-- Policies (leer según company_id)
CREATE POLICY "allow_read" ON historico_flujo_caja
  FOR SELECT USING (company_id = 'ic-constructora');

CREATE POLICY "allow_read" ON nuevos_negocios
  FOR SELECT USING (company_id = 'ic-constructora');

CREATE POLICY "allow_read" ON nuevos_negocios_historico
  FOR SELECT USING (TRUE);  -- Leer a través de join
```

### 2. Rellenar Datos Demo

```sql
-- Flujo caja histórico (últimos 12 meses)
INSERT INTO historico_flujo_caja (proyecto, mes, flujo_caja_mm, tipo)
VALUES 
  ('Bosque Central', '2025-01-01', 45.5, 'historico'),
  ('Bosque Central', '2025-02-01', -12.3, 'historico'),
  ...;

-- Nuevos negocios
INSERT INTO nuevos_negocios (nombre, promesa_mm, escritura_mm, status, owner_name)
VALUES
  ('Nuevo Proyecto A', 250, 180, 'on-track', 'Mónica Báez'),
  ('Nuevo Proyecto B', 180, 95, 'at-risk', 'Mónica Báez'),
  ('Nuevo Proyecto C', 220, 55, 'stalled', 'Mónica Báez');
```

### 3. Actualizar Hooks

- Cambiar `supabaseIc.from('tabla').select()` → conectar a datos reales
- Mantener Demo Mode fallback (ya está implementado en `useApp()`)

### 4. Performance

- Agregar índices en `Supabase Dashboard`:
  ```sql
  CREATE INDEX idx_hfc_empresa ON historico_flujo_caja(company_id);
  CREATE INDEX idx_nn_estado ON nuevos_negocios(company_id, estado);
  ```
- Implementar caché de películas (meses) — cambió mensualmente
- Auto-refresh via `setInterval` o Supabase Realtime

---

## Estilos & Responsividad

✅ Usa design system existente de `index.css`:
- `--bg-surface`, `--bg-elevated`, `--border-subtle`, etc.
- `--status-success`, `--status-warning`, `--status-error`
- `--space-*` (spacing system)
- `--radius-*` (border radius)

✅ Responsive:
- Grid 3 cols → 2 cols → 1 col (mobile)
- Tabla scroll horizontal en mobile (sticky left col)
- Botones + selects ajustados para touch

---

## Demo Mode

✅ Automático:
- Si no hay env vars de Supabase IC → demo mode
- Hooks devuelven datos mock
- Datos combina output de hooks existentes + estructuras vacías

En el código:
```javascript
if (!isIcConfigured) {
  // retornar datos mock
  return { negocios: MOCK_NEGOCIOS, ... }
}
```

---

## Testing

**Pruebas manuales recomendadas:**

1. ✅ Cargar `/executive` → sin errores, spinners cortos
2. ✅ Expandir "Últimos 3 meses" en negocios → tabla horizontal
3. ✅ Click fila Obra + Cartera → expandir/colapsar detalles
4. ✅ Cambiar período/proyecto en filtros → re-render
5. ✅ Click "Actualizar" → refresh spinner 1.5s
6. ✅ Responsive: probar en desktop (1920px), tablet (768px), mobile (375px)

---

## Próximas Mejoras

- [ ] Exportar a Excel (Scorecard + Obra data)
- [ ] Comparativa mes anterior (flecha roja/verde)
- [ ] Alertas en tiempo real (Realtime subscriptions)
- [ ] Drill-down a detalles de proyecto desde tarjeta
- [ ] Gráficos sparkline en scorecard (minigráfico histórico)
- [ ] Notificaciones push si status cambia a crítico

---

## Arquitectura de Capas

```
ExecutiveDashboard.jsx (Orquestador)
├── useKpis() → KPI tree
├── useProgramacionObra() → Prog tree
├── useHistoricoFlujoCaja() → Flujo matrix
├── useNuevosNegocios() → Negocios array
├── useMetrics() → Saldo caja
│
└── ExecutiveScorecard ← directamente datos
    ExecutiveFilters ← estado local
    HistoricoFlujoCajaTable ← data matrix
    NuevosNegociosWidget ← array negocios
    ObraCarteraTable ← proyectos combinados
```

**Data flow:**
- Hooks cargan datos (Supabase IC o demo)
- ExecutiveDashboard.jsx transforma/combina
- Componentes UI renderizan (no lógica de datos)

---

## Ruta de Navegación

Agregado en `App.jsx`:
```jsx
<Route path="/executive" element={<ExecutiveDashboardPage />} />
```

Visible en sidebar (si está configurado) o directo vía URL.

---

## Fallbacks & Error Handling

✅ Cada componente maneja:
- `loading` → spinner
- `error` → mensaje error (rojo)
- `!data` → "Sin datos disponibles"
- Demo mode → banner azul informativo

---

## Conclusión

**Dashboard ejecutivo funcional, listo para conectar a Supabase IC.** Todos los componentes son reutilizables, responsive y siguen el design system de Tracción. La integración de datos reales requiere solo 3 pasos: crear tablas, rellenar datos, actualizar hooks.

**Tiempo estimado para Go Live:** 2-3 horas (crear tablas + rellenar datos + tests).
