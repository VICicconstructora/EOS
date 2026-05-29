/**
 * Sincronización diaria del wiki → Supabase para el bot VIC.
 *
 * Corre las dos fases en orden y deja un log con fecha en indexer/logs/:
 *   1. indexWiki.js        — sube el TEXTO de los chunks (rápido).
 *   2. backfillEmbeddings  — genera embeddings de los chunks nuevos/cambiados.
 *
 * Lo invoca la Tarea Programada de Windows (ver instalar-tarea-wiki.ps1).
 * No requiere redeploy del bot: éste lee Supabase en vivo, así que ve los
 * datos nuevos apenas termina esta sincronización.
 */

require('dotenv').config()
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

const LOG_DIR = path.join(__dirname, 'logs')
fs.mkdirSync(LOG_DIR, { recursive: true })

const stamp = new Date().toISOString().slice(0, 10)  // YYYY-MM-DD
const logFile = path.join(LOG_DIR, `sync-${stamp}.log`)
const log = fs.createWriteStream(logFile, { flags: 'a' })

function write(line) {
  const ts = new Date().toISOString()
  const msg = `[${ts}] ${line}\n`
  process.stdout.write(msg)
  log.write(msg)
}

// Ejecuta un script de Node como subproceso, volcando su salida al log.
function runStep(label, scriptPath) {
  return new Promise((resolve, reject) => {
    write(`--- INICIO: ${label} ---`)
    const child = spawn(process.execPath, [scriptPath], {
      cwd: path.join(__dirname, '..'),
      env: process.env
    })
    child.stdout.on('data', d => log.write(d))
    child.stderr.on('data', d => log.write(d))
    child.on('close', code => {
      write(`--- FIN: ${label} (exit ${code}) ---`)
      code === 0 ? resolve() : reject(new Error(`${label} salió con código ${code}`))
    })
    child.on('error', reject)
  })
}

async function main() {
  write('===== Sincronización diaria VIC iniciada =====')
  try {
    await runStep('Indexar texto (indexWiki)', path.join(__dirname, 'indexWiki.js'))
    await runStep('Embeddings (backfillEmbeddings)', path.join(__dirname, 'backfillEmbeddings.js'))
    write('===== Sincronización completada OK =====')
  } catch (e) {
    write(`ERROR: ${e.message}`)
    write('===== Sincronización terminó con errores =====')
    process.exitCode = 1
  } finally {
    log.end()
  }
}

main()
