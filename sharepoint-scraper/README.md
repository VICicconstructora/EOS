# SharePoint Scraper — IC Constructora

Indexa **todo SharePoint** para que VIC lo lea como una fuente más. Cada archivo
(`.pdf`, `.docx`, `.pptx`, `.xlsx`, `.txt`, `.html`, `.csv`, …) se convierte a
**Markdown con [MarkItDown](https://github.com/microsoft/markitdown)**, se trocea
en chunks, se le generan **embeddings** y se guarda en `wiki_documents` con el
prefijo de ruta `sharepoint/…`, separado de la wiki curada (`wiki/…`).

Así VIC busca en SharePoint con el mismo `search_wiki` híbrido (léxico + semántico)
que ya usa para el wiki de Obsidian.

## Las dos piezas

| Script | Dirección | Qué hace |
|--------|-----------|----------|
| `sharepoint_scraper.py` | SharePoint → Supabase | Recorre los drives vía Graph (delta), convierte cada archivo a Markdown con MarkItDown, chunkea (~500 tokens, solape 50), genera embeddings con **Azure OpenAI** (`text-embedding-3-small`, 512 dims) y hace upsert en `wiki_documents` (`file_path = 'sharepoint/<sitio>/<ruta>'`). |
| `export_mirror.py` | Supabase → disco | Reconstruye un `.md` por documento (junta chunks en orden) y los escribe en la bóveda Obsidian de OneDrive bajo `_sharepoint/`, para leer el volcado crudo en Obsidian. |
| `azure-mirror/function_app.py` | Supabase → SharePoint (Graph) | Igual que `export_mirror` pero 100% en la nube: sube los `.md` vía Graph PUT a la biblioteca *AA General Edicion* (`.AI/_sharepoint`), sin depender del PC. Azure Function con timer diario 06:00 UTC (01:00 Colombia). |

## Estado incremental

- **Scraper:** guarda el `deltaLink` de Graph por drive en `wiki.scraping_state`.
  La siguiente corrida solo trae lo nuevo/cambiado. Además, `already_up_to_date`
  compara `lastModifiedDateTime` contra `updated_at` y omite lo que no cambió.
- **Mirror (Function):** guarda `{file_path: updated_at}` en un blob
  (`mirror-state/uploaded.json`) y solo sube lo nuevo/cambiado.

## Control de ritmo (costo / rate limit)

Variables de entorno del scraper:

| Var | Default | Para qué |
|-----|---------|----------|
| `MAX_FILES_PER_RUN` | 50 | Tope de archivos por corrida (0 = sin tope). El delta reanuda en la siguiente. |
| `SLEEP_BETWEEN_FILES` | 1.5 | Pausa (s) entre archivos para espaciar llamadas a Azure OpenAI. |
| `SHAREPOINT_SITES` | *(vacío)* | Lista de sitios a procesar. Vacío = **todo el tenant** (getAllSites + subsitios). |
| `SHAREPOINT_LIBRARIES` | *(vacío)* | Filtra a bibliotecas/drives por nombre. Vacío = todas. |

## Cómo correr

### Local (Windows)
```bat
REM Scraper SharePoint -> Supabase (crea venv local en %LOCALAPPDATA% la 1ª vez)
run_scraper.cmd

REM Espejo Supabase -> OneDrive (.md en disco)
run_mirror.cmd
```
Requiere `.env` (ver `.env.example`). Ambos `.cmd` montan un venv **local a la
máquina**, fuera de OneDrive, así que funcionan en cualquier usuario.

### Contenedor / Azure (scraper)
```bash
docker build -t ic-sharepoint-scraper .
docker run --env-file .env ic-sharepoint-scraper
```
El `Dockerfile` corre el scraper una vez y termina; en Azure lo dispara un cron
(Container Job). `markitdown[all]` necesita `ffmpeg`/`libgl1` (ya en la imagen).

### Azure Function (mirror)
`azure-mirror/` es una Function con timer diario. Despliegue con Azure Functions
Core Tools (`func azure functionapp publish …`). Settings: `AZURE_*`, `SUPABASE_*`,
`TARGET_DRIVE_ID`, `TARGET_FOLDER`, `AzureWebJobsStorage`.

## Permisos Graph requeridos

App registration (Entra ID) con permisos de aplicación y consentimiento de admin:
`Sites.Read.All` + `Files.Read.All` (scraper) y `Sites.ReadWrite.All` + `Files.ReadWrite.All`
(mirror, porque sube `.md`).

## Variables de entorno

Ver `.env.example`. Resumen:

- `AZURE_CLIENT_ID` / `AZURE_TENANT_ID` / `AZURE_CLIENT_SECRET` — app de Graph.
- `SUPABASE_URL` / `SUPABASE_KEY` — service role (escribe `wiki_documents`).
- `AZURE_OPENAI_ENDPOINT` / `AZURE_OPENAI_API_KEY` / `AZURE_OPENAI_DEPLOYMENT` /
  `AZURE_OPENAI_API_VERSION` / `EMBEDDING_DIMENSIONS` — embeddings.
- (Mirror) `TARGET_DRIVE_ID` / `TARGET_FOLDER` / `DEST_ROOT`.
- (Aviso opcional al terminar) `VIC_PUSH_URL` / `VIC_PUSH_SECRET` / `NOTIFY_EMAIL`.

> **Embeddings:** este pipeline usa **Azure OpenAI** (512 dims), distinto del
> indexador del wiki de Obsidian (`vic-bot/indexer`), que usa **Voyage** (512 dims).
> Ambos escriben en `wiki_documents`; mantener la misma dimensión es lo que permite
> que `search_wiki_hybrid` los compare en el mismo espacio.
