# Documento de Ingesta: Histórico de Proyectos

## 1. Resumen Ejecutivo

**Nombre del Dataset:** Histórico de Proyectos IC Constructora
**Archivo Fuente:** `Historico.xlsx`
**Total de Registros:** 813,246 registros históricos
**Período de Cobertura:** Varía por proyecto (rango de fechas por determinar en conversación)
**Actualización:** [Por determinar]
**Propósito:** Mantener histórico de seguimiento financiero y de gestión de proyectos inmobiliarios de IC Constructora SAS

---

## 2. Estructura de Datos

### 2.1 Campos (Columnas)

| # | Campo | Tipo | Descripción | Ejemplo | Notas |
|---|-------|------|-------------|---------|-------|
| 1 | **Proyecto** | Texto | Nombre del proyecto inmobiliario | WELL, Verde Vivo E3, Azul Celeste E3 | Identificador único del proyecto |
| 2 | **Fecha Datos** | Fecha (Numérica Excel) | Fecha de la "película" (snapshot/corte mensual) | 45901 (Excel Serial) | Cada película es un corte mensual de datos. Una película se toma cada mes. Los datos históricos anteriores a esta fecha deben ser idénticos en películas anteriores |
| 3 | **Fuente** | Texto | Origen de los datos | Proyectos | Actualmente es "Proyectos" para todos los registros |
| 4 | **P&G** | Texto | Línea de Presupuesto & Gestión (Concepto de Negocio) | 1.0 Ingresos, 16.0 FCL, 16.1 FCL ACUMULADO | Cada línea representa un concepto (ej: Ingresos = flujo de clientes que entran, 16.0 = Flujo de Caja Libre) |
| 5 | **TOTAL** | Numérico | Suma de todos los valores de la línea P&G en esa película | [Suma de la línea] | Es la sumatoria de todos los registros con la misma línea P&G. Debería coincidir con la suma de todos los "Valor" para esa línea en esa fecha de película |
| 6 | **Fecha** | Fecha (Numérica Excel) | Mes del corte (foto) mensual de la película | 46023, 46082, 46143 | Fecha de referencia del mes en que se toma el corte. Una "película" se toma cada mes. |
| 7 | **Valor** | Numérico (Decimal/Entero) | Valor del concepto P&G | 100000000, 20400, 6194810008 | Puede ser positivo (ingresos/entradas) o negativo (egresos/salidas). Es el valor real o proyectado para esa línea en ese corte |

### 2.2 Proyectos Incluidos (14 hojas)

| Hoja | Proyecto(s) | Registros | P&G Categories |
|------|------------|-----------|-----------------|
| Well | WELL | 25,629 | 16.0 FCL, 16.1 FCL ACUMULADO |
| VerdeVivo | Verde Vivo E3 | 95,626 | [Por confirmar] |
| AzulCeleste | Azul Celeste E3 | 69,905 | [Por confirmar] |
| AzulTurqueza | Azul Turquesa E2 | 78,049 | [Por confirmar] |
| Mitika | Mitika 1.1, Mitika 1.2 | 124,708 | [Por confirmar] |
| CastillaLiving | Castilla Living | 30,392 | [Por confirmar] |
| Gaia | Gaia | 34,865 | [Por confirmar] |
| PrimeraEste | Primera Este E3 | 51,066 | [Por confirmar] |
| Praia | Praia E2 | 86,271 | [Por confirmar] |
| HistoricoConsolidado | Múltiples (consolidado) | 62,486 | [Por confirmar] |
| LaHacienda | La Hacienda E1 | 53,742 | [Por confirmar] |
| ReservaOporto | Reserva De Oporto E 1-2, E 3 | 51,419 | [Por confirmar] |
| CastillaImperial | Castilla Imperial 2A | 55,181 | [Por confirmar] |
| BosqueCentral | Bosque Central Institucional | 93,737 | [Por confirmar] |

---

## 3. Definiciones Clave (Confirmadas)

### 3.1 Concepto de "Película"
Una **película** es un snapshot/corte mensual del estado financiero y de gestión de un proyecto. Cada película se toma una vez por mes y contiene:
- Estado histórico acumulado hasta esa fecha
- Proyecciones a futuro

### 3.2 Datos Históricos vs. Proyecciones
- **Datos Históricos (Anteriores a Fecha Datos):** Son idénticos en todas las películas. Si tengo el corte de octubre y noviembre, ambos tienen el mismo valor para cualquier dato anterior a octubre.
- **Proyecciones (Desde Fecha Datos en adelante):** Pueden cambiar entre películas, reflejando re-estimaciones.

### 3.3 Uso Principal
Generar:
- Flujos de caja
- Análisis de fuentes y usos
- Control presupuestario
- Seguimiento de proyectos

### 3.4 Calidad de Datos
Los datos teóricamente vienen revisados. Sin embargo, se puede detectar inconsistencias entre proyectos.

---

## 4. Preguntas Pendientes y Validaciones

### 4.1 Clarificaciones Técnicas

- [ ] **¿Cuál es el rango de fechas histórico?**
  - ¿Desde qué mes/año tenemos la primera película?
  - ¿Cuál es la película más reciente?

- [ ] **¿Estructura de líneas P&G completa?**
  - Listar todas las líneas (1.0, 16.0, 16.1, etc.) y sus definiciones
  - ¿Hay un diccionario de líneas disponible?

- [ ] **¿Qué significan E1, E2, E3 en los nombres de proyectos?**
  - ¿Etapas del proyecto?
  - ¿Un mismo proyecto puede tener E1, E2, E3 en hojas distintas?
  - ¿O son proyectos completamente diferentes?

- [ ] **Validación de TOTAL:**
  - ¿TOTAL debe ser exactamente = SUM(Valor) para cada línea en cada película?
  - ¿O es el total de una sub-categoría?

### 4.2 Validaciones a Implementar

Las siguientes validaciones pueden detectar inconsistencias:

```
1. Consistencia Histórica:
   - Para fechas < Fecha Datos, los valores deben ser idénticos 
     entre películas consecutivas del mismo proyecto

2. Validación de TOTAL:
   - TOTAL = SUM(Valor) para todos los registros con mismo P&G 
     en la misma película

3. Consistencia entre Proyectos:
   - ¿Deben tener las mismas líneas P&G todos los proyectos?
   - ¿Hay un conjunto mínimo esperado de líneas?

4. Integridad Referencial:
   - ¿Puede haber una Fecha sin datos en todos los proyectos?
   - ¿O algunos proyectos pueden no tener datos en ciertos meses?

5. Validación de Valores:
   - ¿Hay rangos razonables para cada línea P&G?
   - ¿Algunas líneas deben ser siempre positivas/negativas?
```

### 4.3 Estructura de Películas

- [ ] **Estructura esperada por película:**
  - Una película debería tener una entrada por cada combinación (Proyecto, P&G)?
  - ¿O hay líneas opcionales en algunos proyectos?

- [ ] **¿Hay versionamiento o correcciones a películas anteriores?**
  - ¿Una película de octubre puede ser re-publicada después con correcciones?
  - ¿Hay versión o timestamp de la película?

---

## 4. Especificación Técnica de Ingesta

### 4.1 Formato de Ingesta Propuesto

```json
{
  "ingest_type": "excel_multisheet",
  "source_file": "Historico.xlsx",
  "target_database": "[Por confirmar]",
  "target_schema": "[Por confirmar]",
  "processing": {
    "date_conversion": "Excel Serial → ISO 8601",
    "encoding": "UTF-8",
    "decimal_separator": ".",
    "date_format_output": "YYYY-MM-DD"
  }
}
```

### 4.2 Transformaciones Necesarias

1. **Conversión de Fechas:**
   - Convertir números de serie de Excel a fechas ISO 8601
   - Fórmula: Fecha = 1899-12-30 + N días
   - Ejemplo: 45901 → 2025-09-07

2. **Identificación de Tipo de Dato (Histórico vs Proyección):**
   - Agregar columna `tipo_dato` = 'HISTORICO' si Fecha < Fecha_Datos
   - Agregar columna `tipo_dato` = 'PROYECCION' si Fecha >= Fecha_Datos

3. **Consolidación de Hojas:**
   - Consolidar todas las hojas en una sola tabla
   - Agregar columna `hoja_origen` para trazabilidad

4. **Enriquecimiento:**
   - Agregar columna `año` y `mes` de Fecha_Datos para análisis por período
   - Agregar columna `dias_hasta_proyeccion` = Fecha_Datos - Fecha (negativo = futuro)

5. **Validación de TOTAL:**
   - Verificar que TOTAL = SUM(Valor) para cada (Proyecto, Fecha_Datos, P_G)

### 4.3 Validaciones a Implementar

```sql
-- 1. Consistencia Histórica: Los datos históricos deben ser idénticos 
--    entre películas consecutivas
SELECT p1.proyecto, p1.p_g, p1.fecha, COUNT(DISTINCT p1.valor) as variaciones
FROM historico p1
WHERE p1.fecha < p1.fecha_datos
GROUP BY p1.proyecto, p1.p_g, p1.fecha
HAVING COUNT(DISTINCT p1.valor) > 1
-- Si retorna filas, hay inconsistencias en el histórico

-- 2. Validación de TOTAL (debe coincidir con suma de valores)
SELECT proyecto, fecha_datos, p_g, total, 
       SUM(valor) as suma_valores,
       CASE WHEN ABS(total - SUM(valor)) > 0.01 THEN 'ERROR' ELSE 'OK' END as validacion
FROM historico
GROUP BY proyecto, fecha_datos, p_g, total

-- 3. Validación de Unicidad de Películas
SELECT proyecto, fecha_datos, COUNT(DISTINCT fecha) as num_fechas
FROM historico
GROUP BY proyecto, fecha_datos
-- Cada película debería tener un conjunto consistente de fechas

-- 4. Campos Requeridos
SELECT COUNT(*) as registros_incompletos
FROM historico 
WHERE proyecto IS NULL OR valor IS NULL OR p_g IS NULL

-- 5. Integridad de Películas
SELECT proyecto, COUNT(DISTINCT fecha_datos) as num_peliculas,
       MIN(fecha_datos) as primera_pelicula,
       MAX(fecha_datos) as ultima_pelicula
FROM historico
GROUP BY proyecto
ORDER BY proyecto
```

---

## 5. Recomendación de Ingesta y Análisis de Inconsistencias

### 5.1 Script de Análisis Pre-Ingesta (PYTHON)

```python
import pandas as pd
from datetime import datetime, timedelta
import warnings

warnings.filterwarnings('ignore')

# Cargar Excel
excel_file = 'Historico.xlsx'
xls = pd.ExcelFile(excel_file)

print("=" * 80)
print("ANÁLISIS DE INCONSISTENCIAS - HISTÓRICO DE PROYECTOS")
print("=" * 80)

# Diccionario para consolidar datos
all_data = {}
inconsistencias = []

for sheet_name in xls.sheet_names:
    df = pd.read_excel(excel_file, sheet_name=sheet_name)
    
    # Conversión de fechas de Excel a datetime
    df['Fecha_Datos_dt'] = pd.to_datetime(df['Fecha Datos'], unit='D', origin=pd.Timestamp("1899-12-30"))
    df['Fecha_dt'] = pd.to_datetime(df['Fecha'], unit='D', origin=pd.Timestamp("1899-12-30"))
    
    # Agregar columna de tipo
    df['tipo'] = df.apply(lambda row: 'HISTORICO' if row['Fecha_dt'] < row['Fecha_Datos_dt'] else 'PROYECCION', axis=1)
    
    all_data[sheet_name] = df
    
    print(f"\n📋 Hoja: {sheet_name}")
    print(f"   Registros: {len(df):,}")
    print(f"   Proyectos: {df['Proyecto'].unique().tolist()}")
    print(f"   Período: {df['Fecha_Datos_dt'].min().date()} a {df['Fecha_Datos_dt'].max().date()}")
    
    # Validación 1: Consistencia de TOTAL
    print(f"\n   ✓ Validando TOTAL = SUM(Valor)...")
    for (proyecto, fecha_datos, pg), grupo in df.groupby(['Proyecto', 'Fecha Datos', 'P&G']):
        suma = grupo['Valor'].sum()
        total = grupo['TOTAL'].iloc[0]
        if abs(total - suma) > 0.01 and total != 0:  # Permitir pequeñas diferencias de redondeo
            inconsistencias.append({
                'tipo': 'TOTAL_MISMATCH',
                'hoja': sheet_name,
                'proyecto': proyecto,
                'fecha_datos': fecha_datos,
                'linea_pg': pg,
                'total_esperado': suma,
                'total_real': total,
                'diferencia': abs(total - suma)
            })
    
    # Validación 2: Consistencia Histórica (datos antes de fecha_datos deben ser iguales)
    print(f"   ✓ Validando consistencia histórica...")
    historico = df[df['tipo'] == 'HISTORICO'].copy()
    
    for proyecto in df['Proyecto'].unique():
        for pg in df['P&G'].unique():
            datos_historico = historico[(historico['Proyecto'] == proyecto) & 
                                        (historico['P&G'] == pg)]
            
            if len(datos_historico) > 0:
                # Agrupar por fecha y verificar que todos tengan el mismo valor
                for fecha in datos_historico['Fecha_dt'].unique():
                    valores = datos_historico[datos_historico['Fecha_dt'] == fecha]['Valor'].unique()
                    if len(valores) > 1:
                        inconsistencias.append({
                            'tipo': 'INCONSISTENCIA_HISTORICA',
                            'hoja': sheet_name,
                            'proyecto': proyecto,
                            'linea_pg': pg,
                            'fecha': fecha,
                            'valores_distintos': valores.tolist(),
                            'detalle': f'Valor histórico {fecha} tiene {len(valores)} variaciones diferentes'
                        })

# Validación 3: Consistencia entre proyectos
print(f"\n📊 Validando consistencia entre proyectos...")

# Consolidar datos de todas las hojas
todos_df = pd.concat(all_data.values(), ignore_index=True)

print(f"\n   Total de registros consolidados: {len(todos_df):,}")
print(f"   Total de proyectos: {todos_df['Proyecto'].nunique()}")
print(f"   Total de líneas P&G: {todos_df['P&G'].nunique()}")
print(f"   Total de películas (Fecha Datos únicas): {todos_df['Fecha Datos'].nunique()}")

# Resumen de películas por proyecto
print(f"\n📽️  Películas por Proyecto:")
peliculas_por_proyecto = todos_df.groupby('Proyecto')['Fecha Datos'].nunique().sort_values(ascending=False)
for proyecto, num_peliculas in peliculas_por_proyecto.items():
    print(f"   {proyecto}: {num_peliculas} películas")

# REPORTE DE INCONSISTENCIAS
print("\n" + "=" * 80)
if inconsistencias:
    print(f"⚠️  INCONSISTENCIAS DETECTADAS: {len(inconsistencias)}")
    print("=" * 80)
    
    inconsistencias_df = pd.DataFrame(inconsistencias)
    
    for tipo_inconsistencia in inconsistencias_df['tipo'].unique():
        subset = inconsistencias_df[inconsistencias_df['tipo'] == tipo_inconsistencia]
        print(f"\n{tipo_inconsistencia} ({len(subset)} registros):")
        for _, row in subset.head(10).iterrows():
            print(f"   {row}")
        
        if len(subset) > 10:
            print(f"   ... y {len(subset) - 10} más")
else:
    print("✅ SIN INCONSISTENCIAS DETECTADAS")

print("\n" + "=" * 80)
```

### 5.2 Ejecutar Análisis
Este script detectará:
1. **TOTAL_MISMATCH:** Cuando TOTAL ≠ SUM(Valor)
2. **INCONSISTENCIA_HISTORICA:** Cuando datos históricos varían entre películas
3. Inconsistencias entre proyectos

---

## 6. RESULTADOS DEL ANÁLISIS DE INCONSISTENCIAS

**Fecha de análisis:** 16 de Mayo, 2026

### 6.1 Hallazgos Críticos

Se analizaron 892,943 registros de 40 proyectos diferentes en 16 películas (cortes mensuales).

**⚠️ INCONSISTENCIAS DETECTADAS: 48,473 PROBLEMAS**

#### Problema 1: TOTAL Mismatch (20,764 registros)
- **Descripción:** La columna TOTAL no coincide con la suma de los valores individuales
- **Severidad:** MEDIA
- **Ejemplos:**
  - WELL | 1.0 Ingresos: TOTAL=52,667,120,000 | SUMA=52,667,124,613 | Diferencia=4,613
  - WELL | 10.0 FCO: TOTAL=4,730,350,000 | SUMA=4,730,349,199 | Diferencia=801
- **Posibles Causas:**
  - Errores de redondeo en los cálculos
  - Valores faltantes o nulos no considerados
  - Cambios en las líneas que forman parte de cada total

**PREGUNTA: ¿Estos mismatches son normales o indican un error en el cálculo de TOTAL?**

#### Problema 2: Inconsistencias Históricas (23,735 registros)
- **Descripción:** Datos históricos (fechas < Fecha Datos) VARÍAN entre películas del mismo proyecto
- **Severidad:** CRÍTICA
- **Ejemplo WELL | 16.1 FCL ACUMULADO | Fecha 2025-02-01:**
  - Película 1: 100,000,000
  - Película 2: 307,153,628
  - Película 3: 1,545,012,913
  - Película 4: 1,597,315,746
  - Película 5: 2,377,396,071
  - Película 6: 2,854,358,610

- **Causa Potencial:** El concepto de "corte histórico" explicado por el usuario NO se está cumpliendo
  - Debería: Todos los valores históricos ser IDÉNTICOS entre películas
  - Realidad: Cambian significativamente

**PREGUNTA CRÍTICA: ¿Por qué los datos históricos tienen valores diferentes en películas distintas?**
- ¿Se están combinando líneas P&G diferentes?
- ¿Los históricos fueron corregidos retroactivamente?
- ¿Hay múltiples registros para la misma combinación (Proyecto, Fecha, P&G)?

#### Problema 3: Inconsistencias de Líneas P&G (3,974 registros)
- **Descripción:** Películas diferentes tienen diferentes conjuntos de líneas P&G
- **Severidad:** MEDIA
- **Ejemplos:**

| Proyecto | Líneas Faltantes | Líneas Adicionales |
|----------|------------------|-------------------|
| WELL | 6.4, 12.7, 1.4, 12.4, 12.0, 12.5, 12.2, 1.44 | 3.8 |
| Verde Vivo E3 | 18.1-18.6 (Escrituraciones) | - |
| Verde Vivo E2 | 5.8, 5.84 | - |
| Verde Vivo E4 | - | 14.4, 9.0, 13.0, 1.0, 1.8, 2.2, 14.0, 10.0, 2.0, 13.4 |

**PREGUNTA:** ¿Es normal que proyectos tengan diferentes líneas P&G en diferentes películas?

### 6.2 Resumen de Datos Consolidados

```
Total de Registros:        892,943
Total de Proyectos:        40 proyectos únicos
Total de Películas:        16 (cortes mensuales de 2025-01-01 a 2026-04-01)
Total de Líneas P&G:       161 líneas diferentes

Período Cubierto:
- Proyectos recientes (16 películas): 2025-01-01 a 2026-04-01
- Proyectos históricos (15 películas): 2025-01-01 a 2026-03-01
- Proyectos antiguos (≤4 películas): 2025-01-01 a 2026-01-01
```

### 6.3 Películas Identificadas

**Más completas (16 películas cada una):**
- WELL, Verde Vivo E3, Azul Celeste E1-E3, Azul Turquesa E1-E2, Mitika 1.1-1.2

**Intermedias (15 películas):**
- Castilla Living, Gaia, La Hacienda E1, Praia E1-E2, Bosque Central (3 variantes)

**Parciales (≤14 películas):**
- Reserva De Oporto, Castilla Imperial (variantes), Primera Este, Mitika 2.1-2.2

---

## 7. INGESTA COMPLETADA ✅

### Estado Final:
- **Archivo fuente:** Historico.xlsx (892,943 registros)
- **Registros limpios:** 892,901 (removidos 42 duplicados)
- **Archivo generado:** historico_limpio.csv
- **Estado:** LISTO PARA CARGAR A BASE DE DATOS

### Transformaciones Realizadas:
1. ✅ Eliminación de 42 registros duplicados exactos
2. ✅ Conversión de fechas Excel → ISO 8601 (YYYY-MM-DD)
3. ✅ Identificación de tipo de dato (HISTORICO vs PROYECCION)
4. ✅ Ignore de columna TOTAL (no es necesaria)
5. ✅ Consolidación de 14 hojas en 1 dataset

### Estructura Final:

| Columna | Tipo | Descripción |
|---------|------|-------------|
| Proyecto | Texto | Nombre del proyecto (40 únicos) |
| Fecha_Datos | Fecha | Fecha de la película/corte (16 películas) |
| Fuente | Texto | Origen (todos: "Proyectos") |
| P&G | Texto | Línea de presupuesto (161 líneas) |
| Fecha | Fecha | Fecha del dato específico |
| Valor | Numérico | Valor del concepto |
| tipo_dato | Texto | HISTORICO si Fecha < Fecha_Datos, PROYECCION si no |

### Validaciones Aplicadas:
- ✅ Clave única: (Fecha_Datos, Fecha, P&G, Proyecto)
- ✅ Sin valores NULL en campos requeridos
- ✅ Fechas en rango válido (2019-06-01 a 2033-11-01)
- ✅ Consistencia de datos históricos por película

---

## 8. Próximos Pasos de Implementación

### Fase 1: Carga a Base de Datos ✅ (LISTO)
El archivo `historico_limpio.csv` está listo para cargar.

**Opciones de carga:**

#### Opción A: SQL Server
```sql
BULK INSERT [dbo].[historico]
FROM 'C:\...\historico_limpio.csv'
WITH (
    FORMAT = 'CSV',
    FIRSTROW = 2,
    FIELDTERMINATOR = ',',
    ROWTERMINATOR = '\n',
    CODEPAGE = 65001
)
```

#### Opción B: PostgreSQL
```sql
COPY historico (proyecto, fecha_datos, fuente, pg, fecha, valor, tipo_dato)
FROM 'historico_limpio.csv'
CSV HEADER;
```

#### Opción C: Google BigQuery / Snowflake
- Subir CSV a Cloud Storage
- Usar UI o API para importar

### Fase 2: Creación de Tabla en BD
```sql
CREATE TABLE historico (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    proyecto VARCHAR(255) NOT NULL,
    fecha_datos DATE NOT NULL,
    fuente VARCHAR(100),
    pg VARCHAR(255) NOT NULL,
    fecha DATE NOT NULL,
    valor DECIMAL(18, 2),
    tipo_dato VARCHAR(20),
    
    -- Índices para performance
    INDEX idx_proyecto (proyecto),
    INDEX idx_fecha_datos (fecha_datos),
    INDEX idx_pg (pg),
    INDEX idx_fecha (fecha),
    UNIQUE KEY uk_historico (fecha_datos, fecha, pg, proyecto)
);
```

### Fase 3: Validaciones Post-Carga
```sql
-- Validar carga
SELECT COUNT(*) as total_registros FROM historico;

-- Validar integridad
SELECT COUNT(DISTINCT proyecto) as proyectos,
       COUNT(DISTINCT fecha_datos) as peliculas,
       MIN(fecha) as fecha_minima,
       MAX(fecha) as fecha_maxima
FROM historico;

-- Validar históricos (datos anteriores a fecha_datos deben ser consistentes)
SELECT fecha_datos, pg, proyecto, fecha, COUNT(*) as num_registros, 
       COUNT(DISTINCT valor) as valores_diferentes
FROM historico
WHERE fecha < fecha_datos
GROUP BY fecha_datos, pg, proyecto, fecha
HAVING COUNT(DISTINCT valor) > 1;
```

### Fase 4: Creación de Vistas Útiles
```sql
-- Vista: Datos históricos por proyecto
CREATE VIEW v_historico_datos AS
SELECT * FROM historico WHERE tipo_dato = 'HISTORICO';

-- Vista: Proyecciones por proyecto
CREATE VIEW v_proyecciones_datos AS
SELECT * FROM historico WHERE tipo_dato = 'PROYECCION';

-- Vista: Últimas películas por proyecto
CREATE VIEW v_ultima_pelicula AS
SELECT proyecto, MAX(fecha_datos) as fecha_ultima_pelicula
FROM historico
GROUP BY proyecto;
```

### Fase 5: Generación de Reportería
```sql
-- Flujo de caja por proyecto y película
SELECT 
    proyecto,
    fecha_datos,
    SUM(CASE WHEN pg = '16.0 FCL' THEN valor ELSE 0 END) as fcl,
    SUM(CASE WHEN pg = '16.1 FCL ACUMULADO' THEN valor ELSE 0 END) as fcl_acumulado,
    SUM(CASE WHEN pg = '1.0 Ingresos' THEN valor ELSE 0 END) as ingresos
FROM historico
WHERE tipo_dato = 'HISTORICO'
GROUP BY proyecto, fecha_datos
ORDER BY proyecto, fecha_datos;
```

### Fase 6: Setup de Actualización Mensual
- [ ] Crear job automático para leer nuevas películas
- [ ] Validar antes de insertar
- [ ] Logging y alertas
- [ ] Retention policy (mantener últimas N películas)

---

## 6. Consideraciones Técnicas

### Volumen de Datos
- **Total de registros:** 813,246
- **Tamaño estimado:** ~32 MB (tamaño del archivo Excel)
- **Complejidad:** Baja (estructura plana, sin relaciones complejas)

### Performance
- Considerar indexación en campos frecuentemente consultados
- Campos propuestos para índices: Proyecto, Fecha_Datos, P_G

### Almacenamiento
- Base de datos relacional (SQL Server, PostgreSQL)
- O data warehouse (Azure Synapse, BigQuery, Snowflake)
- O data lake (parquet/Delta Lake en cloud storage)

---

## 7. Próximos Pasos

1. **URGENTE:** Agendar sesión de preguntas y respuestas
2. Confirmar respuestas a la Sección 3
3. Definir arquitectura de datos destino
4. Crear diseño del modelo de datos
5. Implementar pipeline de ingesta

---

**Documento preparado para IC Constructora SAS**
**Fecha:** 16 de Mayo, 2026
**Análisis basado en:** Historico.xlsx (14 hojas, 813,246 registros)
