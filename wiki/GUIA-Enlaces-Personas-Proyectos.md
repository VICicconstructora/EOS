# Guía: Crear Enlaces Bidireccionales Personas ↔ Proyectos en Obsidian Wiki

**Objetivo:** Conectar las 150+ personas documentadas con los 18 proyectos activos mediante enlaces bidireccionales en Obsidian  
**Responsable de mantener:** Asistente IA + Equipo de Procesos  
**Frecuencia de actualización:** Semanal (cambios en asignaciones)

---

## 1️⃣ Estructura Actual (Enero 2026)

```
wiki-obsidian/
├── personas/
│   ├── andres-arango.md (SÍ tiene link a proyectos)
│   ├── diana-olave.md (revisar)
│   ├── fabian-andres-cardona-motato.md (NO tiene links — falta agregar)
│   ├── 100+ más...
│
├── proyectos/
│   ├── bosque-central/
│   │   └── index.md (SÍ tiene equipo con links a personas)
│   ├── castilla-imperial/
│   │   └── index.md (SÍ tiene equipo)
│   └── 10 proyectos más...
```

**Estado:** Enlaces **parcialmente bidireccionales**
- ✅ Proyectos → Personas: Sí (equipo listado en project index.md)
- ⚠️ Personas → Proyectos: Incompleto (solo gerentes principales, no operativos)

---

## 2️⃣ Plantilla de Persona (Actualizado)

Usa esta estructura cuando edites una ficha de persona en wiki Obsidian:

```markdown
---
tipo: persona
version: 1.1
creado: 2026-05-09
ultima_actualizacion: [FECHA ACTUAL]
actualizado_por: [TU NOMBRE]
estado: vigente
---

# [NOMBRE COMPLETO]

**Cargo:** [Ej. Director de Obra 1]
**Área:** [Ej. Gerencia de Construcción]
**Reporta a:** [Ej. [Andrés Arango](../personas/andres-arango.md)]
**Antigüedad:** [Fecha]
**Email:** [si aplica]
**Teléfono:** [si aplica]

## Responsabilidad principal este trimestre (Q2 2026)

[Descripción]

## Responsabilidades permanentes

- Responsabilidad 1
- Responsabilidad 2
- etc.

## Procesos que lidera

- [Link a proceso]
- [Link a proceso]

## Equipo directo

| Nombre | Cargo | Área |
|--------|-------|------|
| Persona 1 | Cargo | Área |

## Coordinaciones clave

| Área | Motivo / Frecuencia |
|------|---------------------|

## KPIs que monitorea

- KPI 1
- KPI 2

## ⭐ Proyectos asignados

← **NUEVA SECCIÓN** — Agregar esto a TODAS las personas operativas

| Proyecto | Rol | Etapa(s) | Estado | Inicio |
|----------|-----|----------|--------|--------|
| [Bosque Central](../proyectos/bosque-central/index.md) | Director de Construcción | E1, E2, E3 | Construcción | 2025-XX-XX |
| [Castilla Imperial](../proyectos/castilla-imperial/index.md) | Director de Obra | A, B, C | Construcción | 2025-XX-XX |

**Proyectos sin asignación actual:** (Si aplica)
- [GRAN MANZANA](../proyectos/_pipeline/gran-manzana.md) — Suplencia/Backup

## ROCA vigente

[Descripción]

## Notas de contexto

[Contexto]

## Changelog

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.1 | 2026-05-17 | Agregar sección "Proyectos asignados" | [Tu nombre] |
| 1.0 | 2026-05-09 | Creación inicial | JPM |
```

---

## 3️⃣ Plantilla de Proyecto (Actualizado)

Usa esta estructura cuando edites un proyecto index.md:

```markdown
---
tipo: proyecto
version: 1.2
---

# [NOMBRE PROYECTO]

[Campos existentes...]

## Equipo

### Liderazgo

| Rol | Persona / Empresa | Desde |
|-----|------------------|-------|
| Director de Proyecto | [Nombre](../../personas/nombre-apellido.md) | 2025-XX-XX |
| Gerente Construcción | [Andrés Arango](../../personas/andres-arango.md) | [Fecha] |

### Directores de Obra / Operativos

| Rol | Nombre | Reporta a | Área |
|-----|--------|-----------|------|
| Director de Obra | [Nombre](../../personas/nombre-apellido.md) | [Jefe] | Gerencia Construcción |
| Coordinador Ambiental | [Nombre](../../personas/nombre-apellido.md) | [Jefe] | Gerencia Construcción |

### Equipo Transversal

| Área | Responsable | Rol Específico |
|------|-------------|----------------|
| Financiero | [Juan José Leal](../../personas/juan-jose-leal.md) | Presupuesto, flujo de caja |
| Jurídico | [Nataly Vinchira](../../personas/nataly-vinchira.md) | Contratos, escrituración |
| Control | [Marcela Arroyave](../../personas/marcela-arroyave.md) | Compras, costos |
| Comercial | [Mónica Báez](../../personas/monica-baez.md) | Ventas, cartera |

[Resto del contenido del proyecto...]
```

---

## 4️⃣ Links Síntaxis en Obsidian

Usa este formato para crear links bidireccionales:

### Desde Persona hacia Proyecto
```markdown
[Nombre Proyecto](../../proyectos/nombre-proyecto/index.md)
[Bosque Central](../../proyectos/bosque-central/index.md)
```

### Desde Proyecto hacia Persona
```markdown
[Nombre Persona](../../personas/nombre-apellido.md)
[Andrés Arango](../../personas/andres-arango.md)
[Lina María Jaimes Aguilar](../../personas/lina-maria-jaimes-aguilar.md)
```

### Anclas dentro de Proyecto (referencia a sección específica)
```markdown
[Equipo de Bosque Central](../../proyectos/bosque-central/index.md#Equipo)
```

---

## 5️⃣ Checklist: Personas que NECESITAN actualizar links a proyectos

### Nivel 1: Gerentes Corporativos (YA LISTO)
- ✅ Andrés Arango → Todos los proyectos en construcción
- ✅ Mónica Báez → Todos los proyectos (roles múltiples)
- ✅ Juan José Leal → Todos (financiero)
- ⏳ Diana Olave → Verificar
- ⏳ Marcela Arroyave → Verificar
- ⏳ Nataly Vinchira → Verificar
- ⏳ Luis Miguel Serrano → Verificar

### Nivel 2: Directores de Construcción/Obra (CRITICAL — 16 personas)
- ⏳ JULIAN ANDRES GARCIA OROZCO → BOSQUE CENTRAL
- ⏳ CARLOS JULIAN VALENCIA RESTREPO → CASTILLA IMPERIAL
- ⏳ OSCAR EMILSUN FANDIÑO SEPULVEDA → CASTILLA IMPERIAL
- ⏳ MAURICIO ARIAS → CASTILLA LIVING
- ⏳ ELIECER ALDANA PINZON → GAIA
- ⏳ JORGE NELSON VELA FONSECA → LA HACIENDA JAMUNDÍ
- ⏳ JAIRO ERNESTO MERA PATIÑO → PRAIA NATURA
- ⏳ FABIAN ANDRES CARDONA MOTATO → PRIMERA ESTE
- ⏳ SANDRA PATRICIA SOLANO MAYA → RESERVA DE OPORTO
- ⏳ LINA MARIA JAIMES AGUILAR → AZUL CELESTE
- ⏳ ALFONSO ESCOBAR TRUJILLO → AZUL TURQUESA
- ⏳ HOLMES ENRIQUE DE LA ROSA DIAZ → MITIKA
- ⏳ JAIME ALBERTO CABEZAS MOLANO → VERDE VIVO
- ⏳ ELVER ALEJANDRO SOPO URIBE → WELL
- ⏳ FREDDY GABRIEL SOLANO TOLOZA → [Por asignar]
- ⏳ OLGA LUCIA MURCIA PARRA → [Por asignar]

### Nivel 3: Especialistas (8 personas)
- ⏳ LINA PAOLA SANCHEZ HERRERA → WELL, TODOS (presupuestos)
- ⏳ ANDRES FELIPE OSPINA MARTINEZ → GAIA, TODOS (ambiental)
- ⏳ PABLO ANDRES ANGEL PEREZ → PRAIA NATURA (coordinador diseño)
- ⏳ [5 más por identificar]

### Nivel 4: Personal Operativo (100+ personas)
- ⏳ Requiere mapeo desde SharePoint (datos operacionales)

---

## 6️⃣ Cómo automatizar la actualización

### Opción A: Script de búsqueda-reemplazo
Si tienes acceso a bash/powershell en tu local:
```bash
# Buscar todas las personas sin la sección "Proyectos asignados"
grep -L "Proyectos asignados" wiki/personas/*.md

# Resultado: Lista de archivos a actualizar
```

### Opción B: Template Batch Edit en Obsidian
1. Abre Obsidian en wiki/personas/
2. Usa "Search and Replace" (Ctrl+H)
3. Busca: `## Notas de contexto`
4. Reemplaza con: 
```
## ⭐ Proyectos asignados

[Agregar tabla cuando se asigne]

## Notas de contexto
```

### Opción C: Script IA (Claude Code)
Proporciona lista de cambios → Claude genera archivos actualizados

---

## 7️⃣ Integración con SharePoint

**Mapping:** Los datos de asignación de personas a proyectos en SharePoint están documentados en:
- [SharePoint-Proyectos-Estructura-Carpetas.md](SharePoint-Proyectos-Estructura-Carpetas.md) — Documentación de carpetas
- [Matriz-Personas-Proyectos.md](Matriz-Personas-Proyectos.md) — Relaciones consolidadas

**Cómo sincronizar:**
1. Leer estructura CARPETAS desde SharePoint (datos reales)
2. Identificar nombres de proyectos = Obsidian wiki folder names
3. Mapear personas en carpetas ≈ Asignaciones
4. Actualizar fichas de personas con nuevas asignaciones
5. Crear links bidireccionales

---

## 8️⃣ Frecuencia de Actualización

| Cambio | Frecuencia | Responsable | Notas |
|--------|-----------|-------------|-------|
| Personas nuevas contratadas | Mensual | Diana Olave + JPM | Crear ficha completa |
| Cambios de asignación de proyecto | Semanal | Andrés Arango | Actualizar sección "Proyectos asignados" |
| Cambios de cargo/rol | Mensual | Diana Olave | Actualizar "Cargo" y tabla de equipo del jefe |
| Nuevos proyectos | Por proyecto | JPM + Mónica Báez | Crear carpeta + index.md con equipo |
| Cierre de proyecto | Mensual | Mónica Báez | Marcar como "Cerrado" en index.md |

---

## 9️⃣ Verificación de Coherencia

Ejecuta este checklist antes de "committed" cambios:

- [ ] Persona tiene links a proyectos donde aparece en `Proyectos asignados`
- [ ] Proyecto tiene links a personas en sección `Equipo`
- [ ] Los nombres de personas son consistentes (revisar caps, acentos)
- [ ] Los paths de links son correctos (verificar estructura de carpetas)
- [ ] Todas las personas en `Equipo` del proyecto existen en carpeta `personas/`
- [ ] Reporta-a links apuntan a personas reales
- [ ] No hay links rotos (en Obsidian: búscar "unresolved links")

---

## 🔟 Ejemplo Completo

### Persona: Andrés Arango (wiki Obsidian)
```markdown
## ⭐ Proyectos asignados

| Proyecto | Rol | Etapa(s) | Estado | Inicio |
|----------|-----|----------|--------|--------|
| [Bosque Central](../proyectos/bosque-central/index.md) | Supervisor Construcción | E1, E2, E3 | Construcción | 2025-02-15 |
| [Castilla Imperial](../proyectos/castilla-imperial/index.md) | Supervisor Construcción | A, B, C | Construcción | 2025-06-01 |
| [Gaia](../proyectos/gaia/index.md) | Supervisor Construcción | 1, 2 | Cierre | 2024-03-01 |
| [Praia Natura](../proyectos/praia-natura/index.md) | Supervisor Construcción | E1, E2 | Construcción | 2024-05-01 |
| [BIEN: 10 proyectos más...] | — | — | — | — |
```

### Proyecto: Bosque Central (wiki Obsidian)
```markdown
## Equipo

| Rol | Persona | Desde |
|-----|---------|-------|
| Director de Construcción | [JULIAN ANDRES GARCIA OROZCO](../../personas/julian-andres-garcia-orozco.md) | 2025-02-15 |
| Gerente Construcción (cadena) | [Andrés Arango](../../personas/andres-arango.md) | 2025-02-15 |
| Gerente Comercial | [Mónica Báez](../../personas/monica-baez.md) | 2025-02-15 |
```

---

**Documento de referencia:** [Matriz-Personas-Proyectos.md](Matriz-Personas-Proyectos.md)  
**Próxima revisión:** 2026-05-24
