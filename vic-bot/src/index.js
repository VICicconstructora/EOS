require('dotenv').config()
const express = require('express')
const { CloudAdapter, ConfigurationBotFrameworkAuthentication } = require('botbuilder')
const VicBot = require('./bot')
const { sendProactive } = require('./lib/push')

const botAuth = new ConfigurationBotFrameworkAuthentication({
  MicrosoftAppId: process.env.BOT_APP_ID,
  MicrosoftAppPassword: process.env.BOT_APP_PASSWORD,
  MicrosoftAppTenantId: process.env.BOT_APP_TENANT_ID,
  MicrosoftAppType: 'SingleTenant'
})

const adapter = new CloudAdapter(botAuth)

adapter.onTurnError = async (context, error) => {
  console.error('[VIC] Error no manejado:', error)
  await context.sendActivity('Ocurrió un error interno. Intenta de nuevo.')
}

const bot = new VicBot()
const app = express()
app.use(express.json())

// Endpoint que Teams llama con cada mensaje
app.post('/api/messages', async (req, res) => {
  await adapter.process(req, res, async (context) => {
    await bot.run(context)
  })
})

// Push proactivo — lo llama la Edge Function alarmas-push (y futuros jobs).
// Autenticado con un secreto compartido (header x-vic-push-secret).
app.post('/api/push', async (req, res) => {
  const secret = req.header('x-vic-push-secret')
  if (!process.env.VIC_PUSH_SECRET || secret !== process.env.VIC_PUSH_SECRET) {
    return res.status(401).json({ error: 'no autorizado' })
  }
  const { to_email, text } = req.body || {}
  if (!to_email || !text) {
    return res.status(400).json({ error: 'faltan to_email o text' })
  }
  try {
    await sendProactive(adapter, to_email, text)
    res.json({ status: 'sent', to_email })
  } catch (err) {
    console.error('[VIC] Error en push proactivo:', err.message)
    res.status(502).json({ status: 'failed', error: err.message })
  }
})

// Health check para monitoreo
app.get('/health', (_, res) => {
  res.json({ status: 'ok', bot: 'VIC', ts: new Date().toISOString() })
})

const port = process.env.PORT || 3978
app.listen(port, () => {
  console.log(`VIC corriendo en http://localhost:${port}`)
  console.log(`Endpoint Teams: http://localhost:${port}/api/messages`)
})
