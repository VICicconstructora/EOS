# 📊 KPIs Financieros Implementados — Para Juan Paulo

**De:** Sistema Tracción  
**Para:** Juan Paulo McAllister, CEO  
**Fecha:** 2026-05-16  
**Tema:** ✅ Implementación completada — Necesita validación

---

## 🎯 Lo que se hizo

Se implementó un **sistema automático de cálculo** de dos KPIs financieros clave en la app Tracción:

### 1. **TIR K** — Retorno de Capital Invertido
- Mide qué % de retorno genera el capital que IC y socios han invertido
- **Rango típico:** 15-20% anual (bueno)
- **Menos de 10%:** Requiere revisión

### 2. **TIR Operativa** — Rentabilidad Operacional
- Mide qué % de rentabilidad operacional genera cada proyecto (independiente de financiamiento)
- **Rango típico:** 15-25% anual (bueno)
- **Menos de 5%:** Requiere revisión

---

## 📍 Dónde acceder

**En Tracción:**
```
Menú lateral → KPIs → [Tab] "KPIs Proyectos (Financiero)"
```

**O directamente:** `/kpis`

**Qué verás:**
- 5 gráficos (uno por proyecto activo)
- Cada gráfico muestra 16 meses (2025-01 → 2026-04)
- Dos líneas por proyecto:
  - 🔵 Azul = TIR K
  - 🟣 Púrpura = TIR Operativa

---

## 📊 Proyectos Incluidos

```
Well
Verde Vivo (etapas 1-4)
Azul Celeste (etapas 1-4)
Azul Turquesa (etapas 1-4)
Mitika (etapas 1-4)
```

**Total:** 411,254 registros históricos + 80 cálculos automáticos

---

## ⚙️ Cómo funciona

**Fuente de datos:** Tabla `historico` en Supabase (892,901 registros)

**Algoritmo:** Newton-Raphson (método numérico estándar para TIR)

**Frecuencia:** Recalcula cada vez que abres la página

**Confiabilidad:** ✅ Usa datos auditados de la empresa

---

## ⚠️ ACCIÓN REQUERIDA: Validación

Antes de mostrar esto a directivos o socios, **necesitamos validar que los números son correctos**.

### Paso 1: Andrés Arango valida las líneas (30 min)

Andrés debe confirmar 6 líneas de Presupuesto & Gestión:

```
Para TIR K:
  13.2 - Aportes IC ✓ CONFIRMAR
  13.4 - Reintegros IC ✓ CONFIRMAR
  14.2 - Aportes Socio ✓ CONFIRMAR
  14.4 - Reintegros Socio ✓ CONFIRMAR

Para TIR Operativa:
  1.0 - Ingresos ✓ CONFIRMAR
  9.0 - Total Costos ✓ CONFIRMAR
```

**Documento:** Enviar a Andrés → `VALIDACION_ANDRÉS_ARANGO.md`

### Paso 2: Comparar con Excel (15 min)

Comparar 1-2 proyectos:
- Tomar TIR calculada por Tracción
- Verificar vs cálculo manual en Excel
- Confirmar que coinciden

### Paso 3: Revisión de datos anómalos

Revisar película octubre 2025 que tiene spike de 127% en registros.
- ¿Es normal?
- ¿Consolidado histórico?

---

## 📅 Timeline Sugerido

| Fecha | Acción | Responsable | Duración |
|-------|--------|-------------|----------|
| **2026-05-16** | Implementación completada | TI | ✅ |
| **2026-05-20** | Andrés valida líneas P&G | Construcción | 30 min |
| **2026-05-22** | TI comparar con Excel | TI | 15 min |
| **2026-05-24** | Revisión spikes de datos | Construcción | 15 min |
| **2026-05-27** | Go-live (mostrar a equipo) | CEO + Construcción | — |
| **2026-06-01** | Publicar en reportes | Control | — |

---

## 🎯 Qué hacer ahora

1. **Forwarded a Andrés Arango:**
   ```
   Asunto: ⚠️ Validar KPI — 6 líneas P&G
   Documento: VALIDACION_ANDRÉS_ARANGO.md
   Tiempo: 30-45 min
   Responder: Email con checklist completado
   ```

2. **TI (Luis Miguel):**
   ```
   - Test Demo Mode de gráficos
   - Comparar 2-3 TIRs con Excel manual
   - Reportar a Juan Paulo si hay discrepancias
   ```

3. **Cuando Andrés confirme:**
   ```
   - Publicar en /kpis
   - Mostrar a Marcela Arroyave (Control)
   - Incluir en reportes mensuales
   ```

---

## 💡 Por qué importa

Estos KPIs permiten:

✅ **Monitoreo continuo** de rentabilidad proyecto a proyecto  
✅ **Alertas tempranas** si rentabilidad cae  
✅ **Comparación** entre etapas y proyectos  
✅ **Datos para decisiones** de nueva inversión  
✅ **Transparencia** con socios  

---

## 📚 Documentación Disponible

| Documento | Para quién | Contenido |
|-----------|-----------|----------|
| `VALIDACION_ANDRÉS_ARANGO.md` | Construcción | Qué validar, checklist |
| `IMPLEMENTACION_KPI_PROYECTOS.md` | TI | Arquitectura técnica, algoritmo |
| `ANALISIS_HISTORICO_KPI.md` | Análisis | Detalle de 892,901 registros |
| `WIKI_UPDATE_KPIS.md` | Wiki Obsidian | Para copiar a tu wiki |
| `RESUMEN_IMPLEMENTACION_KPI.md` | Equipo | Overview ejecutivo |

---

## ❓ Preguntas Frecuentes

**P: ¿Los números son confiables?**  
R: Sí, pero necesitan validación de Andrés primero. Luego vamos a comparar con Excel.

**P: ¿Qué pasa si TIR K es negativo?**  
R: Significa que el proyecto ha devuelto menos capital del que recibió. Requiere revisión urgente.

**P: ¿Se actualizan automáticamente?**  
R: Sí, cada vez que se abre `/kpis`, recalcula desde los últimos datos en Supabase.

**P: ¿Puedo confiar en esto para decisiones de socios?**  
R: SÍ, pero después de validación. Ahora está en fase beta.

**P: ¿Cómo se compara con Sinco/Proyectos?**  
R: Usa la misma fuente (tabla `historico`), pero automatiza el cálculo de TIR que antes requería Excel.

---

## 🚀 Próximo Hito

Una vez validado (2026-05-27), estos KPIs estarán **disponibles para:**
- Reportes mensuales a socios
- Dashboard ejecutivo
- Decisiones de inversión
- Análisis de rentabilidad

---

## 📞 Contacto

**Cualquier pregunta:**
- Luis Miguel Serrano (TI) — implementación técnica
- Andrés Arango (Construcción) — validación de números
- Marcela Arroyave (Control) — interpretación financiera

---

**Siguiente paso:** Envía `VALIDACION_ANDRÉS_ARANGO.md` a Andrés Arango  
**Deadline:** Respuesta antes de 2026-05-24
