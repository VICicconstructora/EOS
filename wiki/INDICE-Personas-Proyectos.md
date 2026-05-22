# Índice Rápido: Personas ↔ Proyectos

**¿Qué necesitas? Busca aquí:**

---

## 🔍 Búsquedas Comunes

### "Quiero saber en qué proyectos trabaja [PERSONA]"
1. Ve a [Personas-Proyectos-Inverso.md](Personas-Proyectos-Inverso.md)
2. Busca el nombre de la persona (orden alfabético)
3. Lee la lista de proyectos con su rol específico

**Ejemplo:** "¿Dónde está Lina María Jaimes?"
→ [Personas-Proyectos-Inverso.md](Personas-Proyectos-Inverso.md#LINA-MARIA-JAIMES-AGUILAR) → AZUL CELESTE como Director de Obra

---

### "Quiero saber quién es el Director de Obra en [PROYECTO]"
1. Ve a [Matriz-Personas-Proyectos.md](Matriz-Personas-Proyectos.md)
2. Busca el nombre del proyecto
3. Lee la tabla de equipo

**Ejemplo:** "¿Quién dirige WELL?"
→ [Matriz-Personas-Proyectos.md](Matriz-Personas-Proyectos.md#WELL-BOGOTÁ---CALLE-100) → ELVER ALEJANDRO SOPO URIBE como Director de Obra

---

### "Quiero saber quién reporta a [GERENTE]"
1. Ve a [Matriz-Personas-Proyectos.md](Matriz-Personas-Proyectos.md#-equipos-por-proyecto---nivel-director-de-obra)
2. Busca todos los directores que reportan a ese gerente
3. Agrupa por gerente usando Ctrl+F

**Ejemplo:** "¿Cuántos directores de obra dependen de Andrés Arango?"
→ [Matriz-Personas-Proyectos.md](Matriz-Personas-Proyectos.md) → Busca "Andrés Arango" → 16 directores listados

---

### "Necesito entender la cadena de reportes"
1. Ve a [Personas-Proyectos-Inverso.md](Personas-Proyectos-Inverso.md#DIRECTIVOS--GERENTES-CORPORATIVOS)
2. Lee los gerentes directos al CEO
3. Sigue hacia abajo para ver directores de obra que reportan a cada gerente

**Estructura:**
```
CEO (Juan Paulo McAllister)
  └─ Andrés Arango (Gerente Construcción)
      ├─ Julian García Orozco (BOSQUE CENTRAL)
      ├─ Carlos Valencia Restrepo (CASTILLA IMPERIAL)
      └─ [13 directores más]
  └─ Mónica Báez (Gerente Experiencia)
      └─ [Equipo comercial/posventas]
```

---

### "Estoy llenando un formulario y necesito saber quién es responsable"

**Por área operativa:**
- **Construcción → Andrés Arango** (Gerente de Construcción)
- **Comercial/Ventas → Mónica Báez** (Gerente de Experiencia)
- **Finanzas/Presupuesto → Juan José Leal** (Gerente Financiero)
- **Compras/Costos/Calidad → Marcela Arroyave** (Gerente de Control)
- **Legal/Contratos/Escritura → Nataly Vinchira** (Gerente Jurídico)
- **Sistemas/Dashboards → Luis Miguel Serrano** (Gerente de TI)
- **RRHH/Procesos → Diana Olave** (Gerente de Talento Humano)
- **Desarrollo/Nuevos Negocios → [Vacante]** (Gerencia de Desarrollo)

---

## 📚 Documentos de Referencia

| Documento | Cuándo usarlo | Contenido |
|-----------|---------------|----------|
| [Matriz-Personas-Proyectos.md](Matriz-Personas-Proyectos.md) | Necesitas ver **Gerente → Proyecto** o **Proyecto → Equipo completo** | Matriz ejecutiva, equipos por proyecto con roles |
| [Personas-Proyectos-Inverso.md](Personas-Proyectos-Inverso.md) | Necesitas buscar **Persona → Proyectos** | Índice alfabético de 150+ personas y sus asignaciones |
| [GUIA-Enlaces-Personas-Proyectos.md](GUIA-Enlaces-Personas-Proyectos.md) | Necesitas **mantener estos links actualizados** en Obsidian wiki | Templates, sintaxis, checklist, automatización |
| [README-INDICE-MAESTRO.md](README-INDICE-MAESTRO.md) | Necesitas **visión general de TODA la documentación** SharePoint | Guía de navegación completa (37 subsitios) |

---

## 🎯 Casos de Uso por Rol

### Si eres CEO
- **Necesitas:** Visión ejecutiva de quién reporta a quién
- **Lee:** [Personas-Proyectos-Inverso.md](Personas-Proyectos-Inverso.md#DIRECTIVOS--GERENTES-CORPORATIVOS) (sección de gerentes)
- **Acción:** Revisar vacantes, identificar cuellos de botella

### Si eres Gerente de Construcción
- **Necesitas:** Dónde están tus directores de obra y en qué proyectos
- **Lee:** [Matriz-Personas-Proyectos.md](Matriz-Personas-Proyectos.md#-equipos-por-proyecto---nivel-director-de-obra)
- **Acción:** Monitorear asignaciones, balancear carga

### Si eres Director de Proyecto / Superintendente
- **Necesitas:** Saber quién trabaja en tu proyecto
- **Lee:** [Matriz-Personas-Proyectos.md](Matriz-Personas-Proyectos.md) → busca tu proyecto
- **Acción:** Coordinar equipo, identificar responsables por disciplina

### Si eres Especialista / Coordinador
- **Necesitas:** Entender tus responsabilidades en el(los) proyecto(s)
- **Lee:** [Personas-Proyectos-Inverso.md](Personas-Proyectos-Inverso.md) → busca tu nombre
- **Acción:** Revisar roles, identificar otros especialistas en tu(s) proyecto(s)

### Si eres Líder de Procesos / RRHH
- **Necesitas:** Mapeo completo de personas vs proyectos para rotaciones, capacitaciones
- **Lee:** [Personas-Proyectos-Inverso.md](Personas-Proyectos-Inverso.md) (lista completa)
- **Acción:** Planificar desarrollo, identificar carencias de personal, capacitar nuevos gerentes

---

## ⚙️ Mantenimiento

### Cada semana (responsable: Andrés Arango)
- [ ] Revisar cambios en asignaciones de directores de obra
- [ ] Actualizar [Matriz-Personas-Proyectos.md](Matriz-Personas-Proyectos.md)

### Cada mes (responsable: Diana Olave + JPM)
- [ ] Nuevas contrataciones → Crear ficha de persona en Obsidian wiki
- [ ] Cambios de cargo/rol → Actualizar fichas
- [ ] Nuevos proyectos → Crear carpeta en `proyectos/` + index.md con equipo

### Cada trimestre (responsable: JPM)
- [ ] Sincronizar Personas-Proyectos-Inverso.md con realidad operativa
- [ ] Verificar links bidireccionales en Obsidian (no broken links)
- [ ] Actualizar [GUIA-Enlaces-Personas-Proyectos.md](GUIA-Enlaces-Personas-Proyectos.md) si hay cambios en estructura

---

## 🔗 Relación con SharePoint

**Datos de operación vienen desde SharePoint:**
- [SharePoint-Proyectos-Estructura-Carpetas.md](SharePoint-Proyectos-Estructura-Carpetas.md) — Documentación de carpetas de proyecto (dónde está cada rol asignado en archivos)
- [SharePoint-AA-Estructura-Carpetas.md](SharePoint-AA-Estructura-Carpetas.md) — Estructura de áreas administrativas por responsable

**Cómo sincronizar:** Cuando hay cambios en SharePoint (nuevo director, cambio de equipo), actualiza estos documentos wiki.

---

## 📊 Estadísticas Actuales (2026-05-17)

| Métrica | Cantidad |
|---------|----------|
| **Personas documentadas** | 150+ |
| **Proyectos activos** | 18 |
| **Proyectos en origination** | 4 |
| **Gerentes corporativos** | 8 |
| **Directores de obra** | 16 (documentados) |
| **Enlaces Persona→Proyecto** | 40 (gerentes + directores) |
| **Enlaces sin documentar** | 100+ (operativos sin ficha) |

---

## ❌ Problemas Conocidos

1. **100+ personas sin asignación de proyecto documentada**
   - Están en "personas/" pero sus fichas no tienen tabla "Proyectos asignados"
   - **Solución:** Ejecutar proceso de bulk update con [GUIA-Enlaces-Personas-Proyectos.md](GUIA-Enlaces-Personas-Proyectos.md#6%EF%B8%8F%E2%83%A3-cómo-automatizar-la-actualización)

2. **Vacante: Gerencia de Desarrollo**
   - CEO está asumiendo interinamente originación/nuevos negocios
   - **Acción:** Prioridad de contratación Q2 2026

3. **Links en Obsidian wiki requieren actualizarse**
   - [GUIA-Enlaces-Personas-Proyectos.md](GUIA-Enlaces-Personas-Proyectos.md#5%EF%B8%8F%E2%83%A3-checklist-personas-que-necesitan-actualizar-links-a-proyectos) tiene checklist completo

4. **Roles técnicos (arquitectos, estructurales, etc.) sin documentar**
   - Estos especialistas diseñadores NO tienen asignación en personas/
   - Probablemente están externos (contratistas) o en SharePoint sin replicar a wiki

---

## 🚀 Next Steps

**Prioridades:**
1. [ ] Actualizar 16 directores de obra con sección "Proyectos asignados"
2. [ ] Crear links bidireccionales desde proyecto → director
3. [ ] Mapear 100+ personas operativas con asignaciones desde SharePoint
4. [ ] Automatizar sincronización mensual de cambios
5. [ ] Exportar matriz a Excel para reportería gerencial

---

**Preguntas?** Consulta [GUIA-Enlaces-Personas-Proyectos.md](GUIA-Enlaces-Personas-Proyectos.md)  
**¿Algo desactualizado?** Reporta en [Matriz-Personas-Proyectos.md](Matriz-Personas-Proyectos.md)
