# ✅ Validación de KPIs Proyectos — Acción para Andrés Arango

**Para:** Andrés Arango (Gerente Construcción)  
**Asunto:** Validar líneas de Presupuesto & Gestión (P&G) para cálculo automático de TIR  
**Fecha límite sugerida:** Antes de 2026-06-01  
**Esfuerzo:** 30-45 minutos

---

## 🎯 Qué necesitamos validar

Se han identificado **6 líneas P&G** que alimentan el cálculo automático de dos KPIs financieros clave.

Necesitamos tu confirmación de que:
1. Las líneas son correctas
2. Los signos de los flujos son correctos
3. Los datos están limpios

---

## 📌 Líneas a Validar

### Grupo 1: TIR K (Retorno de Capital)

**Propósito:** Medir retorno de la inversión de capital (IC Constructora + Socios)

| Línea | Nombre | Significado | ✅ Correcto? |
|-------|--------|-------------|-------------|
| **13.2** | Aportes IC | Desembolsos / inversión de IC (flujo negativo) | ☐ Sí ☐ No |
| **13.4** | Reintegros IC | Retorno de capital a IC (flujo positivo) | ☐ Sí ☐ No |
| **14.2** | Aportes Socio | Desembolsos / inversión de socios (flujo negativo) | ☐ Sí ☐ No |
| **14.4** | Reintegros Socio | Retorno de capital a socios (flujo positivo) | ☐ Sí ☐ No |

**Ejemplo de flujo correcto:**
```
Mes        13.2    13.4    14.2    14.4    Flujo Neto
───────────────────────────────────────────────────
2019-06   -100M      0       0       0      -100M  (inversión)
2020-01       0    10M       0     5M       +15M  (retorno)
2020-02       0    15M       0     8M       +23M  (retorno)
```

---

### Grupo 2: TIR Operativa (Retorno Operacional)

**Propósito:** Medir rentabilidad de operación (independiente de financiamiento)

| Línea | Nombre | Significado | ✅ Correcto? |
|-------|--------|-------------|-------------|
| **1.0** | Ingresos | Total ingresos por ventas, fiducia, créditos | ☐ Sí ☐ No |
| **9.0** | Total Costos | Suma de todos costos: directos, indirectos, financieros | ☐ Sí ☐ No |

**Validación:** En una muestra de 3-5 proyectos, verificar que:
```
Línea 10.0 (FCO) = Línea 1.0 (Ingresos) - Línea 9.0 (Total Costos)
```

---

## 🔍 Checklist de Validación

Haz esto para los proyectos: **Well, Verde Vivo, Azul Celeste, Azul Turquesa**

### 1. Verificar Signos de Flujos K

En Proyectos.xlsx o tu sistema, toma una película (mes) y verifica:

- [ ] Línea 13.2 (Aportes IC) tiene valores **negativos** (es inversión que sale)
- [ ] Línea 13.4 (Reintegros IC) tiene valores **positivos** (es dinero que vuelve)
- [ ] Línea 14.2 (Aportes Socio) tiene valores **negativos**
- [ ] Línea 14.4 (Reintegros Socio) tiene valores **positivos**

**Si encuentras lo contrario, reportar error a TI.**

### 2. Validar FCO = Ingresos - Costos

Abre 3 películas (ej: 2025-06, 2025-12, 2026-03) y verifica:

```
FCO (Línea 10.0) ≈ Ingresos (1.0) - Total Costos (9.0)

Diferencia aceptable: < 0.1% (errores de redondeo)
```

Si la diferencia es > 1%, reportar anomalía.

### 3. Revisar Spike Octubre 2025

La película de **2025-10-01** tiene 127% más registros de lo normal.

Posibles causas:
- Consolidado histórico adicional
- Corrección masiva de datos
- Error de carga

**Acción:** Revisar si es normal o hay que investigar.

---

## 📊 Dónde ver los KPIs en Tracción

**URL:** `/kpis` → Pestaña "KPIs Proyectos (Financiero)"

Verás:
- Gráfico línea para cada proyecto (Well, Verde Vivo, etc.)
- Dos líneas por gráfico:
  - **Azul:** TIR K (%)
  - **Púrpura:** TIR Operativa (%)
- Rango: 2025-01 → 2026-04 (16 películas)

---

## 🎬 Qué significan los números

### TIR K (Retorno de Capital)

- **> 20%:** Excelente retorno del capital
- **15-20%:** Buen retorno
- **10-15%:** Retorno moderado
- **< 10%:** Retorno bajo
- **Negativo:** Proyecto perdiendo capital

### TIR Operativa

- **> 25%:** Operación muy rentable
- **15-25%:** Operación rentable
- **5-15%:** Operación moderada
- **< 5%:** Operación poco rentable
- **Negativo:** Operación con pérdidas

---

## 📝 Responder

Una vez validado, responde a:

**Juan Paulo McAllister** (CEO)  
**Asunto:** "✅ Validación KPIs P&G — Líneas 13.2, 13.4, 14.2, 14.4, 1.0, 9.0 CONFIRMADAS"

Con:

```
Líneas validadas:
- [✓] 13.2, 13.4, 14.2, 14.4 (Flujos K con signos correctos)
- [✓] 1.0, 9.0 (Ingresos y Costos; FCO = 1.0 - 9.0 es correcto)
- [✓] Película 2025-10-01: NORMAL / ANOMALÍA (especificar)

Notas:
(cualquier hallazgo adicional)
```

---

## 🤔 Preguntas Frecuentes

**P: ¿Por qué dos TIRs?**  
**R:** TIR K mide retorno del capital invertido (decisión accionistas).  
TIR Operativa mide eficiencia operacional (decisión gestión).

**P: ¿Qué pasa si TIR K es negativo?**  
**R:** El proyecto ha devuelto menos capital del que recibió.  
Requiere revisión urgente con CEO y Control.

**P: ¿Se recalculan los KPIs siempre?**  
**R:** Sí, cada vez que se abre la página.  
Carga desde tabla `historico` en Supabase.

**P: ¿Qué hago si veo un error?**  
**R:** Reportar a Luis Miguel Serrano (TI) con:
- Línea P&G problemática
- Proyecto
- Película (mes)
- Valor esperado vs valor visto

---

**Fecha de validación requerida:** Antes de 2026-05-31  
**Contacto:** Luis Miguel Serrano (TI) / Juan Paulo McAllister (CEO)
