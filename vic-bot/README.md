# VIC Bot — Asistente ejecutivo IC Constructora

Bot de Microsoft Teams conectado al wiki de la empresa y al sistema EOS (Tracción).
Responde preguntas sobre proyectos, personas, rocas, scorecard, asuntos y reuniones.

## Arquitectura

```
Teams → Azure Bot Service → VIC (Express + Bot Framework) → Claude Sonnet
                                                           → Supabase (EOS data)
                                                           → Supabase (wiki index)
```

## Stack

| Componente | Tecnología |
|-----------|-----------|
| Bot server | Node.js + Express + botbuilder v4 |
| LLM | Claude claude-sonnet-4-6 (Anthropic) |
| EOS data | Supabase (rocks, metrics, issues, people, meetings, processes) |
| Wiki search | Supabase wiki_documents + PostgreSQL full-text (tsvector spanish) |
| Hosting | Azure App Service (recomendado) |

---

## Setup — Paso a paso (Luis Miguel)

### 1. Registrar el bot en Azure

1. Azure Portal → **Azure Bot** → Crear nuevo recurso.
2. Tipo de app: **Multi Tenant**.
3. Al crear, anotar:
   - **Microsoft App ID** → `BOT_APP_ID`
   - **Microsoft App Password** → `BOT_APP_PASSWORD` (crear en Certificates & secrets)
4. En el bot creado → **Channels** → habilitar **Microsoft Teams**.

### 2. Desplegar el servidor del bot

```bash
cd vic-bot
npm install

# Copiar y completar variables
cp .env.example .env
# Editar .env con los valores reales

npm start
```

El servidor queda escuchando en `http://localhost:3978/api/messages`.

Para producción, desplegar en **Azure App Service**:
- El endpoint público será: `https://tu-app.azurewebsites.net/api/messages`
- Configurar ese URL en Azure Bot → **Configuration → Messaging endpoint**.

### 3. Aplicar schema SQL en Supabase

Ejecutar el contenido de `indexer/wiki_schema.sql` en **Supabase Dashboard → SQL Editor**.

### 4. Indexar el wiki

Ejecutar localmente (con acceso al wiki en OneDrive):

```bash
npm run index-wiki
```

Esto lee todos los `.md` del wiki y los carga en Supabase.
Volver a ejecutar cada vez que se actualice el wiki (o programar tarea semanal).

### 5. Empaquetar e instalar la app en Teams

1. Editar `teams-manifest/manifest.json`:
   - Reemplazar `{{BOT_APP_ID}}` con el App ID real (dos veces).
2. Agregar dos íconos PNG:
   - `color.png` — 192×192 px (logo IC Constructora con fondo de color)
   - `outline.png` — 32×32 px (ícono en blanco sobre transparente)
3. Comprimir los tres archivos en un `.zip`.
4. Teams Admin Center → **Manage apps** → Upload the app → seleccionar el `.zip`.
5. Asignar la app al usuario Juan Paulo (o a todos).

---

## Variables de entorno (.env)

| Variable | Descripción |
|----------|------------|
| `BOT_APP_ID` | Microsoft App ID del bot en Azure |
| `BOT_APP_PASSWORD` | Password/secret del bot en Azure |
| `ANTHROPIC_API_KEY` | API key de Anthropic |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasa RLS) |
| `WIKI_PATH` | Ruta local al wiki Obsidian (solo para indexador) |
| `PORT` | Puerto del servidor (default: 3978) |

---

## Estructura del proyecto

```
vic-bot/
├── src/
│   ├── index.js          # Servidor Express + adaptador Bot Framework
│   ├── bot.js            # Manejo de mensajes y contexto de conversación
│   ├── claude.js         # Claude con agentic loop y definición de tools
│   └── tools/
│       ├── wiki.js       # Búsqueda full-text en wiki_documents
│       └── eos.js        # Queries a Supabase (rocks, metrics, issues, etc.)
├── indexer/
│   ├── indexWiki.js      # Script: indexa wiki .md → Supabase
│   └── wiki_schema.sql   # Schema SQL para tabla wiki_documents
├── teams-manifest/
│   ├── manifest.json     # App manifest para Teams
│   └── README.md         # Este archivo
├── .env.example
└── package.json
```

---

## Tools disponibles para Claude

| Tool | Qué consulta |
|------|-------------|
| `search_wiki` | Wiki Obsidian: personas, proyectos, procesos, estructura |
| `get_rocks` | Rocas trimestrales (EOS) |
| `get_metrics` | Scorecard semanal con últimos valores |
| `get_issues` | Lista IDS de asuntos |
| `get_people` | Directorio del equipo |
| `get_meetings` | Reuniones L10 y trimestrales |
| `get_processes` | Procesos medulares |

Claude puede encadenar múltiples tools en una sola respuesta (agentic loop).

---

## Ampliar acceso a más usuarios

Actualmente el historial de conversación vive en memoria del servidor.
Para escalar a múltiples usuarios, migrar la tabla de historial a Supabase:

```sql
CREATE TABLE vic_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text NOT NULL,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON vic_conversations(conversation_id, created_at);
```

Y actualizar `bot.js` para leer/escribir de ahí en vez del Map en memoria.
