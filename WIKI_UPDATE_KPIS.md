# 📊 Actualización Wiki — KPIs: TIR K y TIR Operativa

**Para copiar/pegar en:** `c:\Users\jmacallister\OneDrive - IC CONSTRUCTORA SAS\Documentos\ICEOS\IC-EOS\wiki\`

**Archivo destino sugerido:** `6-Financiero/KPI-TIR.md`

---

## 📋 KPI: TIR K y TIR Operativa — Proyectos FlujoHistorico

**Última actualización:** 2026-05-16  
**Datos:** Histórico de proyectos cargados en Supabase (892,901 registros)  
**Estado:** 🟢 Listo para cálculo en aplicación Tracción

### Resumen Ejecutivo

Se han identificado y documentado dos métricas clave de retorno para los proyectos inmobiliarios de IC Constructora:

| Métrica | Definición | Aplicación |
|---------|-----------|-----------|
| **TIR K** | Tasa Interna de Retorno del Capital invertido (aportes vs reintegros de socios IC + socios externos) | Evaluar retorno sobre inversión de capital en cada proyecto |
| **TIR Operativa** | Tasa Interna de Retorno de flujos operacionales (ingresos por ventas menos costos de operación) | Evaluar eficiencia operacional del proyecto independiente de financiamiento |

---

### 1. TIR K (Capital)

**Definición:** Tasa de retorno del capital invertido desde el inicio del proyecto hasta hoy, considerando:
- Aportes de IC Constructora (desembolsos)
- Aportes de socios (desembolsos)
- Reintegros a IC (entradas de capital retornado)
- Reintegros a socios (entradas)

**Fórmula:**
```
VPN = Σ [Flujo_t / (1 + TIR K)^t] = 0

Donde:
  Flujo_t = Reintegros IC + Reintegros Socio - Aportes IC - Aportes Socio
  t = número de períodos (meses) desde inicio
  TIR K = tasa que anula el VPN
```

**Líneas P&G utilizadas:**

| Línea | Descripción | Significado |
|-------|-------------|-------------|
| 13.2 | Aportes IC | Desembolsos de IC (negativo = salida) |
| 13.4 | Reintegros IC | Retorno de capital a IC (positivo = entrada) |
| 14.2 | Aportes Socio | Desembolsos de socios (negativo = salida) |
| 14.4 | Reintegros Socio | Retorno de capital a socios (positivo = entrada) |

**Construcción de serie:**
```
Mes         Aporte IC  Aporte Socio  Reintegro IC  Reintegro Socio  Flujo Neto
─────────────────────────────────────────────────────────────────────────────
2019-06     -100,000           0              0                0      -100,000
2019-07      -50,000    -20,000              0                0       -70,000
2020-01           0             0         10,000            5,000       15,000
...
2026-04            0             0              0                0             0
```

**Interpretación:**
- **TIR K > 20%**: Excelente retorno de capital
- **TIR K 15-20%**: Buen retorno
- **TIR K 10-15%**: Retorno moderado
- **TIR K < 10%**: Retorno bajo
- **TIR K negativo**: Proyecto deficitario en capital

---

### 2. TIR Operativa

**Definición:** Tasa de retorno de los flujos operacionales (ingresos de ventas menos costos operacionales), independiente de financiamiento.

**Fórmula:**
```
VPN_Op = Σ [FCO_t / (1 + TIR Op)^t] = 0

Donde:
  FCO_t = Ingresos - Costos Directos - Costos Indirectos - Honorarios - Financieros
  t = número de períodos (meses)
  TIR Op = tasa que anula el VPN operacional
```

**Líneas P&G utilizadas:**

| Línea | Descripción | Rol |
|-------|-------------|-----|
| 1.0 | Ingresos (total) | Entradas por ventas, fiducia, créditos |
| 3.0 | Costo Directo Total | Construcción, lote, urbanismo |
| 4.0 | Costo Indirecto | Administrativos, generales |
| 5.0 | Honorarios | Construcción, comercialización, gerencia |
| 6.0 | Financieros | Intereses, correcciones monetarias |
| 9.0 | TOTAL COSTOS | Suma de todos los costos |
| 10.0 | FCO | Flujo de Caja Operativo = 1.0 - 9.0 |

**Construcción de serie (método alternativo):**
```
Mes      Ingresos  - Costos Directos - Costos Indir. - Honorarios - Financieros = FCO
─────────────────────────────────────────────────────────────────────────────────────
2019-06       0              0               0              0            0        0
2020-01   50,000       (20,000)           (5,000)         (2,000)      (1,000)  22,000
2020-02   60,000       (25,000)           (5,500)         (2,000)      (1,200)  26,300
...
```

**Interpretación:**
- **TIR Op > 25%**: Operación muy rentable
- **TIR Op 15-25%**: Operación rentable
- **TIR Op 5-15%**: Operación moderada
- **TIR Op < 5%**: Operación poco rentable
- **TIR Op negativo**: Operación deficitaria

---

### 3. Proyectos Activos (FlujoHistorico)

Los siguientes 5 proyectos tienen datos completos para cálculo de TIR:

| Proyecto | Etapas | Registros | Películas | Estado |
|----------|--------|-----------|-----------|--------|
| **Well** | 1 | 27,149 | 16 | ✅ Completo |
| **Verde Vivo** | E1, E2, E3, E4 | 101,922 | 16 | ✅ Completo |
| **Azul Celeste** | E1, E2, E3, E4 | 74,670 | 16 | ✅ Completo |
| **Azul Turquesa** | E1, E2, E3, E4 | 82,805 | 16 | ✅ Completo |
| **Mitika** | E1, E2, E3, E4 (8 sub-proy.) | 124,708 | 16 | ✅ Completo |

**Películas disponibles:** 16 cortes mensuales desde 2025-01-01 hasta 2026-04-01

---

### 4. Cálculo y Almacenamiento

**En aplicación Tracción:**

- [ ] Crear hook `useKpisProyectos.js` que:
  - Cargue flujos de Supabase por líneas P&G
  - Implemente `calcularTirK()` y `calcularTirOperativa()`
  - Retorne valores para cada proyecto y película

- [ ] Crear tabla/vista para resultados KPI:
  ```
  kpis_proyectos:
    - proyecto_id
    - fecha_calculo (película)
    - metrica (TIR_K, TIR_OPERATIVA)
    - valor (%)
    - fecha_creacion
  ```

- [ ] Agregar visualización en dashboard Tracción

---

### 5. Validaciones Críticas

**Antes de publicar KPIs:**

- [ ] Verificar que `10.0 FCO` = `1.0 Ingresos - 9.0 Total Costos` (muestreo en 3-5 proyectos)
- [ ] Confirmar que signos de aportes/reintegros son correctos (puede haber inversión de signo)
- [ ] Revisar película 2025-10-01 que tiene spike de 127% en registros (posible consolidación histórica)
- [ ] Validar que cada proyecto tenga todas las 16 películas
- [ ] Comparar TIR calculada con métricas manuales en Excel como sanity check

---

### 6. Contacto y Referencias

**Responsables:**

- **Cálculo e implementación:** Luis Miguel Serrano (TI)
- **Validación de líneas P&G:** Andrés Arango (Construcción)
- **Interpretación de resultados:** Juan Paulo McAllister (CEO), Marcela Arroyave (Control)

**Documentación relacionada:**

- `ANALISIS_HISTORICO_KPI.md` — Análisis técnico completo (161 líneas P&G, 40 proyectos)
- `flujo_historico.md` — Especificación de tabla de datos
- `estructura_archivos.md` — Formato de Excel Historico.xlsx

---

**Wiki actualizada:** 2026-05-16  
**Próxima revisión:** Cuando se implemente cálculo en Tracción
