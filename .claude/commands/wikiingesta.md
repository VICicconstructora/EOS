# Wiki Ingesta

Ingesta archivos de entrevista Antigravity al wiki de IC Constructora.

**Uso:** `/wikiingesta <ruta-carpeta-ingesta>`

Si no se pasa ruta, buscar en `C:\Users\jmacallister\OneDrive - IC CONSTRUCTORA SAS\Escritorio\Ingesta\`.

---

## Rutas clave

| Recurso | Ruta |
|---------|------|
| Wiki raíz | `C:\Users\jmacallister\IC CONSTRUCTORA SAS\AA General Edicion - .AI\Wiki\ICEOS\IC-EOS\wiki\` |
| Personas | `wiki/personas/` |
| Procesos | `wiki/procesos/<area>/` (construccion, control, desarrollo, direccion, experiencia, financiero, juridico, proyectos, rrhh, ti) |
| Ingesta default | `C:\Users\jmacallister\OneDrive - IC CONSTRUCTORA SAS\Escritorio\Ingesta\` |

---

## Flujo de ejecución

### 1. Leer carpeta de ingesta
Listar todos los `.md` en la carpeta indicada. Los archivos siguen estos patrones de nombre:

| Patrón | Tipo | Acción |
|--------|------|--------|
| `<slug>.md` (solo slug, sin `@`) | Ficha Antigravity detallada | Datos de referencia — no copiar directamente |
| `<slug>--<email>.md` | Ficha persona formato wiki | Crear en `personas/` |
| `<slug>--<email>--transcript.md` | Transcripción entrevista | Crear en `personas/` |
| `<proceso>--<email>.md` (nombre distinto al slug persona) | Proceso | Crear en `procesos/<area>/` |

### 2. Identificar persona principal
- El slug de persona es el nombre completo en kebab-case (ej. `belen-juliana-villamizar-sanguino`).
- El área se extrae del campo `area:` en el frontmatter de la ficha detallada.

### 3. Actualizar perfil base en el wiki
- Ruta: `wiki/personas/<slug>.md`
- Si existe y está en estado stub (versión 1.0 sin datos de entrevista): **actualizar** a versión 2.0 con los datos de la ficha detallada.
- Si no existe: **crear** desde el template de persona.
- Usar `[[wikilinks]]` para referencias a otras personas (no rutas absolutas).
- Incrementar versión en frontmatter y agregar entrada al Changelog.

### 4. Crear archivos de ingesta en personas/
- Copiar `<slug>--<email>.md` → `wiki/personas/<slug>--<email>.md`
- Copiar `<slug>--<email>--transcript.md` → `wiki/personas/<slug>--<email>--transcript.md`
- Convertir referencias a personas en el texto a `[[wikilinks]]` cuando sea posible.

### 5. Crear archivo de proceso
- Identificar el área del proceso desde el frontmatter (`area:`) o por contexto.
- Ruta destino: `wiki/procesos/<area>/<nombre-proceso>--<email-inicial>.md`
- El campo `**Responsable:**` debe linkear al archivo base: `[Nombre](../../personas/<slug>.md)`

### 6. Verificar consistencia
- El perfil base debe tener en `## Procesos que lidera` un link al proceso recién creado.
- Si hay más de una persona mencionada en la transcripción con rol relevante, agregar nota en `## Notas de contexto`.

---

## Templates

### Template persona base (wiki/personas/<slug>.md)

```markdown
---
tipo: persona
version: 2.0
creado: <FECHA-ORIGINAL>
ultima_actualizacion: <HOY>
actualizado_por: Ingesta-WikiIC
estado: vigente
---

# <Nombre Completo>

**Cargo:** <cargo>
**Área:** <area>
**Reporta a:** [[<slug-jefe>]] (<cargo jefe>)
**Antigüedad:** desde <mes año>
**Email:** <email>
**Teléfono:** <telefono>

## Responsabilidad principal este trimestre (Q2 2026)

[Por definir]

## Responsabilidades permanentes

- <lista de responsabilidades>

## Procesos que lidera

- [<Nombre Proceso>](../procesos/<area>/<slug-proceso>.md)

## Equipo directo

Sin reportes directos. / <lista si aplica>

## Coordinaciones clave con otras áreas

| Área | Motivo / Frecuencia |
|------|---------------------|
| <area> | <descripción> — <frecuencia> |

## KPIs que monitorea

- <lista de KPIs>

## Proyectos en los que participa

- <lista de proyectos>

## ROCA vigente

[Por definir]

## Notas de contexto

- **<Tema>:** <descripción>

## Changelog

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | <fecha-creacion> | Creación inicial desde organigrama | Sistema |
| 2.0 | <HOY> | Ingesta completa post-entrevista Antigravity | Ingesta-WikiIC |
```

### Template proceso (wiki/procesos/<area>/<slug>.md)

```markdown
---
tipo: proceso
version: 1.0
creado: <HOY>
ultima_actualizacion: <HOY>
actualizado_por: Ingesta-WikiIC
estado: borrador
area: <area>
frecuencia: <mensual|semanal|diario|puntual>
---

# Proceso: <Nombre del Proceso>

**Responsable:** [<Nombre>](../../personas/<slug>.md)
**Área:** <Gerencia/Área>
**Frecuencia:** <frecuencia>
**Tipo:** <operativo|estratégico|operativo/estratégico>

## Objetivo

<descripción del objetivo>

## Entradas

- <lista de entradas/insumos>

## Pasos

1. <paso 1>
2. <paso 2>
...

## Salidas / Entregables

- <lista de entregables>

## Sistemas involucrados

- [x] / [ ] CRM / ERP Sinco (EnKontrol)
- [x] / [ ] Power BI / Fabric
- [x] / [ ] Excel / SharePoint
- [x] / [ ] Supabase IC
- [x] / [ ] Teams / Outlook
- [x] / [ ] WhatsApp

## Puntos de falla conocidos

- **<Punto>:** <descripción>

## Indicadores del proceso

| KPI | Meta | Frecuencia de revisión |
|-----|------|------------------------|
| <KPI> | <meta> | <frecuencia> |

## Changelog

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | <HOY> | Creación inicial — Entrevista Antigravity | Ingesta-WikiIC |
```

---

## Reglas de estilo

- Nombres de personas: Title Case en texto, kebab-case en slugs y rutas.
- Wikilinks: `[[slug-kebab-case]]` sin extensión.
- Links a archivos del mismo wiki: rutas relativas desde la ubicación del archivo destino.
- No duplicar datos entre el perfil base y la ficha con email — el base es el canónico, el email-versioned puede tener más detalle de entrevista.
- Campos `[Por definir]`: dejarlos así si no se tiene información — no inventar.
- Changelog: siempre agregar entrada al actualizar un archivo existente.

---

## Al finalizar

Reportar:
1. Archivos actualizados (con versión anterior → nueva).
2. Archivos creados (ruta completa).
3. Pendientes identificados (ROCA, email a confirmar, etc.).
