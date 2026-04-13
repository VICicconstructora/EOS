# EOS Toolkit — Diseño de Especificación
**Fecha:** 2026-04-06  
**Proyecto:** IC Constructora — Sistema EOS  
**Estado:** Aprobado por usuario

---

## Contexto

IC Constructora está iniciando la implementación EOS desde cero (Fase 0). La app ya tiene los 6 módulos operativos (Visión, Personas, Datos, Asuntos, Procesos, Tracción), reuniones L10 con runner interactivo y persistencia en Supabase. Este spec define 4 subsistemas nuevos que convierten la app en la herramienta de implementación EOS en sí misma.

---

## Alcance de este spec

### Incluido
1. **Proceso de Implementación** — tracker de 5 fases del libro con ejercicios facilitados
2. **Biblioteca EOS** — frases del libro + marcos de referencia (solo lectura)
3. **Guía EOS** — tab educativo en cada uno de los 6 módulos existentes
4. **Transcripciones** — tab en Reuniones con estructura para integración futura

### Excluido (fase futura con AD)
- UserForms interactivos dentro de la app (NO por email — los usuarios entran y llenan directamente)
- Integración con Active Directory para autenticación y gestión de usuarios/roles
- Organigrama digital vinculado a roles del Accountability Chart
- Asignación automática de formularios según rol (quién ve qué al entrar)
- Panel de admin con visibilidad en tiempo real de quién completó qué formulario

---

## Arquitectura de navegación

Se mantiene la estructura existente del sidebar. Se agregan:

```
Sidebar (nuevas entradas)
├── 🗺  Implementación     → /implementacion
└── 📖  Biblioteca EOS     → /biblioteca

Módulos existentes (cambio: nuevo tab)
├── Visión         → agrega tab "Guía EOS"
├── Personas       → agrega tab "Guía EOS"
├── Datos          → agrega tab "Guía EOS"
├── Asuntos        → agrega tab "Guía EOS"
├── Procesos       → agrega tab "Guía EOS"
├── Tracción       → agrega tab "Guía EOS"
└── Reuniones      → agrega tab "Transcripciones"
```

---

## Subsistema 1: Proceso de Implementación (`/implementacion`)

### Propósito
Guiar a IC Constructora a través de las 5 fases de implementación EOS del libro *Tracción* de Gino Wickman. IC Constructora empieza desde cero (ninguna fase completada).

### Las 5 fases

| # | Nombre | Duración | Separación |
|---|--------|----------|------------|
| 1 | Focus Day | 1 día | — |
| 2 | Vision Building Day 1 | 1 día | ~30 días después |
| 3 | Vision Building Day 2 | 1 día | ~30 días después |
| 4 | Sesiones Trimestrales | 1 día | Cada 90 días (recurrente) |
| 5 | Sesión Anual | 2 días | Cada año (recurrente) |

### Estructura de cada fase

Cada fase contiene dos tipos de actividades:

**A) Ejercicios Facilitados** (se usan en pantalla durante la sesión grupal)
- Tipo `guia`: texto explicativo + checklist manual que el facilitador va marcando
- Tipo `interactivo`: deep-link al módulo existente de la app con instrucción específica (ej. "Ir a Tracción → agregar las primeras 3 Rocas"). El item se marca completo manualmente al volver. No se duplican formularios — se usa lo que ya existe en la app.

**B) Formularios Individuales** (enviados a cada gerente por separado)
- En esta fase: renderizados como placeholders con badge "AD pendiente"
- Cuando se integre AD: se activará el envío por email según el Accountability Chart

### Avance de fases
- **Manual**: el admin/director marca cada tarea del checklist individualmente
- Al completar todas las tareas de una fase, aparece el botón "Completar fase"
- Las fases siguientes se desbloquean en cascada
- Se guarda `completed_at` timestamp por fase y por tarea

### UI de la página
- Barra de progreso global (0–5 fases)
- Fase activa: card expandida con checklist + actividades
- Fases futuras: cards colapsadas, bloqueadas con candado
- Fases completadas: cards con check verde, colapsadas pero expandibles para referencia
- Campo de fecha para agendar cada fase
- Notas por fase (textarea libre)

### Datos (`useImplementation` hook)
```js
// localStorage key: 'eos_implementation'
// Supabase tabla: implementation_progress
{
  phase_id: 1..5,
  status: 'pending' | 'active' | 'completed',
  scheduled_date: date | null,
  completed_at: timestamp | null,
  notes: string,
  tasks: [{ id, label, type, completed, completed_at }]
}
```

### Tareas por fase

**Fase 1 — Focus Day**
- Facilitados: Presentar los 6 componentes EOS (guía), Construir Accountability Chart (interactivo), Definir primeras Rocas 90 días (interactivo), Establecer Meeting Pulse (guía), Crear primera Lista de Asuntos (interactivo), Intro al Scorecard semanal (guía)
- Individuales: Organizational Checkup (placeholder), People Analyzer inicial (placeholder)

**Fase 2 — Vision Building Day 1**
- Facilitados: Revisar rocas de los últimos 30 días, Definir Core Values (interactivo), Definir Core Focus: propósito + nicho (interactivo), Definir 10-Year Target (interactivo), Definir Marketing Strategy (interactivo)
- Individuales: Encuesta de valores por persona (placeholder)

**Fase 3 — Vision Building Day 2**
- Facilitados: Revisar V/TO Parte 1, Definir 3-Year Picture (interactivo), Definir 1-Year Plan (interactivo), Definir Rocas del trimestre (interactivo), Revisar y ajustar Accountability Chart
- Individuales: People Analyzer completo (placeholder)

**Fase 4 — Sesión Trimestral (recurrente)**
- Facilitados: Revisar rocas del trimestre pasado, Revisar y actualizar V/TO, Definir nuevas rocas, Resolver asuntos estratégicos (IDS)
- Individuales: Evaluación de progreso por gerente (placeholder)

**Fase 5 — Sesión Anual (recurrente)**
- Facilitados: Revisión completa de los 6 componentes, Actualización del V/TO completo, Definir rocas anuales + Q1, Evaluación del equipo directivo
- Individuales: Revisión anual de desempeño (placeholder)

---

## Subsistema 2: Biblioteca EOS (`/biblioteca`)

### Propósito
Referencia curada del libro *Tracción*. Solo lectura — ningún campo es editable. Es una biblioteca de consulta, no un formulario.

### Tab 1 — Frases del Libro

Colección de citas y frases clave de *Tracción* de Gino Wickman, pre-cargadas en la app, organizadas por los 6 componentes EOS.

**Estructura de cada frase:**
```js
{
  id, texto, capitulo, pagina_aprox,
  componente: 'vision'|'personas'|'datos'|'asuntos'|'procesos'|'traccion'|'general',
  destacada: boolean
}
```

**UI:**
- Filtro por componente (tabs con colores del design system)
- Buscador de texto libre
- Cards con borde izquierdo del color del componente, cita en cursiva, capítulo/fuente abajo
- Las frases son de solo lectura — no se pueden editar ni agregar (contenido del libro)
- ~5–8 frases destacadas por componente, pre-cargadas como constante en el código

### Tab 2 — Marcos de Referencia

Biblioteca de los frameworks del libro. Solo lectura y consulta.

**Marcos incluidos:**
1. **V/TO** — Vision/Traction Organizer: qué es, sus 8 secciones, cómo usarlo
2. **Accountability Chart** — diferencia con organigrama tradicional, estructura de 3 roles: Visionary, Integrator, funciones clave
3. **People Analyzer** — GWC (Entiende/Quiere/Puede) + alineación de valores; diferencia con evaluación de desempeño
4. **Scorecard Semanal** — qué medir, cómo elegir métricas, semáforo verde/amarillo/rojo
5. **Rocks (Rocas)** — qué es una roca, criterios SMART, el trimestre como unidad de ejecución
6. **Issues List** — la lista de asuntos y el proceso IDS (Identificar, Discutir, Solucionar)
7. **Meeting Pulse** — estructura L10, por qué 90 minutos, las 6 partes
8. **3-Step Process Documenter** — documentar, simplificar, implementar + seguir

**UI de cada marco:**
- Card expandible con icono, nombre y descripción breve
- Al expandir: explicación en secciones (Qué es / Para qué sirve / Conceptos clave / Cómo se usa en EOS)
- Badge de qué componente EOS cubre
- Link "Ver en la app" que navega al módulo correspondiente

---

## Subsistema 3: Guía EOS (tab en cada módulo)

### Propósito
Dar contexto educativo a cada módulo para que todo el equipo entienda por qué existe y qué rol juega en el sistema EOS.

### Contenido por módulo (estructura uniforme)

Cada tab "Guía EOS" tiene 4 secciones:

1. **¿Qué es?** — Definición del componente según el libro
2. **¿Para qué sirve?** — Beneficio concreto para la organización
3. **Conceptos clave** — 3–5 términos o ideas centrales del libro (chips/tags)
4. **Estado en IC Constructora** — widget que muestra el estado actual del módulo (ej. "V/TO 40% completado → Ir a completar") con link directo a la acción

### Contenido específico por módulo

**Visión**
- Qué es: El componente que define a dónde va la empresa y cómo llegar, capturado en el V/TO
- Para qué: Alinear a todo el equipo hacia los mismos valores, propósito y metas
- Conceptos: Core Values, Core Focus, 10-Year Target, Marketing Strategy, Traction

**Personas**
- Qué es: Tener a las personas correctas en los asientos correctos (right people, right seats)
- Para qué: Eliminar fricción, aumentar velocidad de ejecución
- Conceptos: GWC (Entiende/Quiere/Puede), People Analyzer, Accountability Chart, valores

**Datos**
- Qué es: Gestionar el negocio con números, no opiniones — scorecard semanal de métricas clave
- Para qué: Visibilidad temprana de problemas, eliminar el "yo creo que..."
- Conceptos: Scorecard, métricas predictivas vs. rezagadas, semáforo, meta semanal

**Asuntos**
- Qué es: Identificar, discutir y resolver los problemas de la organización de forma sistemática
- Para qué: Eliminar los elefantes en la habitación, resolver en lugar de tolerar
- Conceptos: IDS, Issues List, Identify-Discuss-Solve, solucionar para siempre

**Procesos**
- Qué es: Documentar y seguir los procesos medulares del negocio de forma consistente
- Para qué: Escalabilidad, consistencia, reducir dependencia de personas específicas
- Conceptos: Core Processes, 3-Step Process Documenter, "seguido por todos"

**Tracción**
- Qué es: La disciplina de ejecución — convertir la visión en resultados trimestrales
- Para qué: Pasar del modo reactivo al proactivo, crear momentum
- Conceptos: Rocks (Rocas), 90-day world, Meeting Pulse, L10, scorecard

---

## Subsistema 4: Transcripciones (tab en Reuniones)

### Propósito
Repositorio estructurado de transcripciones de reuniones L10, diseñado para detección de patrones a lo largo del tiempo. La integración con herramientas de transcripción (Otter.ai, Microsoft Teams, Zoom) se implementará en una fase futura vía webhook.

### Estructura de una transcripción
```js
{
  id, meeting_id,               // ligado a una reunión existente
  source: 'manual'|'otter'|'teams'|'zoom',
  participants: string[],
  topics: [{                    // temas tratados
    label: string,
    eos_component: string,      // tag del componente EOS
    duration_min: number
  }],
  decisions: string[],          // decisiones tomadas
  commitments: [{               // compromisos asignados
    text: string, owner: string, due_date: date
  }],
  raw_transcript: string,       // texto completo (paste manual o webhook)
  created_at: timestamp
}
```

### UI del tab Transcripciones
- Lista de transcripciones pasadas (fecha, reunión, participantes, # decisiones)
- Botón "Nueva Transcripción" — formulario guiado paso a paso
- Panel de búsqueda: keyword + filtro por componente EOS + rango de fechas
- Sección "Patrones detectados": temas más frecuentes (últimas 8 semanas), asuntos recurrentes (mismo tema en 3+ reuniones), palabras más repetidas por componente EOS
- Placeholder visible: "Conectar Otter.ai / Teams / Zoom" con webhook URL para cuando se configure

### Hook `useTranscriptions`
- Mismo patrón localStorage/Supabase que el resto de hooks
- Tabla Supabase: `transcriptions` (a agregar al schema)
- localStorage key: `'eos_transcriptions'`

---

## Base de datos — tablas nuevas

```sql
-- Progreso de implementación
create table public.implementation_progress (
  id uuid primary key default uuid_generate_v4(),
  company_id text not null,
  phase_id integer not null check (phase_id between 1 and 5),
  status text default 'pending' check (status in ('pending','active','completed')),
  scheduled_date date,
  completed_at timestamptz,
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.implementation_tasks (
  id uuid primary key default uuid_generate_v4(),
  company_id text not null,
  phase_id integer not null,
  task_key text not null,     -- identificador único de la tarea
  completed boolean default false,
  completed_at timestamptz,
  completed_by text default ''
);

-- Transcripciones de reuniones
create table public.transcriptions (
  id uuid primary key default uuid_generate_v4(),
  company_id text not null,
  meeting_id uuid references public.meetings(id),
  source text default 'manual' check (source in ('manual','otter','teams','zoom')),
  participants text[] default '{}',
  topics jsonb default '[]',
  decisions text[] default '{}',
  commitments jsonb default '[]',
  raw_transcript text default '',
  created_at timestamptz default now()
);
```

*(Las frases del libro y marcos de referencia son contenido estático — viven como constantes en el código, no en la DB)*

---

## Archivos a crear/modificar

### Nuevos
```
app/src/pages/ImplementacionPage.jsx
app/src/pages/BibliotecaPage.jsx
app/src/lib/useImplementation.js
app/src/lib/useTranscriptions.js
app/src/data/frases-libro.js        ← constante con frases pre-cargadas
app/src/data/marcos-referencia.js   ← constante con marcos pre-cargados
app/src/components/guia/GuiaEOS.jsx ← componente reutilizable para el tab educativo
```

### Modificados
```
app/src/App.jsx                     ← 2 rutas nuevas
app/src/components/layout/Sidebar.jsx ← 2 entradas nuevas + separador "EOS Toolkit"
app/src/pages/VisionPage.jsx        ← agregar tab GuiaEOS
app/src/pages/PersonasPage.jsx      ← agregar tab GuiaEOS
app/src/pages/DatosPage.jsx         ← agregar tab GuiaEOS
app/src/pages/AsuntosPage.jsx       ← agregar tab GuiaEOS
app/src/pages/ProcesosPage.jsx      ← agregar tab GuiaEOS
app/src/pages/TraccionPage.jsx      ← agregar tab GuiaEOS
app/src/pages/ReunionesPage.jsx     ← agregar tab Transcripciones
app/supabase/schema.sql             ← 2 tablas nuevas
```

---

## Conexión con UserForms (fase futura)

Los **Formularios Individuales** de cada fase del tracker de implementación se renderizan como placeholders con el badge "AD pendiente". Cuando se integre AD + organigrama:

**Arquitectura sin email:**
- Los formularios viven dentro de la app — no se envían por correo
- Cada gerente entra a la app con sus credenciales AD y ve sus formularios pendientes en su dashboard personal
- El admin/facilitador tiene un panel de seguimiento en tiempo real: quién entró, quién completó, quién falta
- No hay paso de "recolectar respuestas" — todo está en la app desde el inicio

**Qué aporta la integración AD:**
1. **Autenticación** — los usuarios entran con sus credenciales corporativas (SSO)
2. **Roles automáticos** — el rol en AD mapea al rol en el Accountability Chart
3. **Asignación de formularios** — según el rol, la app muestra los formularios que le corresponden
4. **Visibilidad en tiempo real** — el facilitador ve el estado de completado de cada persona durante la sesión

---

## Fuera de alcance (no implementar en este sprint)
- Editor de frases del libro (el contenido es fijo, del libro)
- Exportación PDF de marcos de referencia
- Notificaciones push al completar fases
- Modo multi-empresa para la implementación
- Integración real con Otter.ai / Teams / Zoom (solo webhook placeholder)
