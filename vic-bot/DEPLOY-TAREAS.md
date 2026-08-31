# Deploy — Módulo de Tareas (VIC)

Pasos para activar el módulo de Tareas. La fase 1 (base de datos) ya está aplicada
en producción. Faltan los 4 pasos de abajo. Ejecútalos en orden.

Proyecto Supabase: `zbjwasufengayvmutypr`.
App Service del bot: `vic-ic-constructora` / RG `rg-vic-bot` (NO confundir con
`vic-ic-constructora-api`).

---

## Paso 1 — Redeploy del bot a Azure (activa fases 2 y 3)

Empaqueta `vic-bot/` SIN `node_modules`, `.env`, `indexer/logs`, ni `*.zip`.

CRÍTICO: no uses `Compress-Archive` (genera rutas con `\` que rompen el deploy
en el Linux de Azure). Usa este script, que reemplaza `\`→`/` con códigos de
carácter (evita además el filtro del harness):

```powershell
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$root = "C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\vic-bot"
$zip  = "$env:TEMP\vic-bot-tareas.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }

$bs = [char]92; $fs = [char]47
$exclude = '\\node_modules\\|\\indexer\\logs\\|\\\.env|\.zip$|\\\.git\\'
$files = Get-ChildItem $root -Recurse -File | Where-Object {
  $_.FullName -notmatch $exclude
}

$z = [System.IO.Compression.ZipFile]::Open($zip, 'Create')
foreach ($f in $files) {
  $entry = $f.FullName.Substring($root.Length + 1).Replace($bs, $fs)
  [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($z, $f.FullName, $entry)
}
$z.Dispose()
Write-Host "Zip listo: $zip  ($($files.Count) archivos)"
```

Despliega y verifica:

```powershell
az webapp deploy --name vic-ic-constructora --resource-group rg-vic-bot `
  --src-path "$env:TEMP\vic-bot-tareas.zip" --type zip

# Azure corre npm install solo. Espera ~60-90s y verifica:
Invoke-WebRequest -UseBasicParsing https://vic-ic-constructora.azurewebsites.net/health
```

Tras esto, en Teams ya funciona: asignar tareas, comprometer fecha, "¿qué tengo
pendiente?", verificar. La FOTO aún no, hasta el paso 2.

---

## Paso 2 — Permiso Graph para subir la foto a SharePoint (activa el cierre con prueba)

El destino ya está fijado en el código: sitio **GeneralIC**, carpeta
**Documents/Tareas/<persona>/**. No requiere variable de site id.

Solo hay que dar el permiso al app registration del bot (el del `BOT_APP_ID`):

1. Azure Portal → **App registrations** → abre la app del bot (su Application ID
   = `BOT_APP_ID`).
2. **API permissions** → **Add a permission** → **Microsoft Graph** →
   **Application permissions** → busca y marca **`Sites.ReadWrite.All`** → **Add**.
3. Clic en **Grant admin consent for IC Constructora**. Debe quedar en verde.

(Opcional: si algún día cambia el sitio, define el App Setting
`TASK_PROOFS_SITE_PATH = icconstructora.sharepoint.com:/sites/OtroSitio`. Por
defecto apunta a GeneralIC.)

No requiere redeploy: el bot pedirá el token con el nuevo permiso en la próxima
subida.

---

## Paso 3 — Deploy de la Edge Function de recordatorios

```powershell
cd "C:\Users\jmacallister\OneDrive\Documentos\Documentos\Traccion\app"
supabase functions deploy tasks-push --project-ref zbjwasufengayvmutypr
```

Reusa los secretos de `alarmas-push` (`VIC_PUSH_URL`, `VIC_PUSH_SECRET`). Confirma
que existen:

```powershell
supabase secrets list --project-ref zbjwasufengayvmutypr
```

Si falta alguno, créalo igual que para alarmas-push (URL = el `/api/push` del bot;
SECRET = el mismo `VIC_PUSH_SECRET` del App Service del bot).

Prueba manual (no enviará nada hasta que existan tareas con fecha):

```powershell
Invoke-WebRequest -UseBasicParsing -Method POST `
  https://zbjwasufengayvmutypr.supabase.co/functions/v1/tasks-push `
  -Headers @{ Authorization = "Bearer <ANON_KEY>" } -ContentType 'application/json' -Body '{}'
```

---

## Paso 4 — Activar el cron de recordatorios

Aplica la migración `app/supabase/migrations/20260612_003_tasks_push_cron.sql`
(SQL Editor del Dashboard, o `supabase db push`). Programa `tasks-push` cada 2 h
en horario laboral (12:00–23:00 UTC = 7am–6pm COT).

Verifica:

```sql
select jobname, schedule from cron.job where jobname = 'tasks-push';
```

---

## Requisito de los destinatarios

VIC solo puede iniciar un DM a alguien que **ya le escribió al menos una vez**
(así Bot Framework tiene su `conversation_reference`). Pídele a cada gerente que
le mande cualquier mensaje a VIC en Teams una vez; desde ahí recibe asignaciones
y recordatorios. Hasta entonces, la tarea existe pero el aviso a esa persona
quedará como `failed` en `vic_push_log` y se reintenta en la siguiente corrida.

## Validar tras el deploy

1. Asígnate una tarea a ti mismo con vencimiento cercano y confirma que llega el DM.
2. Responde con una fecha de compromiso → debe pasar a `accepted`.
3. Adjunta una **foto como archivo** (caso robusto) y confirma que sube a
   GeneralIC/Tareas y la tarea pasa a `submitted`. Prueba también **pegar la
   imagen inline** (caso no probado en vivo: el principal riesgo).
4. Verifícala (como quien la asignó) → `done`.
