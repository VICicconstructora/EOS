import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Sparkles, BarChart2, Table2, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const MODEL = 'claude-haiku-4-5-20251001';

const GREETING =
  'Hola. Soy tu analista de KPIs de IC Constructora. Puedo responder preguntas sobre los indicadores, generar gráficos y tablas. ¿En qué te ayudo?';

const SYSTEM_PROMPT = `Eres el analista de datos de IC Constructora, empresa inmobiliaria de Bogotá, Colombia.
Apoyas al equipo directivo con análisis de KPIs, tendencias y métricas comerciales.

EMPRESA:
IC Constructora desarrolla proyectos residenciales propios y en sociedad.
Portafolio activo: Bosque Central CBR, Gaia CBR, Praia Natura CBR, Primera Este CBR,
Castilla Imperial CBR, Castilla Living CBR, La Hacienda Jamundí CBR, Reserva de Oporto CBR,
Mitika Apartamentos, Azul Celeste (E1/E2/E3), Azul Turquesa (E1/E2), Well, Verde Vivo.

KPIs PRINCIPALES (actualizados en tiempo real al final de este prompt):
- Ventas YTD: ventas acumuladas en el año vs presupuesto anual
- Escrituración YTD: escrituras acumuladas en el año vs presupuesto
- Trámites Cumplidos/Programados: % de avance de trámites (permisos, licencias)
- Cartera Pre-escritura: recaudo de cuotas iniciales de compradores
- Cartera Post-escritura: recaudo de crédito hipotecario + subsidios

BASE DE DATOS (PostgreSQL / Supabase IC):
Schema principal: sinco_ic_raw
Tabla central: sinco_ic_raw.adi_dtm_venta (2,682 ventas activas)
  Columnas clave: idventa (PK), idproyecto (FK), vtanombreproyecto, valorneto (valor P&G),
  fechaventa (fecha oficial de cierre), nombrevendedor, nombrecomprador, estadoventa
Tabla proyectos: sinco_ic_raw.adi_dtm_proyectos
  Columnas: prycodigoproyecto (PK), prynombreproyecto, pryvis (VIS = S/N)
Reglas: usar siempre valorneto (no subtotal), filtrar proyectos por igualdad exacta (no ILIKE),
usar fechaventa para medir rendimiento comercial.

FORMATO DE RESPUESTA:
- Responde SIEMPRE en español. Sé directo y conciso.
- Para GRÁFICOS incluye un bloque con este formato exacto (JSON válido):
\`\`\`chart
{"chartType":"bar","title":"Título","xKey":"nombre","yKeys":["valor"],"data":[{"nombre":"Proyecto A","valor":1200}]}
\`\`\`
- Para TABLAS incluye un bloque con este formato exacto:
\`\`\`table
{"title":"Título","columns":["Col1","Col2"],"rows":[["val1","val2"]]}
\`\`\`
- chartType puede ser: "bar", "line" o "area"
- Para multi-series usa varios yKeys: "yKeys":["real","ppto"]
- Puedes mezclar texto, gráficos y tablas en una misma respuesta
- Cuando los datos sean estimados (no verificados en BD), indícalo explícitamente`;

const QUICK_ACTIONS = [
  {
    label: 'Resumen ejecutivo',
    prompt: '¿Cómo van los KPIs principales hoy? Dame un resumen ejecutivo con el estado de cada indicador.',
  },
  {
    label: 'Gráfico de ventas',
    icon: BarChart2,
    prompt: 'Genera un gráfico de barras con ventas YTD estimadas por proyecto, ordenado de mayor a menor.',
  },
  {
    label: 'Tabla de trámites',
    icon: Table2,
    prompt: 'Crea una tabla con el estado de trámites cumplidos vs programados por proyecto activo.',
  },
  {
    label: 'Proyectos en riesgo',
    prompt: '¿Qué proyectos están por debajo de su meta? ¿Qué acciones recomendarías?',
  },
];

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316'];

function parseBlocks(raw) {
  const blocks = [];
  const regex = /```(chart|table)\n([\s\S]*?)```/g;
  let last = 0;
  let m;

  while ((m = regex.exec(raw)) !== null) {
    const before = raw.slice(last, m.index).trim();
    if (before) blocks.push({ type: 'text', content: before });
    try {
      blocks.push({ type: m[1], ...JSON.parse(m[2]) });
    } catch {
      blocks.push({ type: 'text', content: m[0] });
    }
    last = m.index + m[0].length;
  }

  const tail = raw.slice(last).trim();
  if (tail) blocks.push({ type: 'text', content: tail });
  return blocks.length > 0 ? blocks : [{ type: 'text', content: raw }];
}

function ChartBlock({ block }) {
  const { chartType = 'bar', title, data = [], xKey = 'name', yKeys = ['value'] } = block;
  const Wrapper = chartType === 'line' ? LineChart : chartType === 'area' ? AreaChart : BarChart;

  return (
    <div className="mt-2 mb-1 bg-white border border-slate-200 rounded-xl p-4 w-full">
      {title && <p className="text-xs font-semibold text-slate-600 mb-3">{title}</p>}
      <ResponsiveContainer width="100%" height={210}>
        <Wrapper data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          {yKeys.length > 1 && <Legend iconSize={10} />}
          {yKeys.map((key, i) => {
            const color = CHART_COLORS[i % CHART_COLORS.length];
            if (chartType === 'bar')
              return <Bar key={key} dataKey={key} fill={color} radius={[3, 3, 0, 0]} />;
            if (chartType === 'area')
              return (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  fill={color}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              );
            return (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={color}
                strokeWidth={2}
                dot={false}
              />
            );
          })}
        </Wrapper>
      </ResponsiveContainer>
    </div>
  );
}

function TableBlock({ block }) {
  const { title, columns = [], rows = [] } = block;
  return (
    <div className="mt-2 mb-1 w-full overflow-x-auto">
      {title && <p className="text-xs font-semibold text-slate-600 mb-2">{title}</p>}
      <table className="w-full text-xs border-collapse min-w-[360px]">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left font-medium text-slate-600 bg-slate-100 border border-slate-200 whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-slate-700 border border-slate-200">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const blocks = isUser
    ? [{ type: 'text', content: message.content }]
    : parseBlocks(message.content);

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} mb-5`}>
      <div
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${
          isUser ? 'bg-indigo-100' : 'bg-slate-100'
        }`}
      >
        {isUser ? (
          <User size={14} className="text-indigo-600" />
        ) : (
          <Bot size={14} className="text-slate-500" />
        )}
      </div>
      <div
        className={`flex flex-col gap-1 ${
          isUser ? 'items-end max-w-[80%]' : 'items-start w-full max-w-[90%]'
        }`}
      >
        {blocks.map((block, i) => {
          if (block.type === 'chart') return <ChartBlock key={i} block={block} />;
          if (block.type === 'table') return <TableBlock key={i} block={block} />;
          return (
            <div
              key={i}
              className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                isUser
                  ? 'bg-indigo-600 text-white rounded-tr-sm'
                  : 'bg-slate-100 text-slate-800 rounded-tl-sm'
              }`}
            >
              {block.content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 mb-5">
      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bot size={14} className="text-slate-500" />
      </div>
      <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export function KpiAiChat({ isOpen, onClose, kpiData }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (messages.length === 0) {
        setMessages([{ role: 'assistant', content: GREETING }]);
      }
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const buildSystem = () => {
    let sys = SYSTEM_PROMPT;
    if (kpiData && kpiData.length > 0) {
      const summary = kpiData
        .map(
          (n) =>
            `  • ${n.title} — actual: ${n.currentValue}, meta: ${n.targetValue}, estado: ${n.status}`
        )
        .join('\n');
      sys += `\n\nKPIs EN TIEMPO REAL:\n${summary}`;
    }
    return sys;
  };

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg = { role: 'user', content: trimmed };
    const snapshot = messages; // captura antes del setState

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setLoading(true);

    if (!ANTHROPIC_API_KEY) {
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'La API key de Anthropic no está configurada.\nAgrega `VITE_ANTHROPIC_API_KEY=sk-ant-...` en `app/.env` y reinicia el servidor de desarrollo.',
        },
      ]);
      return;
    }

    // El saludo inicial es solo UI — no se envía a la API
    const history = [...snapshot.slice(1), userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 2048,
          system: buildSystem(),
          messages: history,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }

      const payload = await res.json();
      const reply = payload.content?.[0]?.text || '(Sin respuesta)';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error al conectar con la IA: ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[88vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-indigo-50/60 to-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 leading-tight">
                Analista IA de Indicadores
              </p>
              <p className="text-xs text-slate-400 leading-tight">IC Constructora · Claude</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 1 && (
              <button
                onClick={() => setMessages([{ role: 'assistant', content: GREETING }])}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Nueva conversación"
              >
                <RefreshCw size={15} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2 min-h-0">
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Quick actions — solo cuando la conversación está vacía */}
        {messages.length <= 1 && (
          <div className="px-5 pb-3 flex flex-wrap gap-2 flex-shrink-0">
            {QUICK_ACTIONS.map((qa, i) => (
              <button
                key={i}
                onClick={() => sendMessage(qa.prompt)}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200 hover:bg-indigo-100 transition-colors disabled:opacity-50"
              >
                {qa.icon && <qa.icon size={11} />}
                {qa.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex-shrink-0">
          <div className="flex items-end gap-2 bg-slate-50 rounded-xl border border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all px-4 py-2.5">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              placeholder="Pregunta sobre los indicadores… (Enter para enviar, Shift+Enter para salto de línea)"
              rows={1}
              disabled={loading}
              className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 resize-none outline-none leading-5"
              style={{ maxHeight: '120px' }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-8 h-8 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg flex items-center justify-center transition-colors"
            >
              <Send size={14} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
