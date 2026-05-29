require('dotenv').config()
const express = require('express')
const { CloudAdapter, ConfigurationBotFrameworkAuthentication } = require('botbuilder')
const VicBot = require('./bot')

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

// Health check para monitoreo
app.get('/health', (_, res) => {
  res.json({ status: 'ok', bot: 'VIC', ts: new Date().toISOString() })
})

const port = process.env.PORT || 3978
app.listen(port, () => {
  console.log(`VIC corriendo en http://localhost:${port}`)
  console.log(`Endpoint Teams: http://localhost:${port}/api/messages`)
})
