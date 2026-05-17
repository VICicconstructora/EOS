# ADPRO Datamart - Developer Guide (Supabase)

**Objetivo:** Guía técnica para desarrolladores que integren el datamart ADPRO en aplicaciones React/Node.

---

## 1. Convenciones de Nomenclatura

### Prefijos
- `adpro_dim_*` — Tablas de dimensión
- `adpro_fact_*` — Tablas de hechos
- `adpro_v*` — Vistas
- `idx_adpro_*` — Índices

### Convención de Columnas
- `sk_id_*` — Clave subrogada (surrogate key), tipo INT/SMALLINT
- `*_numero` — Identificador de negocio (factura, contrato, etc.)
- `*_descripcion` — Texto descriptivo de dimensión
- `*_valor` o `*_total` — Métrica de cantidad (dinero o unidades)
- `*_unitario` — Precio/costo por unidad

### Tipos de Claves
```
sk_id_fecha      INT          (YYYYMMDD: 20260516)
sk_id_empresa    SMALLINT     (1-32K empresas)
sk_id_proyecto   INT          (< 2M proyectos)
sk_id_insumo     INT          (< 2M insumos)
sk_id_items      INT          (< 2M items)
```

---

## 2. Querys Comunes

### 2.1 Presupuesto vs Realizado

```sql
-- Costo por proyecto y clase de origen (presupuesto vs invertido)
SELECT 
  p.nombre_proyecto,
  p.codigo_proyecto,
  cco.clase_descripcion,
  SUM(f.valor_total) as total_valor,
  COUNT(*) as cantidad_registros
FROM adpro_fact_control_proyecto f
JOIN adpro_dim_proyecto p ON f.sk_id_proyecto = p.sk_id_proyecto
JOIN adpro_dim_control_clase_origen cco ON f.sk_id_clase_origen = cco.sk_id_clase_origen
WHERE f.company_id = 'ic-constructora'
  AND f.sk_id_fecha >= 20260101
  AND f.sk_id_fecha <= 20261231
GROUP BY p.sk_id_proyecto, p.nombre_proyecto, p.codigo_proyecto, cco.clase_descripcion
ORDER BY p.nombre_proyecto, cco.clase_descripcion;
```

### 2.2 Compras por Proveedor

```sql
-- Total compras por tercero en período
SELECT 
  t.nombre,
  t.nit,
  t.ciudad,
  COUNT(*) as num_compras,
  SUM(c.valor_total) as total_comprado,
  AVG(c.valor_total) as compra_promedio
FROM adpro_fact_compras c
JOIN adpro_dim_tercero t ON c.sk_id_tercero = t.sk_id_tercero
WHERE c.company_id = 'ic-constructora'
  AND c.sk_id_fecha_compra >= 20260101
GROUP BY t.sk_id_tercero, t.nombre, t.nit, t.ciudad
ORDER BY total_comprado DESC
LIMIT 20;
```

### 2.3 Inventario Actual

```sql
-- Saldo de inventario por insumo y proyecto (sin filtrar por tipo)
SELECT 
  p.nombre_proyecto,
  ins.insumo_descripcion,
  ins.tipo_descripcion,
  SUM(inv.cantidad) as cantidad_en_bodega,
  SUM(inv.total) as valor_bodega
FROM adpro_fact_inventario_resumido inv
JOIN adpro_dim_proyecto p ON inv.sk_id_proyecto = p.sk_id_proyecto
LEFT JOIN adpro_dim_insumo ins ON inv.sk_id_insumo = ins.sk_id_insumo 
  AND inv.sk_id_empresa = ins.sk_id_empresa
WHERE inv.company_id = 'ic-constructora'
GROUP BY p.sk_id_proyecto, p.nombre_proyecto, ins.sk_id_insumo, 
         ins.insumo_descripcion, ins.tipo_descripcion
HAVING SUM(inv.cantidad) > 0
ORDER BY p.nombre_proyecto, valor_bodega DESC;
```

### 2.4 Actas y Pagos a Contratistas

```sql
-- Actas por proyecto con resumen de retenciones
SELECT 
  p.nombre_proyecto,
  COUNT(*) as num_actas,
  SUM(a.valor_total_acta) as valor_bruto,
  SUM(a.valor_anticipo) as anticipo_amortizado,
  SUM(a.valor_retencion_garantias) as garantias_retenidas,
  SUM(a.valor_total_neto) as pagos_realizados
FROM adpro_fact_actas a
JOIN adpro_dim_proyecto p ON a.sk_id_proyecto = p.sk_id_proyecto
WHERE a.company_id = 'ic-constructora'
GROUP BY p.sk_id_proyecto, p.nombre_proyecto
ORDER BY p.nombre_proyecto;
```

### 2.5 Explosión de Insumos

```sql
-- Qué materiales se gastaron en cada capítulo
SELECT 
  cap.capitulo_descripcion,
  items.item_descripcion,
  ins.insumo_descripcion,
  ins.tipo_descripcion,
  SUM(sal.salida_cantidad) as cantidad_consumida,
  SUM(sal.salida_valor_total) as costo_consumido
FROM adpro_fact_salidas_almacen sal
JOIN adpro_dim_items items ON sal.sk_id_items = items.sk_id_items
LEFT JOIN adpro_dim_insumo ins ON sal.sk_id_insumo = ins.sk_id_insumo 
  AND sal.sk_id_empresa = ins.sk_id_empresa
LEFT JOIN adpro_dim_capitulo_presupuesto cap ON sal.sk_id_insumo = cap.sk_id_capitulo
WHERE sal.company_id = 'ic-constructora'
GROUP BY cap.sk_id_capitulo, cap.capitulo_descripcion,
         items.sk_id_items, items.item_descripcion,
         ins.sk_id_insumo, ins.insumo_descripcion, ins.tipo_descripcion
ORDER BY costo_consumido DESC;
```

---

## 3. Operaciones con Supabase Client (JavaScript/React)

### 3.1 Hook para Datos de Control Proyecto

```javascript
// lib/useAdproControlProyecto.js
import { useEffect, useState } from 'react';
import supabase from './supabase';

export function useAdproControlProyecto(proyectoId, claseOrigen = null) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        let query = supabase
          .from('adpro_fact_control_proyecto')
          .select(`
            *,
            proyecto: adpro_dim_proyecto(nombre_proyecto, codigo_proyecto),
            insumo: adpro_dim_insumo(insumo_descripcion, tipo_descripcion),
            fecha: adpro_dim_fecha(fecha, año, mes)
          `)
          .eq('company_id', 'ic-constructora');

        if (proyectoId) {
          query = query.eq('sk_id_proyecto', proyectoId);
        }
        if (claseOrigen) {
          query = query.eq('sk_id_clase_origen', claseOrigen);
        }

        const { data: result, error: err } = await query;

        if (err) throw err;
        setData(result || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [proyectoId, claseOrigen]);

  return { data, loading, error };
}
```

### 3.2 Uso en Componente React

```jsx
import { useAdproControlProyecto } from '../lib/useAdproControlProyecto';

export function ControlProyectoReport({ proyectoId }) {
  const { data, loading, error } = useAdproControlProyecto(proyectoId);

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;

  // Agrupar por clase de origen
  const porClase = data.reduce((acc, row) => {
    const clase = row.clase_descripcion || 'Desconocido';
    if (!acc[clase]) acc[clase] = [];
    acc[clase].push(row);
    return acc;
  }, {});

  return (
    <div>
      {Object.entries(porClase).map(([clase, registros]) => (
        <div key={clase}>
          <h3>{clase}</h3>
          <table>
            <thead>
              <tr>
                <th>Insumo</th>
                <th>Cantidad</th>
                <th>Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {registros.map(r => (
                <tr key={r.sk_id_fact_control_proyecto}>
                  <td>{r.insumo?.insumo_descripcion || 'N/A'}</td>
                  <td>{r.cantidad}</td>
                  <td>${r.valor_total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>Total: ${registros.reduce((s, r) => s + r.valor_total, 0).toFixed(2)}</p>
        </div>
      ))}
    </div>
  );
}
```

### 3.3 Carga de Datos (Admin)

```javascript
// Ejemplo: cargar maestro de proyectos
async function cargarProyectos(proyectosCSV) {
  const registros = proyectosCSV.map(row => ({
    sk_id_proyecto: parseInt(row.id),
    nombre_proyecto: row.nombre,
    codigo_proyecto: row.codigo,
    sk_id_empresa: 1, // IC Constructora
    empresa: 'IC Constructora S.A.S.',
    ciudad: row.ciudad,
    macroproyecto: row.macroproyecto || null,
    company_id: 'ic-constructora'
  }));

  const { data, error } = await supabase
    .from('adpro_dim_proyecto')
    .insert(registros);

  if (error) {
    console.error('Error al cargar proyectos:', error);
  } else {
    console.log(`Cargados ${data.length} proyectos`);
  }
}
```

---

## 4. Integridad Referencial

### Validación Antes de Insertar FACT

```javascript
async function validarIntegridad(fact) {
  const checks = {
    // sk_id_proyecto existe
    proyecto: await supabase
      .from('adpro_dim_proyecto')
      .select('sk_id_proyecto')
      .eq('sk_id_proyecto', fact.sk_id_proyecto)
      .single(),
    
    // sk_id_insumo existe
    insumo: fact.sk_id_insumo ? await supabase
      .from('adpro_dim_insumo')
      .select('sk_id_insumo')
      .eq('sk_id_insumo', fact.sk_id_insumo)
      .eq('sk_id_empresa', fact.sk_id_empresa)
      .single() : { data: true },
    
    // sk_id_fecha existe
    fecha: await supabase
      .from('adpro_dim_fecha')
      .select('sk_id_fecha')
      .eq('sk_id_fecha', fact.sk_id_fecha)
      .single()
  };

  const allValid = Object.values(checks).every(check => !check.error);
  if (!allValid) {
    console.error('Validación fallida:', checks);
    return false;
  }
  return true;
}
```

---

## 5. Funciones de Agregación Comunes

### SUM (Total de costo)
```sql
SUM(f.valor_total) FILTER (WHERE f.sk_id_clase_origen = 5)  -- Solo "Invertido"
```

### AVG (Precio promedio)
```sql
AVG(f.valor_unitario) OVER (PARTITION BY f.sk_id_insumo)
```

### ROW_NUMBER (Ranking por proyecto)
```sql
ROW_NUMBER() OVER (PARTITION BY p.sk_id_proyecto ORDER BY f.valor_total DESC)
```

### LAG (Comparar mes vs mes anterior)
```sql
LAG(SUM(f.valor_total)) OVER (ORDER BY f.sk_id_fecha)
```

---

## 6. Políticas de Seguridad (RLS)

### Ejemplo: Lectura Restringida por Rol

```sql
CREATE POLICY adpro_fact_control_construccion ON adpro_fact_control_proyecto
  FOR SELECT
  USING (
    auth.jwt()->'app_metadata'->>'area' = 'construccion'
    OR auth.jwt()->'app_metadata'->>'role' = 'admin'
  );

CREATE POLICY adpro_fact_control_reporteria ON adpro_fact_control_proyecto
  FOR SELECT
  USING (
    auth.jwt()->'app_metadata'->>'role' IN ('admin', 'ceo', 'reporteria')
  );
```

### JWT Claims Esperados (Supabase Auth)

```json
{
  "aud": "authenticated",
  "sub": "user-uuid",
  "email": "usuario@ic.com",
  "app_metadata": {
    "area": "construccion",      // construccion | control | talento | ti | etc
    "role": "admin|user|viewer",
    "proyecto_ids": [1, 2, 5]   // Proyectos específicos (opcional)
  }
}
```

---

## 7. Performance Tips

### 1. Filtros tempranos
```sql
-- ❌ MALO: Filtra después de la agregación
SELECT * FROM adpro_fact_control_proyecto 
WHERE EXTRACT(YEAR FROM fecha) = 2026

-- ✅ BIEN: Filtra por sk_id_fecha antes de JOIN
WHERE sk_id_fecha >= 20260101 AND sk_id_fecha <= 20261231
```

### 2. Selecciona solo columnas necesarias
```javascript
// ❌ MALO
supabase.from('adpro_fact_control_proyecto').select('*')

// ✅ BIEN
supabase.from('adpro_fact_control_proyecto')
  .select('sk_id_proyecto, sk_id_fecha, valor_total, sk_id_insumo')
```

### 3. Usa índices existentes
Índices disponibles en cada FACT:
- `(sk_id_proyecto, sk_id_fecha, sk_id_clase_origen)` → Query común
- `(sk_id_empresa)` → Filtro global
- `(sk_id_insumo)` → Análisis de insumos

### 4. Paginación
```javascript
const { data, count } = await supabase
  .from('adpro_fact_control_proyecto')
  .select('*', { count: 'exact' })
  .range(0, 99);  // Primeros 100
```

---

## 8. Cargas Esperadas (Data Volumes)

| Tabla | Registros | Tamaño Estimado | Notas |
|-------|-----------|-----------------|-------|
| DIM_Fecha | 1,000 | 50 KB | 1 año de calendario |
| DIM_Proyecto | 500 | 100 KB | Proyectos + macroproyectos |
| DIM_Insumo | 32,000 | 2 MB | Catálogo completo |
| DIM_Items | 32,000 | 3 MB | 32K+ ítems de presupuesto |
| DIM_Tercero | 2,000 | 200 KB | Proveedores + contratistas |
| FACT_ControlProyecto | 836,000 | 100 MB | Histórico 2024-2025 |
| FACT_Compras | 50,000 | 5 MB | Órdenes de compra |
| FACT_Actas | 10,000 | 2 MB | Actas de cobro |
| FACT_EntradasAlmacen | 50,000 | 5 MB | Recepciones |
| **TOTAL** | **~1.5M** | **~150-200 MB** | Comprimido ~50 MB |

---

## 9. Troubleshooting

### Error: "Row level security violation"
**Causa:** `company_id` no coincide con filtro RLS  
**Solución:** Validar que todos los INSERT tengan `company_id = 'ic-constructora'`

### Error: "Foreign key constraint violated"
**Causa:** Referencia a sk_id que no existe en dimensión  
**Solución:** Verificar orden de carga (dimensiones primero, luego hechos)

### Query lenta (> 5s)
**Causa:** Falta de índice o filtro ineficiente  
**Solución:**
1. Usar `sk_id_fecha` (INT) en lugar de `fecha` (DATE)
2. Agregar filtro en sk_id_proyecto antes de agregaciones masivas
3. Revisar EXPLAIN PLAN

### No se ven los cambios
**Causa:** RLS bloqueando resultado  
**Solución:**
1. Verificar que usuario tiene `app_metadata` con `area` correcto
2. Testear query sin RLS en SQL Editor de Supabase

---

## 10. Roadmap

- [ ] Cargar DIM_Fecha (calendario 2024-2027)
- [ ] Cargar maestros (DIM_Empresa, DIM_Proyecto, DIM_Tercero, DIM_Insumo)
- [ ] Migrar 836K registros históricos de FACT_ControlProyecto
- [ ] Validar integridad referencial
- [ ] Crear políticas RLS por rol (construcción, control, reportería)
- [ ] Conectar Power BI a VFACT_ControlProyecto
- [ ] Integrar en React dashboard (useAdproControlProyecto hook)
- [ ] Agregar políticas de INSERT/UPDATE/DELETE (control de datos)

---

**Última actualización:** 2026-05-16  
**Autor:** Claude Code  
**Contacto:** Andrés Arango (Construcción)
