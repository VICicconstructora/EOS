# EOS Toolkit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar 4 subsistemas al sistema EOS de IC Constructora: tracker de implementación por fases, biblioteca del libro (frases + marcos), tab educativo en cada módulo, y repositorio de transcripciones en reuniones.

**Architecture:** Nuevas páginas `/implementacion` y `/biblioteca` con hooks Supabase/localStorage (mismo patrón del proyecto). Un componente `GuiaEOS` reutilizable se inyecta como tab en los 6 módulos existentes. Las transcripciones se agregan como tab en ReunionesPage. El contenido del libro (frases y marcos) vive como constantes en el código — no en la DB.

**Tech Stack:** React 19, Vite, Supabase, react-router-dom v7, Lucide React, CSS variables del design system existente.

---

## Mapa de archivos

### Crear
| Archivo | Responsabilidad |
|---------|----------------|
| `app/src/data/frases-libro.js` | Constante con ~40 frases del libro organizadas por componente EOS |
| `app/src/data/marcos-referencia.js` | Constante con 8 marcos del libro con explicaciones completas |
| `app/src/lib/useImplementation.js` | Hook para progreso de implementación (localStorage/Supabase) |
| `app/src/lib/useTranscriptions.js` | Hook para transcripciones (localStorage/Supabase) |
| `app/src/components/guia/GuiaEOS.jsx` | Componente reutilizable con contenido educativo por módulo |
| `app/src/pages/ImplementacionPage.jsx` | Página tracker de 5 fases de implementación EOS |
| `app/src/pages/BibliotecaPage.jsx` | Página biblioteca: tabs Frases del Libro + Marcos de Referencia |

### Modificar
| Archivo | Cambio |
|---------|--------|
| `app/supabase/schema.sql` | Agregar tablas `implementation_progress`, `implementation_tasks`, `transcriptions` |
| `app/src/App.jsx` | Agregar rutas `/implementacion` y `/biblioteca` |
| `app/src/components/layout/Sidebar.jsx` | Agregar sección "EOS Toolkit" con 2 nuevas entradas |
| `app/src/pages/VisionPage.jsx` | Agregar tab "Guía EOS" con `<GuiaEOS module="vision" />` |
| `app/src/pages/PersonasPage.jsx` | Agregar tab "Guía EOS" con `<GuiaEOS module="personas" />` |
| `app/src/pages/DatosPage.jsx` | Agregar tab "Guía EOS" con `<GuiaEOS module="datos" />` |
| `app/src/pages/AsuntosPage.jsx` | Agregar tab "Guía EOS" con `<GuiaEOS module="asuntos" />` |
| `app/src/pages/ProcesosPage.jsx` | Agregar tab "Guía EOS" con `<GuiaEOS module="procesos" />` |
| `app/src/pages/TraccionPage.jsx` | Agregar tab "Guía EOS" con `<GuiaEOS module="traccion" />` |
| `app/src/pages/ReunionesPage.jsx` | Agregar tab "Transcripciones" con gestión de `useTranscriptions` |

---

## Task 1: Schema SQL — tablas nuevas

**Files:**
- Modify: `app/supabase/schema.sql`

- [ ] **Paso 1: Agregar las 3 tablas nuevas al final del schema.sql**

Abrir `app/supabase/schema.sql` y agregar al final:

```sql
-- =============================================
-- TABLA: implementation_progress (fases EOS)
-- =============================================
create table if not exists public.implementation_progress (
  id           uuid primary key default uuid_generate_v4(),
  company_id   text not null,
  phase_id     integer not null check (phase_id between 1 and 5),
  status       text default 'pending' check (status in ('pending','active','completed')),
  scheduled_date date,
  completed_at timestamptz,
  notes        text default '',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  unique (company_id, phase_id)
);

create table if not exists public.implementation_tasks (
  id           uuid primary key default uuid_generate_v4(),
  company_id   text not null,
  phase_id     integer not null check (phase_id between 1 and 5),
  task_key     text not null,
  completed    boolean default false,
  completed_at timestamptz,
  completed_by text default '',
  unique (company_id, phase_id, task_key)
);

alter table public.implementation_progress enable row level security;
alter table public.implementation_tasks    enable row level security;

create policy "company_access_impl_progress"
  on public.implementation_progress for all
  using (company_id = 'ic-constructora');

create policy "company_access_impl_tasks"
  on public.implementation_tasks for all
  using (company_id = 'ic-constructora');

-- =============================================
-- TABLA: transcriptions (transcripciones L10)
-- =============================================
create table if not exists public.transcriptions (
  id              uuid primary key default uuid_generate_v4(),
  company_id      text not null,
  meeting_id      uuid references public.meetings(id) on delete set null,
  source          text default 'manual' check (source in ('manual','otter','teams','zoom')),
  participants    text[] default '{}',
  topics          jsonb default '[]',
  decisions       text[] default '{}',
  commitments     jsonb default '[]',
  raw_transcript  text default '',
  created_at      timestamptz default now()
);

alter table public.transcriptions enable row level security;

create policy "company_access_transcriptions"
  on public.transcriptions for all
  using (company_id = 'ic-constructora');
```

- [ ] **Paso 2: Ejecutar en Supabase SQL Editor**

Copiar y pegar el bloque anterior en Supabase → SQL Editor → Run.
Verificar que no hay errores y que aparecen las 3 nuevas tablas en Table Editor.

- [ ] **Paso 3: Commit**

```bash
git add app/supabase/schema.sql
git commit -m "feat: add implementation_progress, implementation_tasks, transcriptions tables"
```

---

## Task 2: Datos del libro — frases y marcos (constantes)

**Files:**
- Create: `app/src/data/frases-libro.js`
- Create: `app/src/data/marcos-referencia.js`

- [ ] **Paso 1: Crear `app/src/data/frases-libro.js`**

```js
// src/data/frases-libro.js — Frases clave del libro "Tracción" de Gino Wickman
// Contenido estático — no editable, es contenido del libro

export const FRASES_LIBRO = [
  // VISIÓN
  { id: 1, componente: 'vision', texto: 'Si no puedes describir tu visión con claridad y simplicidad, no la tienes todavía.', capitulo: 'Capítulo 2 — Visión', destacada: true },
  { id: 2, componente: 'vision', texto: 'Todos en la organización deben saber a dónde va la empresa, cómo llegar y qué papel juegan en ese camino.', capitulo: 'Capítulo 2 — Visión', destacada: true },
  { id: 3, componente: 'vision', texto: 'La visión sin tracción es simplemente alucinación.', capitulo: 'Introducción', destacada: true },
  { id: 4, componente: 'vision', texto: 'Los Core Values son los principios no negociables que definen quiénes somos — no aspiraciones, sino realidades.', capitulo: 'Capítulo 2 — Visión', destacada: false },
  { id: 5, componente: 'vision', texto: 'El Core Focus es la intersección entre tu pasión y lo que el mundo necesita de tu empresa. Es tu razón de ser.', capitulo: 'Capítulo 2 — Visión', destacada: false },
  { id: 6, componente: 'vision', texto: 'La meta a 10 años no es un plan financiero — es una imagen vivida de dónde estará la empresa.', capitulo: 'Capítulo 2 — Visión', destacada: false },

  // PERSONAS
  { id: 7, componente: 'personas', texto: 'Las personas correctas en los asientos correctos.', capitulo: 'Capítulo 3 — Personas', destacada: true },
  { id: 8, componente: 'personas', texto: '¿Esta persona entiende lo que hay que hacer, quiere hacerlo y tiene la capacidad para hacerlo? Si no es sí en las tres, hay un problema.', capitulo: 'Capítulo 3 — Personas', destacada: true },
  { id: 9, componente: 'personas', texto: 'Tener a la persona incorrecta en un asiento clave es más costoso que dejarlo vacío.', capitulo: 'Capítulo 3 — Personas', destacada: false },
  { id: 10, componente: 'personas', texto: 'El Accountability Chart no es un organigrama — es una imagen clara de quién es responsable de qué resultado.', capitulo: 'Capítulo 3 — Personas', destacada: false },
  { id: 11, componente: 'personas', texto: 'Primero quién, luego qué. Sin las personas correctas, la mejor estrategia fracasa.', capitulo: 'Capítulo 3 — Personas', destacada: true },
  { id: 12, componente: 'personas', texto: 'La diferencia entre el Visionary y el Integrator es lo que separa las empresas que crecen de las que se estancan.', capitulo: 'Capítulo 3 — Personas', destacada: false },

  // DATOS
  { id: 13, componente: 'datos', texto: 'Los números no mienten. Gestiona el negocio con datos, no con opiniones.', capitulo: 'Capítulo 4 — Datos', destacada: true },
  { id: 14, componente: 'datos', texto: 'Una métrica semanal por persona. Sin más. Sin menos.', capitulo: 'Capítulo 4 — Datos', destacada: true },
  { id: 15, componente: 'datos', texto: 'El Scorecard da visibilidad temprana. Cuando algo está en amarillo, aún se puede corregir. En rojo, ya es tarde.', capitulo: 'Capítulo 4 — Datos', destacada: false },
  { id: 16, componente: 'datos', texto: 'Las métricas deben ser predictivas, no históricas. Mide lo que te dice el futuro, no solo el pasado.', capitulo: 'Capítulo 4 — Datos', destacada: false },
  { id: 17, componente: 'datos', texto: 'Si no puedes medirlo, no puedes gestionarlo. Si no puedes gestionarlo, no puedes mejorarlo.', capitulo: 'Capítulo 4 — Datos', destacada: true },

  // ASUNTOS
  { id: 18, componente: 'asuntos', texto: 'La mayoría de los problemas no se resuelven porque nadie quiere tener la conversación difícil.', capitulo: 'Capítulo 5 — Asuntos', destacada: true },
  { id: 19, componente: 'asuntos', texto: 'IDS: Identificar, Discutir, Solucionar. En ese orden. No mezcles los pasos.', capitulo: 'Capítulo 5 — Asuntos', destacada: true },
  { id: 20, componente: 'asuntos', texto: 'Los asuntos son un regalo. Cada problema identificado es una oportunidad de mejorar la empresa.', capitulo: 'Capítulo 5 — Asuntos', destacada: false },
  { id: 21, componente: 'asuntos', texto: 'El objetivo no es tener pocos asuntos — es resolverlos para siempre, no solo taparlos.', capitulo: 'Capítulo 5 — Asuntos', destacada: false },
  { id: 22, componente: 'asuntos', texto: 'El síntoma no es el problema. La mayoría del tiempo, discutir el síntoma no resuelve nada.', capitulo: 'Capítulo 5 — Asuntos', destacada: true },

  // PROCESOS
  { id: 23, componente: 'procesos', texto: 'Cuando todos siguen el mismo proceso, los resultados dejan de depender de las personas y se vuelven consistentes.', capitulo: 'Capítulo 6 — Procesos', destacada: true },
  { id: 24, componente: 'procesos', texto: 'Documentar, simplificar, implementar. Tres pasos. Si saltas el segundo, el proceso nunca se usa.', capitulo: 'Capítulo 6 — Procesos', destacada: true },
  { id: 25, componente: 'procesos', texto: 'Un proceso bien documentado puede ser ejecutado por cualquier persona competente — eso es escalabilidad.', capitulo: 'Capítulo 6 — Procesos', destacada: false },
  { id: 26, componente: 'procesos', texto: 'Los procesos no son burocracia — son la forma en que la empresa escala sin que todo dependa del fundador.', capitulo: 'Capítulo 6 — Procesos', destacada: false },
  { id: 27, componente: 'procesos', texto: 'Identifica los 6 a 10 procesos medulares. Los que, si los dominas, dominan el negocio.', capitulo: 'Capítulo 6 — Procesos', destacada: true },

  // TRACCIÓN
  { id: 28, componente: 'traccion', texto: 'Las Rocas son las 3 a 7 prioridades más importantes que DEBEN completarse en los próximos 90 días.', capitulo: 'Capítulo 7 — Tracción', destacada: true },
  { id: 29, componente: 'traccion', texto: 'El mundo de 90 días es el ritmo natural de los negocios que ejecutan bien.', capitulo: 'Capítulo 7 — Tracción', destacada: true },
  { id: 30, componente: 'traccion', texto: 'El Meeting Pulse no es una reunión más — es el latido del corazón del sistema.', capitulo: 'Capítulo 7 — Tracción', destacada: false },
  { id: 31, componente: 'traccion', texto: 'Una reunión L10 bien ejecutada resuelve más problemas en 90 minutos que meses de comunicación informal.', capitulo: 'Capítulo 7 — Tracción', destacada: false },
  { id: 32, componente: 'traccion', texto: 'En camino o en riesgo. Solo dos respuestas posibles para cada Roca. Sin grises.', capitulo: 'Capítulo 7 — Tracción', destacada: true },
  { id: 33, componente: 'traccion', texto: 'La disciplina de ejecutar el mismo sistema, semana tras semana, es lo que separa a las empresas que crecen de las que se quedan estancadas.', capitulo: 'Capítulo 7 — Tracción', destacada: false },

  // GENERAL
  { id: 34, componente: 'general', texto: 'EOS no es una teoría de management. Es un sistema operativo probado que cualquier empresa puede implementar.', capitulo: 'Introducción', destacada: true },
  { id: 35, componente: 'general', texto: 'Simplicidad es la clave. Si el sistema es complicado, el equipo no lo usará.', capitulo: 'Introducción', destacada: true },
  { id: 36, componente: 'general', texto: 'El 98% de los problemas empresariales caen en una de estas categorías: visión, personas, datos, asuntos, procesos o tracción.', capitulo: 'Introducción', destacada: false },
  { id: 37, componente: 'general', texto: 'No puedes construir una gran empresa sin primero construir un gran equipo directivo.', capitulo: 'Capítulo 1 — Maestría', destacada: false },
]

export const COMPONENTES = ['vision','personas','datos','asuntos','procesos','traccion','general']

export const COMPONENTE_LABELS = {
  vision:   'Visión',
  personas: 'Personas',
  datos:    'Datos',
  asuntos:  'Asuntos',
  procesos: 'Procesos',
  traccion: 'Tracción',
  general:  'General',
}

export const COMPONENTE_COLORS = {
  vision:   'var(--eos-vision)',
  personas: 'var(--eos-people)',
  datos:    'var(--eos-data)',
  asuntos:  'var(--eos-issues)',
  procesos: 'var(--eos-process)',
  traccion: 'var(--eos-traction)',
  general:  'var(--brand-primary)',
}
```

- [ ] **Paso 2: Crear `app/src/data/marcos-referencia.js`**

```js
// src/data/marcos-referencia.js — Marcos de referencia del libro "Tracción"
// Solo lectura. No editar. Son los frameworks del libro de Gino Wickman.

export const MARCOS = [
  {
    id: 'vto',
    nombre: 'V/TO — Vision/Traction Organizer',
    icono: '📋',
    componente: 'vision',
    que_es: 'El V/TO es la herramienta central del sistema EOS. Es un documento de dos páginas que captura la visión completa de la empresa y el plan para hacerla realidad. Reemplaza los planes estratégicos de 40 páginas que nadie lee.',
    para_que: 'Alinear a todo el equipo directivo hacia una visión compartida. Cuando todos tienen el mismo V/TO en la mente, las decisiones cotidianas se vuelven más fáciles y consistentes.',
    conceptos: [
      { term: 'Core Values', def: 'Los 3 a 7 valores no negociables que definen la cultura de la empresa. No son aspiraciones — son realidades que ya vives.' },
      { term: 'Core Focus', def: 'La intersección entre el propósito de la empresa (por qué existe) y su nicho (qué hace mejor que nadie).' },
      { term: '10-Year Target', def: 'La gran meta a 10 años. Debe ser específica, medible y motivante. Es el norte que guía todas las decisiones.' },
      { term: 'Marketing Strategy', def: 'Define tu cliente ideal, tu propuesta única de valor, y los tres a siete mensajes principales al mercado.' },
      { term: '3-Year Picture', def: 'Imagen vivida de cómo se verá la empresa en 3 años: ingresos, empleados, logros, cómo se siente.' },
      { term: '1-Year Plan', def: 'Los 3 a 7 objetivos más importantes del año actual, con métricas de éxito claras.' },
    ],
    como_se_usa: 'Se completa en el Vision Building Day 1 y 2 con el equipo directivo. Se revisa cada trimestre y se actualiza cada año en la Sesión Anual.',
  },
  {
    id: 'accountability-chart',
    nombre: 'Accountability Chart',
    icono: '🏗',
    componente: 'personas',
    que_es: 'El Accountability Chart (AC) es la estructura de responsabilidades de la empresa. A diferencia del organigrama tradicional (que muestra jerarquía), el AC muestra quién es responsable de qué resultados y funciones clave.',
    para_que: 'Eliminar la ambigüedad de "¿quién decide esto?" y "¿de quién es ese problema?". Cuando cada función tiene un dueño claro, la ejecución acelera.',
    conceptos: [
      { term: 'Visionary', def: 'El fundador/emprendedor. Piensa en el futuro, tiene ideas, conecta relaciones. Necesita un Integrator para ejecutar.' },
      { term: 'Integrator', def: 'El que hace que todo funcione. Gerente General o Director de Operaciones. Es el pegamento del equipo directivo.' },
      { term: 'Asientos', def: 'Cada caja del AC es un "asiento" con 3 a 5 funciones clave y una métrica de éxito principal.' },
      { term: 'Una persona, un asiento', def: 'Cada asiento debe tener un solo responsable. Múltiples responsables = nadie es responsable.' },
    ],
    como_se_usa: 'Se construye en el Focus Day. Primero el chart ideal (sin nombres), luego se asignan personas. Se revisa cada trimestre.',
  },
  {
    id: 'people-analyzer',
    nombre: 'People Analyzer',
    icono: '👥',
    componente: 'personas',
    que_es: 'El People Analyzer es la herramienta para evaluar si las personas del equipo son las correctas. Combina dos dimensiones: si la persona vive los valores de la empresa, y si cumple con GWC en su rol.',
    para_que: 'Tomar decisiones objetivas sobre personas sin que se vuelva personal. Ayuda a identificar quién debe desarrollarse, moverse de asiento, o salir de la organización.',
    conceptos: [
      { term: 'GWC — Gets it', def: 'Entiende (G): la persona comprende intuitivamente lo que su rol requiere, cómo funciona la empresa y qué se espera de ella.' },
      { term: 'GWC — Wants it', def: 'Quiere (W): la persona genuinamente quiere hacer el trabajo. No porque le toca, sino porque le apasiona.' },
      { term: 'GWC — Capacity', def: 'Puede (C): tiene la capacidad mental, física y emocional para ejecutar el rol con excelencia.' },
      { term: 'Values fit', def: 'La persona vive y respira los Core Values de la empresa en su comportamiento cotidiano.' },
      { term: '+, +/-, -', def: 'Cada dimensión se califica como +, +/- o -. Una persona con múltiples - en posición crítica es un problema urgente.' },
    ],
    como_se_usa: 'Se aplica a cada miembro del equipo directivo una vez por trimestre. Se discute en la Sesión Trimestral como parte de la revisión de Personas.',
  },
  {
    id: 'scorecard',
    nombre: 'Scorecard Semanal',
    icono: '📊',
    componente: 'datos',
    que_es: 'El Scorecard es una tabla simple de 5 a 15 métricas clave que se reportan semanalmente. Cada métrica tiene un dueño, una meta y un semáforo (verde/amarillo/rojo). Se revisa en los primeros 5 minutos de cada L10.',
    para_que: 'Dar visibilidad temprana de problemas antes de que se vuelvan crisis. Eliminar la dependencia de reportes mensuales que siempre llegan tarde.',
    conceptos: [
      { term: 'Métricas predictivas', def: 'Mide actividades que predicen resultados futuros (ej. llamadas de ventas esta semana), no solo resultados pasados (ej. ventas del mes).' },
      { term: 'Una métrica por persona', def: 'Cada miembro del equipo directivo es responsable de al menos una métrica semanal.' },
      { term: 'Semáforo', def: 'Verde = en meta. Amarillo = cerca pero por debajo. Rojo = por debajo del umbral mínimo aceptable.' },
      { term: '13 semanas', def: 'El Scorecard ideal muestra las últimas 13 semanas para detectar tendencias, no solo el número de esta semana.' },
    ],
    como_se_usa: 'Se configura en el Focus Day con 5-10 métricas iniciales. Se revisa cada lunes en el L10. Se actualiza con nuevas métricas cada trimestre.',
  },
  {
    id: 'rocks',
    nombre: 'Rocks — Rocas Trimestrales',
    icono: '🪨',
    componente: 'traccion',
    que_es: 'Las Rocas son las 3 a 7 prioridades más importantes que la empresa DEBE completar en los próximos 90 días. El nombre viene de la metáfora del frasco: las Rocas (prioridades) van primero, luego la grava (tareas), luego la arena (correos).',
    para_que: 'Crear el enfoque que convierte la visión en ejecución. Sin Rocas, el equipo trabaja mucho pero avanza poco porque todo parece urgente.',
    conceptos: [
      { term: 'El mundo de 90 días', def: 'Tres meses es el horizonte de tiempo ideal para comprometerse con objetivos. Suficientemente largo para lograr algo grande; suficientemente corto para mantener urgencia.' },
      { term: 'SMART Rocks', def: 'Específicas, Medibles, Alcanzables, Relevantes y con Tiempo definido. Una Roca vaga no es una Roca.' },
      { term: 'En camino / En riesgo', def: 'Solo dos estados durante el trimestre. Sin porcentajes, sin "casi". O vas a completarla o no.' },
      { term: 'Rocks de empresa vs. individuales', def: 'Hay 3-7 Rocas de empresa (del equipo directivo colectivo) y Rocas individuales asignadas a cada directivo.' },
    ],
    como_se_usa: 'Se definen al final de cada Sesión Trimestral para los próximos 90 días. Se revisan en cada L10 semanal (5 minutos). Se celebran al completarse.',
  },
  {
    id: 'issues-list',
    nombre: 'Issues List — Lista de Asuntos',
    icono: '⚠',
    componente: 'asuntos',
    que_es: 'La Lista de Asuntos es el repositorio centralizado de todos los problemas, obstáculos, ideas y oportunidades de la empresa que necesitan atención. Se alimenta continuamente y se prioriza y resuelve en el L10.',
    para_que: 'Sacar los problemas de las conversaciones de pasillo y llevarlos a un lugar donde se puedan priorizar y resolver en equipo, de forma sistemática.',
    conceptos: [
      { term: 'IDS', def: 'Identify-Discuss-Solve. El proceso de 3 pasos para resolver asuntos. Primero identificas el problema real (no el síntoma), luego discutes (debate sano), luego decides la solución.' },
      { term: 'Priorizar los 3 más importantes', def: 'En cada L10, el equipo vota los 3 asuntos más importantes de la semana. Esos se resuelven primero.' },
      { term: 'Resolver para siempre', def: 'El objetivo del IDS es resolver el problema de raíz, no solo arreglarlo temporalmente.' },
      { term: 'Asuntos de nivel 10', def: 'Algunos asuntos son estratégicos y requieren la sesión trimestral o anual. Identificarlos y moverlos al lugar correcto.' },
    ],
    como_se_usa: 'Cualquier persona puede agregar asuntos en cualquier momento. Se revisan y priorizan en los 60 minutos de IDS de cada L10.',
  },
  {
    id: 'meeting-pulse',
    nombre: 'Meeting Pulse — Pulso de Reuniones',
    icono: '📅',
    componente: 'traccion',
    que_es: 'El Meeting Pulse es el ritmo de reuniones del sistema EOS: semanales L10 (90 min), trimestrales (1 día) y anuales (2 días). No son reuniones adicionales — reemplazan todas las reuniones desordenadas existentes.',
    para_que: 'Crear la cadencia que mantiene al equipo alineado, resolviendo problemas y ejecutando la visión de forma continua.',
    conceptos: [
      { term: 'L10 Semanal', def: '90 minutos semanales con el equipo directivo. 6 segmentos fijos: check-in, scorecard, rocas, titulares, IDS, conclusión.' },
      { term: 'Sesión Trimestral', def: '1 día cada 90 días para revisar el trimestre, celebrar Rocas completadas y definir las del próximo trimestre.' },
      { term: 'Sesión Anual', def: '2 días al año para revisar los 6 componentes, actualizar el V/TO y planificar el año siguiente.' },
      { term: 'Calificación 1-10', def: 'Al final de cada L10, cada persona califica la reunión del 1 al 10. Si el promedio es menor a 8, se discute qué mejorar.' },
    ],
    como_se_usa: 'Se establece el Meeting Pulse en el Focus Day. Las fechas de L10 se bloquean en el calendario para todo el año. Las Sesiones Trimestrales se agendan al inicio de cada trimestre.',
  },
  {
    id: 'process-documenter',
    nombre: '3-Step Process Documenter',
    icono: '⚙',
    componente: 'procesos',
    que_es: 'El 3-Step Process Documenter es la metodología de EOS para documentar los procesos medulares de la empresa en un formato simple que el equipo realmente usa.',
    para_que: 'Crear consistencia y escalabilidad. Cuando los procesos están documentados y se siguen, el negocio no depende de personas específicas para funcionar bien.',
    conceptos: [
      { term: 'Paso 1 — Documentar', def: 'Identificar los 6 a 10 procesos medulares del negocio. Para cada uno, listar los pasos principales (no más de 10).' },
      { term: 'Paso 2 — Simplificar', def: 'Revisar cada proceso y eliminar lo que no agrega valor. El objetivo es el proceso más simple que da los mejores resultados.' },
      { term: 'Paso 3 — Implementar', def: 'Capacitar a todo el equipo en el proceso simplificado y asegurarse de que lo sigan. "Seguido por todos" es el estándar.' },
      { term: 'Procesos medulares', def: 'Los 6 a 10 procesos que, si se ejecutan correctamente y consistentemente, definen el éxito del negocio. Ej: ventas, entrega, reclutamiento, finanzas.' },
    ],
    como_se_usa: 'Se inicia en el Vision Building Day 2. El dueño de cada proceso lidera su documentación. Se revisa en cada Sesión Trimestral para identificar qué procesos necesitan mejora.',
  },
]
```

- [ ] **Paso 3: Commit**

```bash
git add app/src/data/frases-libro.js app/src/data/marcos-referencia.js
git commit -m "feat: add frases-libro and marcos-referencia static content"
```

---

## Task 3: Hook `useImplementation`

**Files:**
- Create: `app/src/lib/useImplementation.js`

- [ ] **Paso 1: Crear el hook**

Las tareas de implementación son estáticas (definidas en el código). El hook solo persiste cuáles están completadas.

```js
// src/lib/useImplementation.js
import { useState, useEffect, useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { supabase } from './supabase'
import { useApp } from '../context/AppContext'

// Definición estática de las 5 fases y sus tareas
// Los task_key son identificadores únicos que se persisten en la DB
export const FASES = [
  {
    id: 1,
    nombre: 'Focus Day',
    duracion: '1 día completo',
    descripcion: 'Introducción al sistema EOS con el equipo directivo. El punto de partida.',
    separacion: null,
    tareas_facilitadas: [
      { key: 'f1_t1', label: 'Presentar los 6 componentes EOS al equipo', tipo: 'guia' },
      { key: 'f1_t2', label: 'Construir el Accountability Chart', tipo: 'interactivo', link: '/personas', instruccion: 'Ir a Personas → agregar a cada miembro del equipo directivo con su rol' },
      { key: 'f1_t3', label: 'Definir las primeras 3-7 Rocas del trimestre', tipo: 'interactivo', link: '/traccion', instruccion: 'Ir a Tracción → agregar las primeras Rocas del equipo' },
      { key: 'f1_t4', label: 'Establecer el Meeting Pulse (agendar L10 semanales)', tipo: 'interactivo', link: '/reuniones', instruccion: 'Ir a Reuniones → agendar los L10 semanales del trimestre' },
      { key: 'f1_t5', label: 'Crear la primera Lista de Asuntos con el equipo', tipo: 'interactivo', link: '/asuntos', instruccion: 'Ir a Asuntos → capturar los problemas que el equipo identifique hoy' },
      { key: 'f1_t6', label: 'Definir las primeras 5-10 métricas del Scorecard', tipo: 'interactivo', link: '/datos', instruccion: 'Ir a Datos → configurar las métricas iniciales del equipo' },
    ],
    formularios_individuales: [
      { key: 'f1_f1', label: 'Organizational Checkup (evaluación inicial)', pendiente_ad: true },
      { key: 'f1_f2', label: 'People Analyzer — evaluación inicial del equipo', pendiente_ad: true },
    ],
  },
  {
    id: 2,
    nombre: 'Vision Building Day 1',
    duracion: '1 día completo',
    descripcion: 'Completar la primera mitad del V/TO: Core Values, Core Focus, 10-Year Target y Marketing Strategy.',
    separacion: '~30 días después del Focus Day',
    tareas_facilitadas: [
      { key: 'f2_t1', label: 'Revisar Rocas del primer mes y actualizar estados', tipo: 'interactivo', link: '/traccion', instruccion: 'Ir a Tracción → actualizar el estado de cada Roca' },
      { key: 'f2_t2', label: 'Definir los Core Values de IC Constructora', tipo: 'interactivo', link: '/vision', instruccion: 'Ir a Visión → completar el paso "Valores Centrales" del V/TO' },
      { key: 'f2_t3', label: 'Definir el Core Focus (propósito + nicho)', tipo: 'interactivo', link: '/vision', instruccion: 'Ir a Visión → completar el paso "Enfoque Central" del V/TO' },
      { key: 'f2_t4', label: 'Definir el 10-Year Target', tipo: 'interactivo', link: '/vision', instruccion: 'Ir a Visión → completar el paso "Meta a 10 Años"' },
      { key: 'f2_t5', label: 'Definir la Marketing Strategy', tipo: 'interactivo', link: '/vision', instruccion: 'Ir a Visión → completar el paso "Estrategia de Marketing"' },
    ],
    formularios_individuales: [
      { key: 'f2_f1', label: 'Encuesta de identificación de Core Values por persona', pendiente_ad: true },
    ],
  },
  {
    id: 3,
    nombre: 'Vision Building Day 2',
    duracion: '1 día completo',
    descripcion: 'Completar la segunda mitad del V/TO: 3-Year Picture, 1-Year Plan y Rocas del trimestre.',
    separacion: '~30 días después del VBD 1',
    tareas_facilitadas: [
      { key: 'f3_t1', label: 'Revisar y ajustar V/TO Parte 1 del mes anterior', tipo: 'guia' },
      { key: 'f3_t2', label: 'Definir la 3-Year Picture', tipo: 'interactivo', link: '/vision', instruccion: 'Ir a Visión → completar el paso "Imagen a 3 Años"' },
      { key: 'f3_t3', label: 'Definir el 1-Year Plan con 3-7 objetivos del año', tipo: 'interactivo', link: '/vision', instruccion: 'Ir a Visión → completar el paso "Plan a 1 Año"' },
      { key: 'f3_t4', label: 'Definir las Rocas del próximo trimestre', tipo: 'interactivo', link: '/traccion', instruccion: 'Ir a Tracción → reemplazar Rocas del Q actual por las del siguiente' },
      { key: 'f3_t5', label: 'Revisar y completar el Accountability Chart', tipo: 'interactivo', link: '/personas', instruccion: 'Ir a Personas → verificar que todos tienen rol y evaluación GWC actualizada' },
    ],
    formularios_individuales: [
      { key: 'f3_f1', label: 'People Analyzer completo de todo el equipo', pendiente_ad: true },
    ],
  },
  {
    id: 4,
    nombre: 'Sesiones Trimestrales',
    duracion: '1 día por sesión',
    descripcion: 'Revisión de 90 días: celebrar Rocas completadas, resolver asuntos estratégicos y definir nuevas Rocas.',
    separacion: 'Cada 90 días (recurrente)',
    tareas_facilitadas: [
      { key: 'f4_t1', label: 'Revisar Rocas del trimestre anterior (completadas / no completadas)', tipo: 'interactivo', link: '/traccion', instruccion: 'Ir a Tracción → marcar Rocas como completadas o incompletas' },
      { key: 'f4_t2', label: 'Revisar el Scorecard de las últimas 13 semanas', tipo: 'interactivo', link: '/datos', instruccion: 'Ir a Datos → revisar tendencias de las últimas 13 semanas' },
      { key: 'f4_t3', label: 'Actualizar el V/TO si hay cambios en la visión', tipo: 'interactivo', link: '/vision', instruccion: 'Ir a Visión → actualizar los campos que hayan cambiado' },
      { key: 'f4_t4', label: 'Resolver asuntos estratégicos del trimestre (IDS)', tipo: 'interactivo', link: '/asuntos', instruccion: 'Ir a Asuntos → priorizar y resolver los más importantes del trimestre' },
      { key: 'f4_t5', label: 'Definir las Rocas del próximo trimestre', tipo: 'interactivo', link: '/traccion', instruccion: 'Ir a Tracción → agregar las Rocas del siguiente trimestre' },
    ],
    formularios_individuales: [
      { key: 'f4_f1', label: 'Evaluación trimestral de Rocas individuales por gerente', pendiente_ad: true },
    ],
  },
  {
    id: 5,
    nombre: 'Sesión Anual',
    duracion: '2 días completos',
    descripcion: 'Revisión profunda de los 6 componentes, actualización completa del V/TO y planificación del año siguiente.',
    separacion: 'Una vez al año',
    tareas_facilitadas: [
      { key: 'f5_t1', label: 'Revisión completa de los 6 componentes EOS', tipo: 'guia' },
      { key: 'f5_t2', label: 'Actualización completa del V/TO', tipo: 'interactivo', link: '/vision', instruccion: 'Ir a Visión → actualizar el V/TO completo para el nuevo año' },
      { key: 'f5_t3', label: 'Revisión anual del Accountability Chart y People Analyzer', tipo: 'interactivo', link: '/personas', instruccion: 'Ir a Personas → revisar y actualizar evaluación GWC de todo el equipo' },
      { key: 'f5_t4', label: 'Definir las Rocas anuales y del Q1', tipo: 'interactivo', link: '/traccion', instruccion: 'Ir a Tracción → definir las Rocas más importantes del año y del primer trimestre' },
      { key: 'f5_t5', label: 'Revisar y mejorar los procesos medulares', tipo: 'interactivo', link: '/procesos', instruccion: 'Ir a Procesos → actualizar o mejorar procesos que necesiten ajuste' },
    ],
    formularios_individuales: [
      { key: 'f5_f1', label: 'Revisión anual de desempeño por gerente', pendiente_ad: true },
      { key: 'f5_f2', label: 'Evaluación de salud EOS (Organizational Checkup anual)', pendiente_ad: true },
    ],
  },
]

const STORAGE_KEY = 'eos_implementation'

// Genera el estado inicial con todas las tareas como no completadas
function buildInitialState() {
  return FASES.map((fase, idx) => ({
    phase_id: fase.id,
    status: idx === 0 ? 'active' : 'pending',
    scheduled_date: null,
    completed_at: null,
    notes: '',
    task_completions: {}, // { task_key: { completed: bool, completed_at: string } }
  }))
}

export function useImplementation() {
  const { isDemoMode, isSupabaseConfigured } = useApp()
  const [localData, setLocalData] = useLocalStorage(STORAGE_KEY, buildInitialState())
  const [sbData, setSbData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured || isDemoMode) return
    setLoading(true)
    Promise.all([
      supabase.from('implementation_progress').select('*').eq('company_id', 'ic-constructora').order('phase_id'),
      supabase.from('implementation_tasks').select('*').eq('company_id', 'ic-constructora'),
    ]).then(([{ data: phases }, { data: tasks }]) => {
      if (!phases) { setLoading(false); return }
      // Merge phases + tasks into the same shape as localData
      const merged = FASES.map(fase => {
        const phase = phases.find(p => p.phase_id === fase.id) || {
          phase_id: fase.id, status: fase.id === 1 ? 'active' : 'pending',
          scheduled_date: null, completed_at: null, notes: '',
        }
        const task_completions = {}
        ;(tasks || []).filter(t => t.phase_id === fase.id).forEach(t => {
          task_completions[t.task_key] = { completed: t.completed, completed_at: t.completed_at }
        })
        return { ...phase, task_completions }
      })
      setSbData(merged)
      setLoading(false)
    })
  }, [isSupabaseConfigured, isDemoMode])

  const data = (isSupabaseConfigured && !isDemoMode) ? (sbData ?? []) : localData

  // Marcar una tarea como completada/incompleta
  const toggleTask = useCallback(async (phaseId, taskKey, completed) => {
    const now = completed ? new Date().toISOString() : null

    if (isSupabaseConfigured && !isDemoMode) {
      await supabase.from('implementation_tasks').upsert({
        company_id: 'ic-constructora', phase_id: phaseId,
        task_key: taskKey, completed, completed_at: now,
      }, { onConflict: 'company_id,phase_id,task_key' })
      setSbData(prev => prev.map(p => p.phase_id !== phaseId ? p : {
        ...p, task_completions: { ...p.task_completions, [taskKey]: { completed, completed_at: now } }
      }))
    } else {
      setLocalData(prev => prev.map(p => p.phase_id !== phaseId ? p : {
        ...p, task_completions: { ...p.task_completions, [taskKey]: { completed, completed_at: now } }
      }))
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalData])

  // Completar una fase completa
  const completePhase = useCallback(async (phaseId) => {
    const now = new Date().toISOString()
    const nextPhaseId = phaseId + 1

    if (isSupabaseConfigured && !isDemoMode) {
      await supabase.from('implementation_progress').upsert([
        { company_id: 'ic-constructora', phase_id: phaseId, status: 'completed', completed_at: now },
        ...(nextPhaseId <= 5 ? [{ company_id: 'ic-constructora', phase_id: nextPhaseId, status: 'active' }] : []),
      ], { onConflict: 'company_id,phase_id' })
      setSbData(prev => prev.map(p => {
        if (p.phase_id === phaseId) return { ...p, status: 'completed', completed_at: now }
        if (p.phase_id === nextPhaseId) return { ...p, status: 'active' }
        return p
      }))
    } else {
      setLocalData(prev => prev.map(p => {
        if (p.phase_id === phaseId) return { ...p, status: 'completed', completed_at: now }
        if (p.phase_id === nextPhaseId) return { ...p, status: 'active' }
        return p
      }))
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalData])

  // Actualizar notas o fecha de una fase
  const updatePhase = useCallback(async (phaseId, changes) => {
    if (isSupabaseConfigured && !isDemoMode) {
      await supabase.from('implementation_progress').upsert(
        { company_id: 'ic-constructora', phase_id: phaseId, ...changes },
        { onConflict: 'company_id,phase_id' }
      )
      setSbData(prev => prev.map(p => p.phase_id === phaseId ? { ...p, ...changes } : p))
    } else {
      setLocalData(prev => prev.map(p => p.phase_id === phaseId ? { ...p, ...changes } : p))
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalData])

  // Helpers
  const getPhaseData = (phaseId) => data.find(p => p.phase_id === phaseId) || {}
  const isTaskDone = (phaseId, taskKey) => !!getPhaseData(phaseId)?.task_completions?.[taskKey]?.completed
  const completedPhases = data.filter(p => p.status === 'completed').length
  const activePhase = data.find(p => p.status === 'active')

  return { data, loading, toggleTask, completePhase, updatePhase, getPhaseData, isTaskDone, completedPhases, activePhase, FASES }
}
```

- [ ] **Paso 2: Verificar que no hay errores de importación**

```bash
cd app && npm run build 2>&1 | head -30
```

Si hay errores, corregir antes de continuar.

- [ ] **Paso 3: Commit**

```bash
git add app/src/lib/useImplementation.js
git commit -m "feat: add useImplementation hook with 5-phase EOS journey"
```

---

## Task 4: Hook `useTranscriptions`

**Files:**
- Create: `app/src/lib/useTranscriptions.js`

- [ ] **Paso 1: Crear el hook**

```js
// src/lib/useTranscriptions.js
import { useState, useEffect, useCallback } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { supabase } from './supabase'
import { useApp } from '../context/AppContext'

const STORAGE_KEY = 'eos_transcriptions'

export const EOS_COMPONENTS_TAGS = ['vision','personas','datos','asuntos','procesos','traccion','general']

export function useTranscriptions() {
  const { isDemoMode, isSupabaseConfigured } = useApp()
  const [localT, setLocalT] = useLocalStorage(STORAGE_KEY, [])
  const [sbT, setSbT] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isSupabaseConfigured || isDemoMode) return
    setLoading(true)
    supabase
      .from('transcriptions')
      .select('*')
      .eq('company_id', 'ic-constructora')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setSbT(data ?? []); setLoading(false) })
  }, [isSupabaseConfigured, isDemoMode])

  const transcriptions = (isSupabaseConfigured && !isDemoMode) ? (sbT ?? []) : localT

  const add = useCallback(async (t) => {
    const entry = { ...t, created_at: new Date().toISOString() }
    if (isSupabaseConfigured && !isDemoMode) {
      const { data } = await supabase
        .from('transcriptions')
        .insert([{ ...entry, company_id: 'ic-constructora' }])
        .select().single()
      if (data) setSbT(prev => [data, ...(prev ?? [])])
      return data
    } else {
      const r = { ...entry, id: Date.now() }
      setLocalT(prev => [r, ...prev])
      return r
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalT])

  const remove = useCallback(async (id) => {
    if (isSupabaseConfigured && !isDemoMode) {
      await supabase.from('transcriptions').delete().eq('id', id)
      setSbT(prev => prev.filter(t => t.id !== id))
    } else {
      setLocalT(prev => prev.filter(t => t.id !== id))
    }
  }, [isDemoMode, isSupabaseConfigured, setLocalT])

  // Detectar patrones: temas más frecuentes en las últimas N transcripciones
  const topTopics = (limit = 10) => {
    const counts = {}
    transcriptions.forEach(t => {
      (t.topics || []).forEach(topic => {
        const key = `${topic.eos_component}::${topic.label}`
        counts[key] = (counts[key] || 0) + 1
      })
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key, count]) => {
        const [eos_component, label] = key.split('::')
        return { label, eos_component, count }
      })
  }

  // Asuntos recurrentes: mismo tema en 3+ transcripciones
  const recurringTopics = () => topTopics(50).filter(t => t.count >= 3)

  return { transcriptions, loading, add, remove, topTopics, recurringTopics }
}
```

- [ ] **Paso 2: Commit**

```bash
git add app/src/lib/useTranscriptions.js
git commit -m "feat: add useTranscriptions hook"
```

---

## Task 5: Componente `GuiaEOS`

**Files:**
- Create: `app/src/components/guia/GuiaEOS.jsx`

- [ ] **Paso 1: Crear el directorio y el componente**

```jsx
// src/components/guia/GuiaEOS.jsx
// Componente reutilizable — tab educativo para los 6 módulos EOS
import { Link } from 'react-router-dom'
import { BookOpen, ArrowRight } from 'lucide-react'

const GUIA_CONTENT = {
  vision: {
    color: 'var(--eos-vision)',
    que_es: 'El componente Visión define a dónde va IC Constructora y cómo llegar. Se captura en el V/TO (Vision/Traction Organizer) — un documento de dos páginas que responde las 8 preguntas fundamentales del negocio.',
    para_que: 'Alinear a todo el equipo hacia los mismos valores, propósito y metas. Cuando la visión está clara y compartida, las decisiones cotidianas se toman más rápido y en la misma dirección.',
    conceptos: ['Core Values — valores no negociables', 'Core Focus — propósito + nicho', '10-Year Target — la gran meta', 'Marketing Strategy — cliente ideal y propuesta única', '3-Year Picture — imagen vivida del futuro', '1-Year Plan — objetivos del año'],
    accion: { label: 'Completar el V/TO', link: '/vision' },
    marco: 'vto',
  },
  personas: {
    color: 'var(--eos-people)',
    que_es: 'El componente Personas se basa en un principio simple: necesitas a las personas correctas en los asientos correctos. Primero define qué asientos necesitas (Accountability Chart), luego evalúa si las personas correctas los ocupan (People Analyzer + GWC).',
    para_que: 'Eliminar la fricción que viene de tener personas incorrectas en roles equivocados. Una empresa con las personas correctas en los asientos correctos ejecuta hasta 3 veces más rápido.',
    conceptos: ['GWC — Entiende / Quiere / Puede', 'Accountability Chart — quién es responsable de qué', 'People Analyzer — evaluación objetiva del equipo', 'Visionary vs Integrator — los dos roles clave', 'Right people, right seats'],
    accion: { label: 'Ver el equipo directivo', link: '/personas' },
    marco: 'accountability-chart',
  },
  datos: {
    color: 'var(--eos-data)',
    que_es: 'El componente Datos elimina la gestión por opiniones y la reemplaza por números. El Scorecard semanal da visibilidad temprana de problemas antes de que se conviertan en crisis. Cada directivo reporta una métrica clave cada semana.',
    para_que: 'Saber en tiempo real si el negocio está en buen camino. Un semáforo en amarillo puede corregirse; uno en rojo ya es crisis. El Scorecard da la visibilidad que los reportes mensuales no pueden dar.',
    conceptos: ['Scorecard semanal — 5 a 15 métricas', 'Semáforo verde / amarillo / rojo', 'Métricas predictivas vs. históricas', 'Una métrica por persona', 'Tendencia de 13 semanas'],
    accion: { label: 'Ver el Scorecard', link: '/datos' },
    marco: 'scorecard',
  },
  asuntos: {
    color: 'var(--eos-issues)',
    que_es: 'El componente Asuntos es donde la empresa resuelve sus problemas de forma sistemática. Todos los problemas, obstáculos, ideas y oportunidades van a una lista centralizada. En cada reunión L10 se priorizan y resuelven usando el proceso IDS.',
    para_que: 'Eliminar los elefantes en la habitación — esos problemas que todos conocen pero nadie aborda. El IDS asegura que los problemas se resuelvan para siempre, no solo se tapen temporalmente.',
    conceptos: ['IDS — Identificar, Discutir, Solucionar', 'Issues List — repositorio centralizado', 'Resolver para siempre, no tapar', 'Los asuntos son un regalo', 'Síntoma vs. problema real'],
    accion: { label: 'Ver la lista de asuntos', link: '/asuntos' },
    marco: 'issues-list',
  },
  procesos: {
    color: 'var(--eos-process)',
    que_es: 'El componente Procesos convierte el conocimiento tácito de las personas en procesos documentados que cualquiera puede seguir. Se enfoca en los 6 a 10 procesos medulares del negocio — los que, si se hacen bien y consistentemente, definen el éxito.',
    para_que: 'Crear consistencia y escalabilidad. Cuando los procesos están documentados y seguidos por todos, el negocio deja de depender de personas específicas para funcionar bien.',
    conceptos: ['Procesos medulares — los 6 a 10 críticos', 'Documentar — simplificar — implementar', '"Seguido por todos" es el estándar', 'Escalabilidad sin dependencia de personas', 'KPI por proceso'],
    accion: { label: 'Ver los procesos', link: '/procesos' },
    marco: 'process-documenter',
  },
  traccion: {
    color: 'var(--eos-traction)',
    que_es: 'El componente Tracción es la disciplina de ejecución. Convierte la visión en resultados concretos a través de dos herramientas: las Rocas (prioridades trimestrales) y el Meeting Pulse (reuniones estructuradas semanales, trimestrales y anuales).',
    para_que: 'Pasar del modo reactivo al proactivo. Sin Tracción, las empresas trabajan mucho pero avanzan poco porque todo parece urgente. Las Rocas crean el enfoque; el Meeting Pulse crea el ritmo.',
    conceptos: ['Rocas — 3 a 7 prioridades del trimestre', 'El mundo de 90 días', 'En camino / En riesgo — sin grises', 'Meeting Pulse — L10, trimestral, anual', 'L10 — 90 minutos, 6 segmentos'],
    accion: { label: 'Ver las Rocas del trimestre', link: '/traccion' },
    marco: 'meeting-pulse',
  },
}

export default function GuiaEOS({ module }) {
  const content = GUIA_CONTENT[module]
  if (!content) return null

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

      {/* Header educativo */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)', padding: 'var(--space-5)', background: `${content.color}08`, border: `1px solid ${content.color}20`, borderRadius: 'var(--radius-lg)' }}>
        <BookOpen size={22} style={{ color: content.color, flexShrink: 0, marginTop: 2 }} />
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: content.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Sistema EOS — Componente {module.charAt(0).toUpperCase() + module.slice(1)}
          </p>
          <p style={{ fontSize: '0.925rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>{content.que_es}</p>
        </div>
      </div>

      {/* Grid: Para qué sirve + Conceptos clave */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
        <div className="card">
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--space-3)' }}>
            ¿Para qué sirve?
          </p>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.7 }}>{content.para_que}</p>
        </div>

        <div className="card">
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 'var(--space-3)' }}>
            Conceptos clave del libro
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {content.conceptos.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: content.color, flexShrink: 0, marginTop: 6 }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Links de acción */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <Link to={content.accion.link} className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowRight size={14} /> {content.accion.label}
        </Link>
        <Link to="/biblioteca" className="btn btn-ghost" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <BookOpen size={14} /> Ver marcos de referencia
        </Link>
      </div>

      {/* Referencia al libro */}
      <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${content.color}` }}>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Basado en <strong style={{ color: 'var(--text-primary)' }}>Tracción</strong> de Gino Wickman —
          el manual del sistema EOS (Entrepreneurial Operating System).
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Paso 2: Commit**

```bash
git add app/src/components/guia/GuiaEOS.jsx
git commit -m "feat: add GuiaEOS reusable educational component"
```

---

## Task 6: Agregar tab "Guía EOS" a los 6 módulos

**Files:**
- Modify: `app/src/pages/VisionPage.jsx`
- Modify: `app/src/pages/PersonasPage.jsx`
- Modify: `app/src/pages/DatosPage.jsx`
- Modify: `app/src/pages/AsuntosPage.jsx`
- Modify: `app/src/pages/ProcesosPage.jsx`
- Modify: `app/src/pages/TraccionPage.jsx`

El patrón es idéntico en todos. Se muestra para VisionPage; los demás siguen el mismo patrón.

- [ ] **Paso 1: Modificar VisionPage para agregar tab Guía EOS**

En `app/src/pages/VisionPage.jsx`, el componente renderiza directamente el wizard/vista. Necesita envolver su contenido actual en un tab y agregar el tab "Guía EOS".

Leer el archivo actual, luego envolver el contenido en este patrón:

```jsx
// Agregar al inicio del archivo (imports):
import GuiaEOS from '../components/guia/GuiaEOS'

// En el componente VisionPage, agregar estado de tab y wrapper:
// ANTES del return principal, agregar:
const [activeTab, setActiveTab] = useState('modulo')  // 'modulo' | 'guia'

// Envolver el JSX existente del return en:
return (
  <div className="fade-in">
    {/* Tab selector */}
    <div style={{ display: 'flex', gap: 0, marginBottom: 'var(--space-5)', borderBottom: '1px solid var(--border-subtle)' }}>
      {[['modulo', 'Visión'], ['guia', 'Guía EOS']].map(([k, l]) => (
        <button key={k} onClick={() => setActiveTab(k)} style={{
          padding: 'var(--space-3) var(--space-5)', background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '0.9rem', fontWeight: 600,
          color: activeTab === k ? 'var(--text-primary)' : 'var(--text-muted)',
          borderBottom: `2px solid ${activeTab === k ? 'var(--brand-primary)' : 'transparent'}`,
          marginBottom: -1,
        }}>{l}</button>
      ))}
    </div>

    {activeTab === 'modulo' && (
      /* ...TODO EL JSX ACTUAL DE VISIONPAGE... */
    )}
    {activeTab === 'guia' && <GuiaEOS module="vision" />}
  </div>
)
```

**Importante:** el `useState('modulo')` y el import de `GuiaEOS` se agregan al componente existente, no reemplaza nada del contenido actual.

- [ ] **Paso 2: Aplicar el mismo patrón a los 5 módulos restantes**

Para cada archivo, el patrón es idéntico — solo cambia el `module` prop y el label del tab:

| Archivo | module prop | Tab label |
|---------|------------|-----------|
| `PersonasPage.jsx` | `"personas"` | `'Personas'` |
| `DatosPage.jsx` | `"datos"` | `'Datos'` — este ya tiene tabs, agregar `'guia'` a los existentes |
| `AsuntosPage.jsx` | `"asuntos"` | `'Asuntos'` |
| `ProcesosPage.jsx` | `"procesos"` | `'Procesos'` |
| `TraccionPage.jsx` | `"traccion"` | `'Tracción'` |

Para `DatosPage.jsx` que ya tiene tabs `['scorecard', 'chart']`, agregar `'guia'` como tercer tab:
```jsx
// En DatosPage, los tabs existentes son 'scorecard' y 'chart'
// Agregar tercera opción:
{[['scorecard','Scorecard'],['chart','Tendencias'],['guia','Guía EOS']].map(...)}
// Y al final del contenido:
{activeTab === 'guia' && <GuiaEOS module="datos" />}
```

- [ ] **Paso 3: Verificar build sin errores**

```bash
cd app && npm run build 2>&1 | tail -20
```

- [ ] **Paso 4: Commit**

```bash
git add app/src/pages/VisionPage.jsx app/src/pages/PersonasPage.jsx app/src/pages/DatosPage.jsx app/src/pages/AsuntosPage.jsx app/src/pages/ProcesosPage.jsx app/src/pages/TraccionPage.jsx
git commit -m "feat: add GuiaEOS tab to all 6 EOS modules"
```

---

## Task 7: Página `ImplementacionPage`

**Files:**
- Create: `app/src/pages/ImplementacionPage.jsx`

- [ ] **Paso 1: Crear la página**

```jsx
// src/pages/ImplementacionPage.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Map, CheckCircle2, Circle, Lock, ChevronDown, ChevronUp, ExternalLink, Clock } from 'lucide-react'
import { useImplementation, FASES } from '../lib/useImplementation'

const STATUS_CFG = {
  pending:   { label: 'Pendiente',  color: 'var(--border-medium)',    bg: 'var(--bg-elevated)' },
  active:    { label: 'Fase Actual', color: 'var(--brand-primary)',   bg: 'rgba(232,160,32,0.08)' },
  completed: { label: 'Completada', color: 'var(--status-success)',   bg: 'rgba(34,197,94,0.06)' },
}

function PhaseCard({ fase, phaseData, isTaskDone, onToggleTask, onComplete, onUpdatePhase }) {
  const [expanded, setExpanded] = useState(phaseData?.status === 'active')
  const [editNotes, setEditNotes] = useState(false)
  const [notes, setNotes] = useState(phaseData?.notes || '')
  const navigate = useNavigate()

  const sc = STATUS_CFG[phaseData?.status || 'pending']
  const isActive = phaseData?.status === 'active'
  const isCompleted = phaseData?.status === 'completed'
  const isPending = phaseData?.status === 'pending'

  const allFacilitadasDone = fase.tareas_facilitadas.every(t => isTaskDone(fase.id, t.key))
  const totalTasks = fase.tareas_facilitadas.length
  const doneTasks = fase.tareas_facilitadas.filter(t => isTaskDone(fase.id, t.key)).length

  return (
    <div style={{ border: `2px solid ${isActive ? sc.color : isPending ? 'var(--border-subtle)' : sc.color}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden', opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s' }}>
      {/* Header */}
      <div style={{ background: isActive ? sc.bg : 'var(--bg-surface)', padding: 'var(--space-4) var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: isCompleted ? sc.color : isActive ? sc.color : 'var(--bg-elevated)', border: `2px solid ${sc.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {isCompleted
            ? <CheckCircle2 size={20} color="#fff" />
            : isPending
              ? <Lock size={16} style={{ color: 'var(--text-muted)' }} />
              : <span style={{ fontWeight: 800, color: isActive ? '#000' : 'var(--text-muted)', fontSize: '0.9rem' }}>{fase.id}</span>
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Fase {fase.id} — {fase.nombre}</h3>
            <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 700, color: sc.color, background: `${sc.color}18` }}>{sc.label}</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {fase.duracion}{fase.separacion ? ` · ${fase.separacion}` : ''}
          </p>
        </div>

        {isActive && (
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            {doneTasks}/{totalTasks} tareas
          </span>
        )}

        {!isPending && (
          <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(e => !e)}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>

      {/* Barra de progreso (solo fase activa) */}
      {isActive && (
        <div style={{ height: 4, background: 'var(--border-subtle)' }}>
          <div style={{ height: '100%', width: `${totalTasks ? (doneTasks/totalTasks)*100 : 0}%`, background: 'var(--brand-primary)', transition: 'width 0.4s' }} />
        </div>
      )}

      {/* Contenido expandido */}
      {expanded && !isPending && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}>
          <div style={{ padding: 'var(--space-5)' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 'var(--space-5)' }}>{fase.descripcion}</p>

            {/* Tareas facilitadas */}
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)' }}>
                🖥 Ejercicios facilitados (pantalla compartida)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {fase.tareas_facilitadas.map(tarea => {
                  const done = isTaskDone(fase.id, tarea.key)
                  return (
                    <div key={tarea.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', padding: 'var(--space-3)', background: done ? 'rgba(34,197,94,0.05)' : 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: `1px solid ${done ? 'rgba(34,197,94,0.2)' : 'var(--border-subtle)'}` }}>
                      <button onClick={() => !isCompleted && onToggleTask(fase.id, tarea.key, !done)} style={{ background: 'none', border: 'none', cursor: isCompleted ? 'default' : 'pointer', color: done ? 'var(--status-success)' : 'var(--text-muted)', flexShrink: 0, padding: 0, marginTop: 1 }}>
                        {done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      </button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.875rem', color: done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: done ? 'line-through' : 'none', fontWeight: 500 }}>
                          {tarea.label}
                        </p>
                        {tarea.instruccion && (
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{tarea.instruccion}</p>
                        )}
                      </div>
                      {tarea.link && !isCompleted && (
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(tarea.link)} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <ExternalLink size={12} /> Ir
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Formularios individuales (placeholders) */}
            <div style={{ marginBottom: 'var(--space-5)' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)' }}>
                📋 Formularios individuales (para cada gerente)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {fase.formularios_individuales.map(f => (
                  <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-medium)', opacity: 0.7 }}>
                    <Circle size={18} style={{ color: 'var(--border-medium)', flexShrink: 0 }} />
                    <p style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text-muted)' }}>{f.label}</p>
                    <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: 'var(--radius-full)', background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                      Requiere integración AD
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notas */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notas de la sesión</p>
                {!editNotes && <button className="btn btn-ghost btn-sm" onClick={() => setEditNotes(true)}>Editar</button>}
              </div>
              {editNotes ? (
                <div>
                  <textarea className="form-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Apuntes, acuerdos, contexto de la sesión..." />
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => { onUpdatePhase(fase.id, { notes }); setEditNotes(false) }}>Guardar</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setNotes(phaseData?.notes || ''); setEditNotes(false) }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '0.875rem', color: notes ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: notes ? 'normal' : 'italic' }}>
                  {notes || 'Sin notas aún...'}
                </p>
              )}
            </div>

            {/* Botón completar fase */}
            {isActive && allFacilitadasDone && (
              <div style={{ padding: 'var(--space-4)', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--status-success)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
                  ✓ Todas las tareas completadas — ¿listo para avanzar?
                </p>
                <button className="btn btn-primary" onClick={() => onComplete(fase.id)}>
                  <CheckCircle2 size={14} /> Completar Fase {fase.id} y desbloquear la siguiente
                </button>
              </div>
            )}

            {isCompleted && (
              <p style={{ fontSize: '0.82rem', color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={14} />
                Completada el {new Date(phaseData.completed_at).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ImplementacionPage() {
  const { data, loading, toggleTask, completePhase, updatePhase, getPhaseData, isTaskDone, completedPhases, activePhase } = useImplementation()

  const pct = Math.round((completedPhases / 5) * 100)

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div className="page-title">
            <div className="page-title-icon" style={{ background: 'rgba(232,160,32,0.1)' }}>
              <Map size={24} style={{ color: 'var(--brand-primary)' }} />
            </div>
            <div>
              <h1>Implementación EOS</h1>
              <p style={{ marginTop: 4 }}>Hoja de ruta IC Constructora — basada en el libro <em>Tracción</em></p>
            </div>
          </div>
        </div>
      </div>

      {/* Progreso global */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)', alignItems: 'center' }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: '1rem' }}>Progreso de Implementación</p>
            {activePhase && (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Actualmente en: <strong style={{ color: 'var(--brand-primary)' }}>Fase {activePhase.phase_id} — {FASES[activePhase.phase_id - 1]?.nombre}</strong>
              </p>
            )}
          </div>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: pct === 100 ? 'var(--status-success)' : 'var(--brand-primary)' }}>{pct}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%`, transition: 'width 0.6s ease', background: pct === 100 ? 'var(--status-success)' : 'var(--brand-primary)' }} />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-5)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
          {[['var(--status-success)', 'Completadas', completedPhases], ['var(--brand-primary)', 'En curso', activePhase ? 1 : 0], ['var(--border-medium)', 'Pendientes', 5 - completedPhases - (activePhase ? 1 : 0)]].map(([c, l, v]) => (
            <span key={l} style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />
              {v} {l}
            </span>
          ))}
        </div>
      </div>

      {/* Fases */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>Cargando progreso...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {FASES.map(fase => (
            <PhaseCard
              key={fase.id}
              fase={fase}
              phaseData={getPhaseData(fase.id)}
              isTaskDone={isTaskDone}
              onToggleTask={toggleTask}
              onComplete={completePhase}
              onUpdatePhase={updatePhase}
            />
          ))}
        </div>
      )}

      {/* Nota sobre formularios */}
      <div style={{ marginTop: 'var(--space-8)', padding: 'var(--space-4) var(--space-5)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)' }}>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Formularios individuales:</strong> Los formularios marcados como "Requiere integración AD" se activarán cuando se conecte el directorio activo de IC Constructora. Los gerentes entrarán a la app con sus credenciales corporativas y verán sus formularios pendientes en su dashboard.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Paso 2: Commit**

```bash
git add app/src/pages/ImplementacionPage.jsx
git commit -m "feat: add ImplementacionPage with 5-phase EOS journey tracker"
```

---

## Task 8: Página `BibliotecaPage`

**Files:**
- Create: `app/src/pages/BibliotecaPage.jsx`

- [ ] **Paso 1: Crear la página**

```jsx
// src/pages/BibliotecaPage.jsx — Frases del libro + Marcos de referencia
import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { FRASES_LIBRO, COMPONENTE_LABELS, COMPONENTE_COLORS } from '../data/frases-libro'
import { MARCOS } from '../data/marcos-referencia'

const MODULE_PATHS = { vision: '/vision', personas: '/personas', datos: '/datos', asuntos: '/asuntos', procesos: '/procesos', traccion: '/traccion' }

function FrasaCard({ frase }) {
  const color = COMPONENTE_COLORS[frase.componente] || 'var(--brand-primary)'
  return (
    <div style={{ padding: 'var(--space-4) var(--space-5)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', borderLeft: `4px solid ${color}` }}>
      <p style={{ fontSize: '0.925rem', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.7, marginBottom: 'var(--space-2)' }}>
        "{frase.texto}"
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{frase.capitulo}</span>
        <span style={{ padding: '1px 7px', borderRadius: 'var(--radius-full)', fontSize: '0.68rem', fontWeight: 600, color, background: `${color}15` }}>
          {COMPONENTE_LABELS[frase.componente]}
        </span>
        {frase.destacada && <span style={{ fontSize: '0.68rem', color: 'var(--brand-primary)' }}>⭐ Destacada</span>}
      </div>
    </div>
  )
}

function MarcoCard({ marco }) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()
  const color = COMPONENTE_COLORS[marco.componente] || 'var(--brand-primary)'

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4) var(--space-5)', cursor: 'pointer' }} onClick={() => setExpanded(e => !e)}>
        <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{marco.icono}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{marco.nombre}</p>
          <span style={{ fontSize: '0.72rem', padding: '1px 7px', borderRadius: 'var(--radius-full)', color, background: `${color}15`, fontWeight: 600 }}>
            {COMPONENTE_LABELS[marco.componente]}
          </span>
        </div>
        {expanded ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />}
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: 'var(--space-5)', background: 'var(--bg-elevated)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>¿Qué es?</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.7 }}>{marco.que_es}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>¿Para qué sirve?</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.7 }}>{marco.para_que}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Conceptos clave</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {marco.conceptos.map((c, i) => (
                <div key={i} style={{ padding: 'var(--space-3)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.85rem', color, marginBottom: 3 }}>{c.term}</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{c.def}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>¿Cómo se usa?</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.7 }}>{marco.como_se_usa}</p>
          </div>
          {MODULE_PATHS[marco.componente] && (
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(MODULE_PATHS[marco.componente])} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowRight size={13} /> Ver módulo en la app
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function BibliotecaPage() {
  const [activeTab, setActiveTab] = useState('frases')
  const [componentFilter, setComponentFilter] = useState('all')
  const [search, setSearch] = useState('')

  const allComponents = ['all', 'vision', 'personas', 'datos', 'asuntos', 'procesos', 'traccion', 'general']

  const filteredFrases = FRASES_LIBRO.filter(f => {
    const matchComp = componentFilter === 'all' || f.componente === componentFilter
    const matchSearch = !search || f.texto.toLowerCase().includes(search.toLowerCase())
    return matchComp && matchSearch
  })

  const filteredMarcos = MARCOS.filter(m =>
    componentFilter === 'all' || componentFilter === 'general' || m.componente === componentFilter
  )

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">
          <div className="page-title-icon" style={{ background: 'rgba(232,160,32,0.1)' }}>
            <BookOpen size={24} style={{ color: 'var(--brand-primary)' }} />
          </div>
          <div>
            <h1>Biblioteca EOS</h1>
            <p style={{ marginTop: 4 }}>Frases clave y marcos de referencia del libro <em>Tracción</em> — Gino Wickman</p>
          </div>
        </div>
      </div>

      {/* Tabs principales */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 'var(--space-5)', borderBottom: '1px solid var(--border-subtle)' }}>
        {[['frases', `Frases del Libro (${FRASES_LIBRO.length})`], ['marcos', `Marcos de Referencia (${MARCOS.length})`]].map(([k, l]) => (
          <button key={k} onClick={() => setActiveTab(k)} style={{
            padding: 'var(--space-3) var(--space-5)', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.9rem', fontWeight: 600,
            color: activeTab === k ? 'var(--text-primary)' : 'var(--text-muted)',
            borderBottom: `2px solid ${activeTab === k ? 'var(--brand-primary)' : 'transparent'}`,
            marginBottom: -1,
          }}>{l}</button>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
          {allComponents.filter(c => activeTab === 'frases' || c !== 'general').map(c => (
            <button key={c} onClick={() => setComponentFilter(c)} style={{
              padding: 'var(--space-2) var(--space-3)', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.78rem', fontWeight: 600,
              color: componentFilter === c ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: `2px solid ${componentFilter === c ? (COMPONENTE_COLORS[c] || 'var(--brand-primary)') : 'transparent'}`,
              marginBottom: -1,
            }}>{c === 'all' ? 'Todos' : COMPONENTE_LABELS[c] || c}</button>
          ))}
        </div>
        {activeTab === 'frases' && (
          <input className="form-input" style={{ width: 220, padding: '6px 12px', fontSize: '0.82rem' }}
            placeholder="Buscar frase..." value={search} onChange={e => setSearch(e.target.value)} />
        )}
      </div>

      {/* Contenido */}
      {activeTab === 'frases' && (
        filteredFrases.length === 0 ? (
          <div className="card empty-state">
            <p style={{ color: 'var(--text-muted)' }}>No hay frases que coincidan con la búsqueda.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {filteredFrases.map(f => <FrasaCard key={f.id} frase={f} />)}
          </div>
        )
      )}

      {activeTab === 'marcos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filteredMarcos.map(m => <MarcoCard key={m.id} marco={m} />)}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Paso 2: Commit**

```bash
git add app/src/pages/BibliotecaPage.jsx
git commit -m "feat: add BibliotecaPage with book quotes and reference frameworks"
```

---

## Task 9: Tab Transcripciones en ReunionesPage

**Files:**
- Modify: `app/src/pages/ReunionesPage.jsx`

- [ ] **Paso 1: Agregar el import del hook al inicio del archivo**

Agregar después de los imports existentes en `ReunionesPage.jsx`:
```jsx
import { useTranscriptions, EOS_COMPONENTS_TAGS } from '../lib/useTranscriptions'
```

- [ ] **Paso 2: Agregar el hook dentro del componente**

Dentro de `ReunionesPage`, después de `const { meetings, ... } = useMeetings()`, agregar:
```jsx
const { transcriptions, loading: tLoading, add: addTranscription, remove: removeTranscription, topTopics, recurringTopics } = useTranscriptions()
```

- [ ] **Paso 3: Agregar el estado del formulario de nueva transcripción**

Dentro del componente, agregar:
```jsx
const [showTransForm, setShowTransForm] = useState(false)
const [transForm, setTransForm] = useState({
  participants_raw: '', topics_raw: '', decisions_raw: '',
  commitments_raw: '', raw_transcript: '', meeting_id: null,
})
```

- [ ] **Paso 4: Agregar `'transcripciones'` a los tabs existentes**

Encontrar el array de tabs en ReunionesPage (actualmente tiene 'agenda' y 'historial') y agregar 'transcripciones':
```jsx
// Antes: [['agenda','Agenda L10'], ['historial','Historial']]
// Después:
[['agenda','Agenda L10'], ['historial','Historial'], ['transcripciones','Transcripciones']]
```

- [ ] **Paso 5: Agregar el contenido del tab transcripciones**

Después del bloque `{activeTab === 'historial' && (...)}`, agregar:

```jsx
{activeTab === 'transcripciones' && (
  <div>
    {/* Header del tab */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
      <div>
        <p style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Transcripciones de Reuniones</p>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>Repositorio estructurado para detectar patrones a lo largo del tiempo</p>
      </div>
      <button className="btn btn-primary" onClick={() => setShowTransForm(s => !s)}>+ Nueva transcripción</button>
    </div>

    {/* Patrones detectados */}
    {transcriptions.length >= 3 && (
      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <p className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Patrones detectados</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-3)' }}>Temas más frecuentes</p>
            {topTopics(5).map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>{t.label}</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.count}x</span>
              </div>
            ))}
          </div>
          {recurringTopics().length > 0 && (
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--status-warning)', textTransform: 'uppercase', marginBottom: 'var(--space-3)' }}>Asuntos recurrentes (3+ veces)</p>
              {recurringTopics().map((t, i) => (
                <div key={i} style={{ padding: 'var(--space-2)', background: 'rgba(234,179,8,0.06)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-2)', fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                  ⚠ {t.label} ({t.count}x)
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}

    {/* Formulario nueva transcripción */}
    {showTransForm && (
      <div className="card" style={{ marginBottom: 'var(--space-5)', border: '1px solid var(--brand-primary)' }}>
        <p className="card-title" style={{ marginBottom: 'var(--space-4)' }}>Nueva Transcripción</p>
        <div className="form-grid">
          <div>
            <label className="form-label">Participantes (separados por coma)</label>
            <input className="form-input" value={transForm.participants_raw} onChange={e => setTransForm(f => ({ ...f, participants_raw: e.target.value }))} placeholder="Carlos M., Ana L., ..." />
          </div>
          <div>
            <label className="form-label">Reunión relacionada</label>
            <select className="form-input" value={transForm.meeting_id || ''} onChange={e => setTransForm(f => ({ ...f, meeting_id: e.target.value || null }))}>
              <option value="">Sin vincular</option>
              {meetings.filter(m => m.status === 'completed').map(m => (
                <option key={m.id} value={m.id}>{m.title} — {m.date}</option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Temas tratados (uno por línea — formato: "componente: descripción" ej. "vision: revisar core values")</label>
            <textarea className="form-input" rows={3} value={transForm.topics_raw} onChange={e => setTransForm(f => ({ ...f, topics_raw: e.target.value }))} placeholder={'vision: revisar core values\ntraccion: rocas Q2\nasuntos: proveedor retrasa entrega'} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Decisiones tomadas (una por línea)</label>
            <textarea className="form-input" rows={2} value={transForm.decisions_raw} onChange={e => setTransForm(f => ({ ...f, decisions_raw: e.target.value }))} placeholder="Cambiar proveedor de materiales antes del 15 de mayo" />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Transcripción completa (pegar desde Otter / Teams / Zoom)</label>
            <textarea className="form-input" rows={6} value={transForm.raw_transcript} onChange={e => setTransForm(f => ({ ...f, raw_transcript: e.target.value }))} placeholder="Pegar aquí la transcripción completa de la reunión..." />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
          <button className="btn btn-primary" onClick={() => {
            const topics = transForm.topics_raw.split('\n').filter(Boolean).map(line => {
              const [comp, ...rest] = line.split(':')
              const eos_component = EOS_COMPONENTS_TAGS.includes(comp.trim()) ? comp.trim() : 'general'
              return { label: rest.join(':').trim() || comp.trim(), eos_component }
            })
            addTranscription({
              participants: transForm.participants_raw.split(',').map(s => s.trim()).filter(Boolean),
              topics,
              decisions: transForm.decisions_raw.split('\n').filter(Boolean),
              commitments: [],
              raw_transcript: transForm.raw_transcript,
              meeting_id: transForm.meeting_id,
              source: 'manual',
            })
            setTransForm({ participants_raw: '', topics_raw: '', decisions_raw: '', commitments_raw: '', raw_transcript: '', meeting_id: null })
            setShowTransForm(false)
          }}>Guardar Transcripción</button>
          <button className="btn btn-ghost" onClick={() => setShowTransForm(false)}>Cancelar</button>
        </div>
      </div>
    )}

    {/* Placeholder integración */}
    <div style={{ padding: 'var(--space-4)', background: 'var(--bg-elevated)', border: '1px dashed var(--border-medium)', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
      <div>
        <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Integración automática de transcripciones</p>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>Conecta Otter.ai, Microsoft Teams o Zoom para que las transcripciones lleguen automáticamente.</p>
      </div>
      <span style={{ padding: '4px 10px', borderRadius: 'var(--radius-full)', background: 'var(--bg-base)', border: '1px solid var(--border-medium)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Próximamente</span>
    </div>

    {/* Lista de transcripciones */}
    {tLoading ? (
      <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>Cargando...</div>
    ) : transcriptions.length === 0 ? (
      <div className="card empty-state">
        <div className="empty-state-icon">🎙</div>
        <h3>Sin transcripciones aún</h3>
        <p>Agrega la primera transcripción de una reunión L10.</p>
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {transcriptions.map(t => (
          <div key={t.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{new Date(t.created_at).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.participants?.join(', ')}</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => removeTranscription(t.id)} style={{ color: 'var(--status-error)' }}>Eliminar</button>
            </div>
            {t.topics?.length > 0 && (
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                {t.topics.map((tp, i) => (
                  <span key={i} style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.72rem', fontWeight: 600, background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
                    {tp.eos_component}: {tp.label}
                  </span>
                ))}
              </div>
            )}
            {t.decisions?.length > 0 && (
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Decisiones</p>
                {t.decisions.map((d, i) => <p key={i} style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>• {d}</p>)}
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

- [ ] **Paso 6: Commit**

```bash
git add app/src/pages/ReunionesPage.jsx
git commit -m "feat: add Transcripciones tab to ReunionesPage"
```

---

## Task 10: Sidebar + Routing

**Files:**
- Modify: `app/src/components/layout/Sidebar.jsx`
- Modify: `app/src/App.jsx`

- [ ] **Paso 1: Actualizar Sidebar.jsx**

Agregar imports al inicio:
```jsx
import { Map, BookOpen } from 'lucide-react'
```

Agregar después del bloque de módulos EOS (después del cierre del `{EOS_MODULES.map(...)}`) y antes del cierre de `<nav>`:

```jsx
{/* EOS Toolkit */}
<div className="nav-section-label" style={{ marginTop: 8 }}>EOS Toolkit</div>

<NavLink
  to="/implementacion"
  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
  onClick={handleNavClick}
>
  <Map size={18} className="nav-item-icon" style={{ color: location.pathname === '/implementacion' ? 'var(--brand-primary)' : undefined }} />
  Implementación
</NavLink>

<NavLink
  to="/biblioteca"
  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
  onClick={handleNavClick}
>
  <BookOpen size={18} className="nav-item-icon" style={{ color: location.pathname === '/biblioteca' ? 'var(--brand-primary)' : undefined }} />
  Biblioteca EOS
</NavLink>
```

- [ ] **Paso 2: Actualizar App.jsx**

Agregar los lazy imports:
```jsx
const ImplementacionPage = lazy(() => import('./pages/ImplementacionPage'))
const BibliotecaPage     = lazy(() => import('./pages/BibliotecaPage'))
```

Agregar las rutas dentro de `<Routes>`:
```jsx
<Route path="/implementacion" element={<ImplementacionPage />} />
<Route path="/biblioteca"     element={<BibliotecaPage />} />
```

- [ ] **Paso 3: Verificar build completo**

```bash
cd app && npm run build 2>&1 | tail -20
```

Resultado esperado: sin errores, lista de chunks con los nuevos archivos.

- [ ] **Paso 4: Commit final**

```bash
git add app/src/App.jsx app/src/components/layout/Sidebar.jsx
git commit -m "feat: add /implementacion and /biblioteca routes and sidebar navigation"
```

---

## Task 11: Verificación final

- [ ] **Paso 1: Arrancar el servidor de desarrollo**

```bash
cd app && npm run dev
```

- [ ] **Paso 2: Verificar cada nueva funcionalidad**

| Verificación | URL | Qué revisar |
|---|---|---|
| Sidebar EOS Toolkit | Cualquier página | Ver las 2 entradas nuevas bajo "EOS Toolkit" |
| Implementación | `/implementacion` | Progreso 0%, Fase 1 activa y expandida, tareas clickeables |
| Marcar tarea | `/implementacion` | Hacer click en una tarea → se marca con check → progreso sube |
| Biblioteca frases | `/biblioteca` | Tab "Frases del Libro" → filtrar por componente → buscar texto |
| Biblioteca marcos | `/biblioteca` | Tab "Marcos de Referencia" → expandir V/TO → ver conceptos |
| Guía en Visión | `/vision` | Tab "Guía EOS" → ver contenido educativo → link "Ir a Visión" |
| Guía en Personas | `/personas` | Tab "Guía EOS" → ver contenido de Personas |
| Guía en Datos | `/datos` | Tres tabs: Scorecard / Tendencias / Guía EOS |
| Guía en los 3 restantes | `/asuntos`, `/procesos`, `/traccion` | Tab "Guía EOS" visible y funcional |
| Transcripciones | `/reuniones` | Tab "Transcripciones" → formulario nueva transcripción |

- [ ] **Paso 3: Commit de cierre**

```bash
git add .
git commit -m "feat: EOS Toolkit complete — implementation tracker, library, educational tabs, transcriptions"
```

---

## Resumen de entregables

| Subsistema | Archivos | Estado al completar |
|---|---|---|
| 🗺 Implementación | `useImplementation.js`, `ImplementacionPage.jsx` | 5 fases navegables, tareas completables, notas por fase |
| 📖 Biblioteca EOS | `frases-libro.js`, `marcos-referencia.js`, `BibliotecaPage.jsx` | 37 frases del libro, 8 marcos expandibles |
| 🎓 Guía EOS | `GuiaEOS.jsx` + 6 módulos modificados | Tab "Guía EOS" en los 6 módulos |
| 🎙 Transcripciones | `useTranscriptions.js` + `ReunionesPage.jsx` | Tab "Transcripciones" con formulario y detección de patrones |
| 🔧 Infraestructura | `schema.sql`, `App.jsx`, `Sidebar.jsx` | 3 tablas nuevas, 2 rutas, 2 entradas en sidebar |
