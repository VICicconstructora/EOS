import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, CheckCircle, Loader2, FileText } from 'lucide-react'
import { CBR_CONTEXT, INTERVIEW_SECTIONS } from '../../data/cbrContext'
import { useDocuments } from '../../lib/useDocuments'

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY
const MODEL             = 'claude-sonnet-4-6'

// Señal que el AI incluye en su respuesta cuando termina las 6 secciones
const DONE_MARKER    = '[ENTREVISTA_COMPLETA]'
// Delimitadores del documento de perfil generado
const PROFILE_START  = '[PERFIL_INICIO]'
const PROFILE_END    = '[PERFIL_FIN]'

function buildSystemPrompt(displayName, jobTitle, area, contextDocs) {
  const docsContext = contextDocs.length > 0
    ? '\n\nDOCUMENTOS DE CONTEXTO ADICIONALES (cargados de Supabase):\n' +
      contextDocs.map(d => `### ${d.title}\n${d.content}`).join('\n\n')
    : ''

  return `Eres el asistente de configuración inicial del sistema EOS de IC Constructora.
Vas a entrevistar a ${displayName}${jobTitle ? `, ${jobTitle}` : ''}${area ? ` del área de ${area}` : ''}.

Tu objetivo es conocer su contexto de trabajo para personalizar el sistema EOS y la IA de soporte.

${CBR_CONTEXT}${docsContext}

## INSTRUCCIONES DE LA ENTREVISTA

Cubre estas 6 secciones en orden, una a la vez. Espera la respuesta antes de pasar a la siguiente:

**Sección 1 — Contexto personal**
Pregunta: ¿Cuánto tiempo llevas en IC Constructora? ¿Cuál es tu mayor responsabilidad este trimestre?

**Sección 2 — Tu trabajo y proyectos**
Pregunta: ¿Con qué proyectos del portafolio trabajas más directamente? ¿Cuál es el mayor cuello de botella en tus procesos actuales?

**Sección 3 — Tu equipo**
Pregunta (solo si aplica al rol): ¿A quién lideras directamente? ¿Con qué áreas coordinas más y dónde están los mayores roces?

**Sección 4 — Prioridades y ROCAS Q2 2026**
Pregunta: ¿Cuál es tu ROCA principal este trimestre? ¿Qué podría hacerte fallar en esa ROCA? ¿Qué necesitas de otras áreas?

**Sección 5 — Datos y comunicación**
Pregunta: ¿Qué dato o indicador revisas primero cada mañana? ¿Cómo prefieres recibir información (resúmenes, números, gráficos)? ¿Hay algún análisis que haces manualmente y que te gustaría automatizar?

**Sección 6 — Cómo puede ayudarte la IA**
Pregunta: ¿Qué tipo de preguntas te gustaría poder hacerle a la IA sobre los datos de IC? ¿Qué tarea repetitiva tomaría más de 20 minutos y podrías delegarle?

## REGLAS
- Haz preguntas específicas y contextualizadas a IC Constructora. No hagas preguntas genéricas.
- Máximo 3-4 preguntas por sección.
- Cuando hayas cubierto las 6 secciones, escribe literalmente: ${DONE_MARKER}
- Cuando el usuario confirme que está listo para guardar, genera el perfil con este formato exacto:

${PROFILE_START}
# Perfil: [Nombre] — [Área]
*Configurado: [fecha]*

## Contexto Personal
[resumen sección 1]

## Proyectos y Foco
[resumen sección 2]

## Equipo y Coordinación
[resumen sección 3]

## Prioridades Q2 2026
[resumen sección 4 — incluir ROCA principal y obstáculos]

## Preferencias de Datos y Comunicación
[resumen sección 5]

## Cómo Usar la IA
[resumen sección 6 — tareas específicas que quiere delegar]
${PROFILE_END}

Responde SIEMPRE en español. Tono directo y profesional. Sin relleno.`
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  const content = message.content
    .replace(DONE_MARKER, '')
    .replace(PROFILE_START, '')
    .replace(PROFILE_END, '')
    .trim()

  return (
    <div className={`flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${
        isUser ? 'bg-indigo-100' : 'bg-slate-100'
      }`}>
        {isUser
          ? <User size={14} className="text-indigo-600" />
          : <Bot size={14} className="text-slate-500" />}
      </div>
      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap max-w-[82%] ${
        isUser
          ? 'bg-indigo-600 text-white rounded-tr-sm'
          : 'bg-slate-100 text-slate-800 rounded-tl-sm'
      }`}>
        {content}
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex gap-3 mb-4">
      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot size={14} className="text-slate-500" />
      </div>
      <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1">
        {[0, 150, 300].map(d => (
          <span key={d} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  )
}

export default function OnboardingInterview({ displayName, jobTitle, area, userId, onComplete }) {
  const [messages, setMessages]           = useState([])
  const [input, setInput]                 = useState('')
  const [loading, setLoading]             = useState(false)
  const [saving, setSaving]               = useState(false)
  const [interviewDone, setInterviewDone] = useState(false)
  const [generatingProfile, setGeneratingProfile] = useState(false)
  const [contextDocs, setContextDocs]     = useState([])
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const { loadIndexedContext, completeOnboardingRPC } = useDocuments()

  // Cargar documentos de contexto de Supabase al iniciar
  useEffect(() => {
    loadIndexedContext().then(docs => setContextDocs(docs || []))
  }, [loadIndexedContext])

  // Iniciar entrevista con el primer mensaje del AI
  useEffect(() => {
    if (messages.length === 0) {
      setLoading(true)
      callClaude([], buildSystemPrompt(displayName, jobTitle, area, []))
    }
  }, []) // solo al montar

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const callClaude = useCallback(async (history, systemPrompt) => {
    if (!ANTHROPIC_API_KEY) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'La API key de Anthropic no está configurada.\nAgrega `VITE_ANTHROPIC_API_KEY=sk-ant-...` en `app/.env`.',
      }])
      setLoading(false)
      return null
    }

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key':                           ANTHROPIC_API_KEY,
          'anthropic-version':                   '2023-06-01',
          'content-type':                        'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model:      MODEL,
          max_tokens: 1024,
          system:     systemPrompt,
          messages:   history.length > 0 ? history : [{ role: 'user', content: 'Comienza la entrevista.' }],
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `HTTP ${res.status}`)
      }

      const payload = await res.json()
      const reply   = payload.content?.[0]?.text || '(Sin respuesta)'

      setMessages(prev => [...prev, { role: 'assistant', content: reply }])

      if (reply.includes(DONE_MARKER)) {
        setInterviewDone(true)
      }

      return reply
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error al conectar con la IA: ${e.message}`,
      }])
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg  = { role: 'user', content: trimmed }
    const newMsgs  = [...messages, userMsg]

    setMessages(newMsgs)
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setLoading(true)

    const sysPrompt = buildSystemPrompt(displayName, jobTitle, area, contextDocs)
    const history   = newMsgs.map(m => ({ role: m.role, content: m.content }))
    await callClaude(history, sysPrompt)
  }, [messages, loading, displayName, jobTitle, area, contextDocs, callClaude])

  const handleGenerateAndSave = useCallback(async () => {
    setGeneratingProfile(true)
    setLoading(true)

    const generateMsg = { role: 'user', content: 'Perfecto. Genera ahora el documento de perfil completo.' }
    const allMsgs     = [...messages, generateMsg]
    setMessages(allMsgs)

    const sysPrompt = buildSystemPrompt(displayName, jobTitle, area, contextDocs)
    const history   = allMsgs.map(m => ({ role: m.role, content: m.content }))

    const reply = await callClaude(history, sysPrompt)

    if (!reply) {
      setGeneratingProfile(false)
      return
    }

    // Extraer contenido entre los marcadores
    const startIdx = reply.indexOf(PROFILE_START)
    const endIdx   = reply.indexOf(PROFILE_END)
    const profileContent = startIdx !== -1 && endIdx !== -1
      ? reply.slice(startIdx + PROFILE_START.length, endIdx).trim()
      : reply

    setSaving(true)
    const slug  = `user_profile/${userId}`
    const title = `Perfil: ${displayName}`

    const result = await completeOnboardingRPC({
      slug,
      title,
      content: profileContent,
    })

    setSaving(false)
    setGeneratingProfile(false)

    if (result.success) {
      onComplete()
    } else {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `No se pudo guardar el perfil: ${result.error}. Puedes intentarlo de nuevo.`,
      }])
    }
  }, [messages, displayName, jobTitle, area, userId, contextDocs, callClaude, completeOnboardingRPC, onComplete])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const userExchanges = messages.filter(m => m.role === 'user').length
  const canSkip       = userExchanges >= 2

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-4)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 680,
        height: '90vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: 'var(--space-5) var(--space-6)',
          borderBottom: '1px solid var(--border-light)',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, transparent 100%)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
            <div style={{
              width: 36, height: 36,
              background: 'var(--brand-primary)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FileText size={18} color="white" />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                Configuración inicial
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                IC Constructora · Sistema EOS
              </p>
            </div>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Antes de entrar al sistema, quiero conocer tu contexto de trabajo.
            La conversación se guardará como tu perfil de usuario y mejorará las respuestas de la IA.
          </p>
        </div>

        {/* Secciones progress */}
        <div style={{
          padding: 'var(--space-3) var(--space-6)',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          gap: 'var(--space-2)',
          flexWrap: 'wrap',
          flexShrink: 0,
        }}>
          {INTERVIEW_SECTIONS.map((s, i) => {
            const aiMsgs = messages.filter(m => m.role === 'assistant').length
            const done = aiMsgs > i + 1 || interviewDone
            const active = aiMsgs === i + 1
            return (
              <div key={s.id} title={s.description} style={{
                fontSize: '0.7rem',
                padding: '2px 8px',
                borderRadius: 999,
                background: done
                  ? 'rgba(34,197,94,0.12)'
                  : active
                    ? 'rgba(99,102,241,0.12)'
                    : 'var(--bg-subtle)',
                color: done
                  ? 'var(--status-success)'
                  : active
                    ? 'var(--brand-primary)'
                    : 'var(--text-muted)',
                fontWeight: done || active ? 600 : 400,
                border: `1px solid ${done ? 'rgba(34,197,94,0.3)' : active ? 'rgba(99,102,241,0.3)' : 'transparent'}`,
                whiteSpace: 'nowrap',
              }}>
                {s.id}. {s.title}
              </div>
            )
          })}
        </div>

        {/* Mensajes */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-5) var(--space-6) var(--space-3)' }}>
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          {loading && <TypingDots />}
          <div ref={bottomRef} />
        </div>

        {/* Botón de completar — aparece cuando el AI termina las 6 secciones */}
        {interviewDone && !generatingProfile && (
          <div style={{
            padding: 'var(--space-3) var(--space-6)',
            borderTop: '1px solid var(--border-light)',
            background: 'rgba(34,197,94,0.05)',
            flexShrink: 0,
          }}>
            <button
              onClick={handleGenerateAndSave}
              disabled={saving || loading}
              className="btn btn-primary"
              style={{ width: '100%', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {saving
                ? <><Loader2 size={16} className="animate-spin" /> Guardando perfil...</>
                : <><CheckCircle size={16} /> Guardar perfil y entrar al sistema</>}
            </button>
          </div>
        )}

        {generatingProfile && (
          <div style={{
            padding: 'var(--space-3) var(--space-6)',
            borderTop: '1px solid var(--border-light)',
            flexShrink: 0,
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}>
            <Loader2 size={14} className="animate-spin" />
            Generando y guardando tu perfil...
          </div>
        )}

        {/* Input de chat */}
        {!interviewDone && (
          <div style={{ padding: 'var(--space-3) var(--space-4) var(--space-4)', borderTop: '1px solid var(--border-light)', flexShrink: 0 }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 'var(--space-2)',
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-medium)',
              padding: '10px 14px',
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={e => {
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                }}
                placeholder="Escribe tu respuesta… (Enter para enviar)"
                rows={1}
                disabled={loading}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontSize: '0.875rem', color: 'var(--text-primary)', resize: 'none',
                  lineHeight: 1.5, maxHeight: 120,
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                style={{
                  flexShrink: 0, width: 32, height: 32,
                  background: input.trim() && !loading ? 'var(--brand-primary)' : 'var(--border-medium)',
                  border: 'none', borderRadius: 'var(--radius-md)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: input.trim() && !loading ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                }}
              >
                <Send size={14} color="white" />
              </button>
            </div>

            {canSkip && (
              <div style={{ textAlign: 'center', marginTop: 'var(--space-2)' }}>
                <button
                  onClick={handleGenerateAndSave}
                  disabled={loading || saving}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '0.75rem', color: 'var(--text-muted)',
                    textDecoration: 'underline',
                  }}
                >
                  Ya respondí suficiente — guardar y entrar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
