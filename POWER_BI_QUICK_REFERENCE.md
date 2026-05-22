# Referencia Rápida: Power BI ADPRO — Guía del Usuario Final

**Versión:** 1.0  
**Fecha:** 16-05-2026  
**Propósito:** Cheat sheet para usuarios finales de reportes Power BI  
**Público:** Andrés Arango, Marcela Arroyave, Juan José Leal, analistas

---

## 1. Acceso a Reportes

### Opción A: Power BI Desktop (Local)

1. Abre **Power BI Desktop**
2. File → Open → `IC_CONSTRUCTORA_ADPRO_DATA_MODEL.pbix`
3. Espera carga (30-60 segundos)
4. Selecciona pestaña de reporte

### Opción B: Power BI Service (Online)

1. Ve a [Power BI App Launcher](https://app.powerbi.com/)
2. Busca: `IC Constructora ADPRO`
3. Haz clic → Abre en navegador

### Opción C: Excel (Export)

1. En Power BI, haz clic: **File → Export → Excel**
2. Se descargará `.xlsx` con datos del reporte actual

---

## 2. Los 3 Reportes Principales

### Reporte 1: Control de Presupuesto

**¿Qué ver?**
- Presupuesto vs. Real por proyecto
- Varianzas por capítulo
- Identificar desviaciones > 10%

**Cómo usarlo:**
1. Ve a pestaña: **Control Presupuesto**
2. Selecciona mes: `[Selector en la parte superior]`
3. Selecciona proyecto: `[Dropdown: Bosque Central, Gaia, etc.]`
4. Lee tabla: "Estado por Proyecto" (izquierda)
5. Si varianza > 10%, haz clic en proyecto → **Hoja 2** (Capítulos)

**Qué significa:**
- ✅ Verde: Varianza < 2% (OK)
- 🟡 Amarillo: Varianza 2-5% (Observar)
- 🔴 Rojo: Varianza > 5% (Alerta)

**Acción recomendada:**
- Varianza negativa (Realizado > Presupuesto) → investigar causa
- Revisar si fue reforma presupuestaria → Hoja 7 (Notas)

---

### Reporte 2: Flujo de Caja

**¿Qué ver?**
- Ingresos vs. Egresos últimos 24 meses (real + forecast)
- Saldo de caja por mes
- Períodos de riesgo de liquidez

**Cómo usarlo:**
1. Ve a pestaña: **Flujo de Caja**
2. Observa gráfico waterfall: "Saldo Inicial → Ingresos - Egresos → Saldo Final"
3. Revisa tabla inferior: últimos 12 meses + próximos 12 meses
4. Si saldo mes < $150M (línea roja), ⚠️ alerta crítica

**Qué significa:**
- Línea roja = Límite mínimo de caja recomendado ($150M)
- Si baja de esto, riesgo de no poder pagar nómina/proveedores

**Acción recomendada:**
- Saldo crítico (< $100M) → Juntar CFO + Tesorería
- Saldo bajo (< $150M) → Acelerar ingresos o diferir egresos

---

### Reporte 3: Compras y Actas

**¿Qué ver?**
- Estado de órdenes de compra (Abierta, Parcial, Cerrada)
- Actas pendientes de pago
- Retenciones y anticipos

**Cómo usarlo:**
1. Ve a pestaña: **Compras y Actas**
2. Hoja 1: Dashboard rápido (KPI resumen)
3. Hoja 2: Tabla OC (busca por código o proveedor)
4. Hoja 3: Actas (ve estado: "Pagada", "Aprobada", "Rechazada")

**Qué significa:**
- OC Estado = "Abierta" → Sin recibir mercancía
- OC Estado = "Parcial" → Recibida parte
- OC Estado = "Cerrada" → 100% recibida, liquidada
- Acta Estado = "Rechazada" 🔴 → Revisar observaciones con contratista

**Acción recomendada:**
- OC abierta > 30 días → Seguimiento a proveedor
- Acta rechazada → Contactar Jurídico (Nataly)

---

## 3. Filtros Comunes

### Filtro por Período (Fecha)

**Ubicación:** Parte superior de cada reporte

**Opciones:**
- Mes: [Dropdown: Enero a Diciembre]
- Año: [Dropdown: 2024, 2025, 2026]
- Rango personalizado: [Calendar widget]

**Ejemplo:** Selecciona "Mayo 2026" para ver datos del mes actual

---

### Filtro por Proyecto

**Ubicación:** Lado izquierdo, bajo período

**Opciones multi-select:** (Ctrl + Click para múltiples)
- Bosque Central CBR
- Gaia CBR
- Praia Natura CBR
- Primera Este CBR
- Castilla Imperial CBR
- Castilla Living CBR
- La Hacienda Jamundí CBR
- Reserva de Oporto CBR
- Mitika Apartamentos
- Azul Celeste (E1, E2, E3)
- Azul Turquesa (E1, E2)
- Well
- Verde Vivo

**Ejemplo:** Selecciona "Bosque Central CBR" + "Gaia CBR" para ver comparativa

---

### Filtro por Estado (Compras/Actas)

**Ubicación:** Reporte 3, parte superior

**Opciones:**
- Abierta
- Parcial
- Cerrada
- Anulada
- Aprobada (actas)
- Pagada (actas)
- Rechazada (actas)

**Ejemplo:** Selecciona "Abierta" para ver órdenes sin completar

---

## 4. Elementos Interactivos

### Drill-Down (Profundizar)

**Cómo funciona:** Haz clic en un valor → Va a nivel de detalle

**Ejemplos:**
- Reporte 1, Hoja 1: Haz clic en "Bosque Central CBR" → Hoja 2 (Capítulos)
- Reporte 1, Hoja 2: Haz clic en "01.01 MOD" → Hoja 3 (Ítems)

**Cómo volver:** Flecha atrás (← en la barra de herramientas)

---

### Gráficos Interactivos

**Haz clic en barra/punto → Filtra todo el reporte por esa selección**

**Ejemplo:**
1. Reporte 1, gráfico de línea (temporal)
2. Haz clic en barra del mes "Mayo" → Filtra tabla inferior a mayo solamente
3. Ctrl + Click para multi-seleccionar

---

### Ordenamiento (Sort)

**En tablas:** Haz clic en encabezado de columna para ordenar

**Ejemplos:**
- Columna "Saldo": Haz clic 2x → Ordena de menor a mayor (desviaciones principales)
- Columna "% Varianza": Haz clic 2x → Ordena por varianza (alertas primero)

---

## 5. Indicadores Visuales

### Tarjetas de Métrica (KPI Cards)

```
┌───────────────┐
│ Presupuesto   │
│   Total       │
│  $2.500M      │  ← Valor actual
│      ↓        │  ← Trending (si aplica)
│   -10% YoY    │  ← Comparativa año anterior
└───────────────┘
```

**Interpreta:**
- Número grande = Valor actual
- Flecha ↑ = Subió vs. mes anterior (positivo en ingresos)
- Flecha ↓ = Bajó vs. mes anterior (negativo en gastos)

---

### Códigos de Color

| Color | Significado | Acción |
|-------|-------------|--------|
| 🟢 Verde | OK, dentro de presupuesto | Seguimiento normal |
| 🟡 Amarillo | Cuidado, varianza 2-5% | Observar próxima semana |
| 🔴 Rojo | Alerta, varianza > 5% | Investigar inmediatamente |
| ⚪ Gris | Sin datos / N/A | Ignorar |

---

### Iconos

| Icono | Significado |
|-------|------------|
| ℹ️ Info | Más información disponible (hover para tooltip) |
| 📋 Tabla | Datos detallados (expandible) |
| 📈 Gráfico | Visualización de tendencia |
| 🔍 Lupa | Búsqueda disponible en la tabla |
| ↕️ Flechas | Sorteable (haz clic para ordenar) |

---

## 6. Preguntas Frecuentes (FAQ)

### P: ¿Por qué aparecen valores NULL o ceros?

**R:** Puede ser:
1. Filtros demasiado restrictivos → Desselecciona todos excepto los que necesites
2. Período sin datos → Cambia a mes anterior
3. Tabla no se cargó → Haz refresh (Ctrl + R)

**Solución:** Presiona Ctrl + R para refrescar datos desde Supabase

---

### P: ¿Cómo descargo datos para Excel?

**R:**
1. En Power BI, ve a pestaña deseada
2. Haz clic: **File → Export → PowerPoint/PDF/Excel**
3. Se descargará archivo con datos visibles en pantalla

**Nota:** Exporta lo que ves; si necesitas toda la tabla, baja el filtro primero.

---

### P: ¿Los datos se actualizan automáticamente?

**R:** Depende de cómo accedas:

| Acceso | Actualización | Frecuencia |
|--------|---------------|-----------|
| Desktop (.pbix) | Manual (Ctrl+R) | ~4 AM diario |
| Power BI Service (Web) | Automática | ~4 AM diario |
| Excel export | Manual (descargar de nuevo) | Por demanda |

**Para actualización manual:** Presiona **Refresh** en Power BI Desktop

---

### P: ¿Puedo crear mis propios reportes?

**R:** SÍ, si tienes Power BI Desktop:
1. Abre `IC_CONSTRUCTORA_ADPRO_DATA_MODEL.pbix`
2. Pestaña: **Report**
3. **Insert** → Elige visualización (Tabla, Gráfico, KPI, etc.)
4. Arrastra campos desde **Data** panel (derecha)
5. Save

**Nota:** Los cambios se guardan en tu archivo local. Para compartir cambios, contacta a Claude Code.

---

### P: ¿Qué pasa si necesito datos más recientes?

**R:** Power BI se sincroniza diariamente a las 4 AM. Si necesitas antes:
1. Desktop: Presiona **Refresh** (Ctrl + R)
2. Service: Haz clic **Refresh now** (botón en la barra)

Toma ~30 segundos (tablas core) a ~90 segundos (histórico).

---

### P: ¿Tengo acceso a todos los proyectos?

**R:** Por defecto SÍ (lectura de todos). Si ves que te faltan proyectos, contacta a Luis Miguel (TI) — puede ser filtro RLS por área.

---

## 7. Troubleshooting Rápido

### Reporte no carga / Error

**Paso 1:** Presiona Ctrl + R (Refresh)  
**Paso 2:** Espera 30 segundos  
**Paso 3:** Si persiste, reinicia Power BI Desktop  
**Paso 4:** Si aún falla, contacta a Luis Miguel (TI)

---

### Valores no suman correctamente

**Verificación:**
1. ¿Hay filtros aplicados? (mira filtro en parte superior)
2. ¿Incluiste todos los períodos? (mayo no debería compararse con total anual)
3. ¿Diferencia de redondeo? (2.5M + 2.5M puede mostrar como 5.0M)

**Solución:** Desselecciona todos los filtros → vuelve a comenzar

---

### Tabla muy lenta / tarda en cargar

**Causas:**
- Demasiadas filas (Histórico = 836K registros)
- Conexión internet lenta
- Recursos de PC bajos

**Solución:**
1. Filtra por proyecto específico
2. Reduce período a últimos 3 meses
3. Cierra otras aplicaciones (Excel, Chrome con muchas tabs)

---

## 8. Horarios y Contactos

### Refresh Automático

| Reporte | Frecuencia | Hora | Duración |
|---------|-----------|------|----------|
| Control Presupuesto | Diaria | 4:00 AM | 20-30s |
| Compras y Actas | 2x diaria | 4 AM, 2 PM | 15-20s |
| Flujo de Caja | Mensual | 1er día, 6 AM | 60-90s |

---

### Contactos de Soporte

| Problema | Contacto | Teléfono | Email |
|----------|----------|----------|-------|
| Acceso/credenciales | Luis Miguel Serrano (TI) | [Se obtiene] | [Se obtiene] |
| Datos incorrectos | Andrés Arango (Construcción) | [Se obtiene] | [Se obtiene] |
| Compras/Actas | Marcela Arroyave (Control) | [Se obtiene] | [Se obtiene] |
| Flujo de Caja | Juan José Leal (Finanzas) | [Se obtiene] | [Se obtiene] |
| Reportes nuevos | Claude Code (IA) | N/A | Via Teams |

---

## 9. Checklist Antes de Cada Reunión

- [ ] ¿Datos actualizados? (Refresh reciente)
- [ ] ¿Filtros correctos? (Proyecto, período, estado)
- [ ] ¿Visualizaciones limpias? (Sin scroll excesivo)
- [ ] ¿Alertas identificadas? (Varianzas > 10%, saldos críticos)
- [ ] ¿Números coinciden con Excel/ADPRO?

---

## 10. Tips y Trucos

### Tip 1: Guardar vistas filtradas

1. Aplica filtros deseados
2. **Home → Bookmark → Add bookmark** (new)
3. Nombre: "Control Mayo 2026 - Bosque Central"
4. **Save**

Próxima vez, carga desde **Bookmarks** panel (lado izquierdo)

---

### Tip 2: Crear alertas automáticas (Power BI Service)

1. Abre reporte en Power BI Service (web)
2. Haz clic en KPI (ej: "Presupuesto")
3. **Alert → Set data alert**
4. Configura: "Alerta si Presupuesto > $3M"
5. **Save**

Recibirás email automático si condición se cumple

---

### Tip 3: Exportar para presentación

1. Ve a reporte que necesitas
2. **More options (...)** → **Export to PowerPoint**
3. Se descargará `.pptx` con visualizaciones
4. Abre en PowerPoint, agrega notas, presenta

---

## Conclusión

**Recuerda:**
- Los 3 reportes son tu fuente única de verdad para:
  - ✅ Presupuesto vs. Real
  - ✅ Flujo de Caja
  - ✅ Compras y Actas
- **Refresh diario** → datos siempre frescos
- **Filtros personalizables** → análisis a tu medida
- **Drill-down interactivo** → explora sin crear nuevos reportes

---

**Para Preguntas:** Contacta a Claude Code vía Teams  
**Para Entrenamiento:** Solicita sesión 30 min con Luis Miguel (TI)  
**Para Cambios/Mejoras:** Abre ticket en [Sistema de Gestión de Cambios - TBD]

---

**Versión:** 1.0  
**Última actualización:** 16-05-2026  
**Próxima revisión:** 16-06-2026
