# Implementación de KPIs Financieros — TIR K y TIR Operativa

**Fecha:** 2026-05-16  
**Estado:** ✅ Implementado en Tracción  
**Ubicación en app:** `/kpis` → Pestaña "KPIs Proyectos (Financiero)"

---

## 📋 Resumen

Se ha implementado un sistema automático de cálculo de TIR K (retorno de capital) y TIR Operativa (retorno operacional) para los 5 proyectos activos de IC Constructora.

**Proyectos incluidos:**
- Well
- Verde Vivo (E1-E4)
- Azul Celeste (E1-E4)
- Azul Turquesa (E1-E4)
- Mitika (E1-E4)

**Período:** 16 películas mensuales (2025-01-01 → 2026-04-01)

---

## 🔧 Arquitectura Técnica

### 1. Hook: `useKpisProyectos.js`

**Ubicación:** `app/src/lib/useKpisProyectos.js`

**Funcionalidades:**

```javascript
const { kpis, loading, error, refetch } = useKpisProyectos();
```

- **kpis:** Array de cálculos KPI por proyecto y película
  ```javascript
  {
    proyecto: "Well",
    fechaCalculo: Date(2025-01-01),
    tir_k: "14.32",  // porcentaje
    tir_operativa: "12.45",  // porcentaje
    estado: "calculado"
  }
  ```

- **loading:** Boolean indicando si se están cargando datos
- **error:** String con mensaje de error si falla la carga
- **refetch:** Función para recargar datos manualmente

### 2. Algoritmo de Cálculo

**Fórmula TIR:** Resuelve la ecuación de Valor Presente Neto (VPN) = 0

```
VPN(tasa) = Σ [Flujo_t / (1 + tasa)^t] = 0
TIR = tasa que anula el VPN
```

**Método numérico:** Newton-Raphson

```javascript
tasa_nueva = tasa_anterior - VPN / VPN'
```

- Máximo 100 iteraciones
- Tolerancia de convergencia: 1e-6
- Valor inicial de tasa: 10%

### 3. Líneas de Presupuesto & Gestión (P&G)

#### TIR K (Capital)

```
13.2 - Aportes IC (desembolsos, negativo)
13.4 - Reintegros IC (retorno, positivo)
14.2 - Aportes Socio (desembolsos, negativo)
14.4 - Reintegros Socio (retorno, positivo)

Flujo = Reintegros IC + Reintegros Socio - Aportes IC - Aportes Socio
```

#### TIR Operativa

```
1.0  - Ingresos (ventas, fiducia, créditos)
9.0  - Total Costos (directos, indirectos, financieros)

FCO = Ingresos - Total Costos
```

---

## 📊 Componentes de UI

### KpisProyectosChart.jsx

**Ubicación:** `app/src/components/charts/KpisProyectosChart.jsx`

**Visualizaciones:**

1. **Gráfico por Proyecto** (5 gráficos, uno por proyecto)
   - Eje X: Películas mensuales (2025-01 → 2026-04)
   - Eje Y: TIR (%)
   - Dos líneas: TIR K (azul) y TIR Operativa (púrpura)

2. **Comparativa General**
   - Superpone todas las películas
   - Permite ver tendencias agregadas

**Interactivo:**
- Hover: Muestra valores exactos
- Tooltip: Detalle de mes y TIR

---

## 🔄 Flujo de Datos

```
1. Componente KpisProyectosChart
        ↓
2. Hook useKpisProyectos() — carga datos
        ↓
3. Tabla Supabase: historico
   (827,988 registros con líneas P&G)
        ↓
4. Agrupar por proyecto y fecha_datos
        ↓
5. Construir flujos mensuales (K y Operativo)
        ↓
6. Calcular TIR usando Newton-Raphson
        ↓
7. Retornar array de resultados
        ↓
8. Renderizar gráficos Recharts
```

---

## ⚙️ Demo Mode

Si no hay variables de entorno configuradas (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), el hook retorna datos mock automáticamente:

- 5 proyectos × 16 películas = 80 datos
- TIR K: 12-20% (con variabilidad)
- TIR Operativa: 8-23% (con variabilidad)

Esto permite desarrollar y testear sin Supabase.

---

## 🎯 Próximos Pasos

### 1. Validación Crítica (ANTES de mostrar en reportes)

Con **Andrés Arango (Construcción):**

- [ ] Confirmar que líneas P&G son correctas (13.2, 13.4, 14.2, 14.4, 1.0, 9.0)
- [ ] Verificar signos de flujos (¿aportes realmente negativos?)
- [ ] Validar muestra de 3-5 proyectos: `FCO = Ingresos - Total Costos`
- [ ] Revisar película 2025-10-01 (spike de 127% en registros)

### 2. Almacenamiento Persistente (Opcional)

Crear tabla `kpis_proyectos` en Supabase:

```sql
CREATE TABLE kpis_proyectos (
  id UUID DEFAULT gen_random_uuid(),
  company_id TEXT,
  proyecto TEXT,
  fecha_calculo DATE,
  metrica TEXT ('TIR_K', 'TIR_OPERATIVA'),
  valor NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id),
  FOREIGN KEY (company_id) REFERENCES ...
);
```

Esto permitiría:
- Cachear cálculos para no recalcular siempre
- Auditar historiales de KPIs
- Detectar cambios en cálculos

### 3. Refinamientos de UI

- [ ] Agregar tabla con valores exactos debajo del gráfico
- [ ] Opción de exportar a Excel
- [ ] Filtrar por proyecto
- [ ] Comparativa de período a período (MoM)

### 4. Alertas (Opcional)

Si TIR K o TIR Operativa cae por debajo de umbral:
- Crear Issue automático en Asuntos
- Notificar a Andrés Arango y Marcela Arroyave (Control)

---

## 🧪 Testing

### Verificar que el hook se carga:

```javascript
// En cualquier componente
import { useKpisProyectos } from '../lib/useKpisProyectos';

export function TestComponent() {
  const { kpis, loading, error } = useKpisProyectos();
  
  console.log('KPIs:', kpis);
  console.log('Loading:', loading);
  console.log('Error:', error);
  
  return <div>Check console...</div>;
}
```

### Verificar Newton-Raphson:

```javascript
// Caso simple: flujo = [100, -50, -60]
// VPN(10%) ≈ 0 → TIR ≈ 10%

const calcularTIR = (flujos) => { /* ... */ };
const tir = calcularTIR([100, -50, -60]);
console.log('TIR:', tir); // Debería ser ≈0.10
```

---

## 📝 Líneas de P&G Validadas

**Fuente:** `ANALISIS_HISTORICO_KPI.md` (892,901 registros)

| Concepto | Línea | Registros | Signo |
|----------|-------|-----------|-------|
| Aportes IC | 13.2 | 9,437 | Negativo = desembolso |
| Reintegros IC | 13.4 | 3,145 | Positivo = entrada |
| Aportes Socio | 14.2 | 4,133 | Negativo = desembolso |
| Reintegros Socio | 14.4 | 1,556 | Positivo = entrada |
| **Ingresos** | 1.0 | 28,112 | Positivo |
| **Total Costos** | 9.0 | 36,286 | Positivo |

---

## 📞 Contactos

- **Implementación técnica:** Luis Miguel Serrano (TI)
- **Validación P&G:** Andrés Arango (Construcción)
- **Interpretación de resultados:** Juan Paulo McAllister (CEO), Marcela Arroyave (Control)

---

**Documentación actualizada:** 2026-05-16  
**Referencia relacionada:** `ANALISIS_HISTORICO_KPI.md`, `WIKI_UPDATE_KPIS.md`
