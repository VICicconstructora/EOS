// Edge Function: historico-sync
// Descarga Historico.xlsx de SharePoint (GND/DataMart) via Microsoft Graph,
// parsea todas las hojas con SheetJS y hace upsert en public.historico.
// Corre mensualmente via pg_cron. No depende del PC del usuario.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const SITE_HOSTNAME = "icconstructora.sharepoint.com";
const SITE_PATH     = "/sites/GND";
const FILE_PATH     = "/DataMart/Historico.xlsx";
const BATCH_SIZE    = 1000;

interface Creds {
  tenant_id: string;
  client_id: string;
  client_secret: string;
}

interface HistoricoRow {
  proyecto:    string;
  fecha_datos: string;
  fuente:      string | null;
  pg:          string;
  fecha:       string;
  valor:       number | null;
  tipo_dato:   "HISTORICO" | "PROYECCION";
}

async function getGraphToken(c: Creds): Promise<string> {
  const resp = await fetch(
    `https://login.microsoftonline.com/${c.tenant_id}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type:    "client_credentials",
        client_id:     c.client_id,
        client_secret: c.client_secret,
        scope:         "https://graph.microsoft.com/.default",
      }).toString(),
    },
  );
  if (!resp.ok) throw new Error(`Token error (${resp.status}): ${await resp.text()}`);
  return (await resp.json()).access_token as string;
}

async function resolveSiteId(token: string): Promise<string> {
  const path = SITE_PATH.startsWith("/") ? SITE_PATH : `/${SITE_PATH}`;
  const resp = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_HOSTNAME}:${path}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!resp.ok) throw new Error(`Site resolve error (${resp.status}): ${await resp.text()}`);
  return (await resp.json()).id as string;
}

async function downloadFile(token: string, siteId: string): Promise<ArrayBuffer> {
  const encoded = FILE_PATH.split("/").map(encodeURIComponent).join("/");
  const resp = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root:${encoded}:/content`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!resp.ok) throw new Error(`Download error (${resp.status}): ${(await resp.text()).slice(0, 500)}`);
  return resp.arrayBuffer();
}

// Convierte string de fecha de SheetJS (raw:false) a ISO YYYY-MM-DD.
// SheetJS con raw:false puede devolver "1/9/2025", "2025-09-01", etc.
function toISODate(val: unknown): string | null {
  if (!val) return null;
  const s = String(val).trim();
  if (!s) return null;
  // Ya es ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // M/D/YYYY o D/M/YYYY — asumir M/D/YYYY (formato SheetJS en-US)
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

// Calcula el primer día del mes actual como corte (YYYY-MM-01).
// Acepta override via body: { corte: "2026-04-01" } para recargas manuales.
function corteDelMes(override?: string): string {
  if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) return override;
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function parseRows(
  wb: XLSX.WorkBook,
  sheetName: string,
  soloCorte: string,
): HistoricoRow[] {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];

  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: false,
  });

  const result: HistoricoRow[] = [];

  for (const r of raw) {
    const proyecto   = r["Proyecto"]    as string | null;
    const fechaDatos = toISODate(r["Fecha Datos"]);
    const pg         = r["P&G"]         as string | null;
    const fecha      = toISODate(r["Fecha"]);

    if (!proyecto || !fechaDatos || !pg || !fecha) continue;

    // Solo procesar el corte del mes actual (o el override manual)
    if (fechaDatos !== soloCorte) continue;

    const valorRaw = r["Valor"];
    const valor = valorRaw !== null && valorRaw !== "" && valorRaw !== undefined
      ? parseFloat(String(valorRaw).replace(/,/g, ""))
      : null;

    result.push({
      proyecto:    proyecto.trim(),
      fecha_datos: fechaDatos,
      fuente:      r["Fuente"] ? String(r["Fuente"]).trim() : null,
      pg:          pg.trim(),
      fecha,
      valor:       isNaN(valor as number) ? null : valor,
      tipo_dato:   fecha > fechaDatos ? "PROYECCION" : "HISTORICO",
    });
  }

  return result;
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const started = Date.now();
  const log: Record<string, unknown>[] = [];

  // Soporte para override manual: POST { "corte": "2026-04-01" }
  let corteOverride: string | undefined;
  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (typeof body?.corte === "string") corteOverride = body.corte;
    } catch { /* sin body, OK */ }
  }
  const corte = corteDelMes(corteOverride);
  log.push({ step: "corte", corte });

  try {
    // 1. Credenciales desde vault (misma función que sharepoint-ingest)
    const { data: credsRows, error: credErr } = await supabase.rpc("sharepoint_get_creds");
    if (credErr || !credsRows?.length) {
      throw new Error(`Creds error: ${credErr?.message ?? "no rows"}`);
    }
    const creds = credsRows[0] as Creds;

    // 2. Token Graph
    const token = await getGraphToken(creds);

    // 3. Site ID
    const siteId = await resolveSiteId(token);

    // 4. Descargar Historico.xlsx
    const buf = await downloadFile(token, siteId);
    log.push({ step: "download", bytes: buf.byteLength });

    // 5. Parsear todas las hojas
    const wb = XLSX.read(new Uint8Array(buf), { type: "array", cellDates: false });
    log.push({ step: "parse", sheets: wb.SheetNames });

    let totalUpserted = 0;

    for (const sheetName of wb.SheetNames) {
      const rows = parseRows(wb, sheetName, corte);

      if (rows.length === 0) {
        log.push({ sheet: sheetName, rows: 0, status: "skip" });
        continue;
      }

      let sheetUpserted = 0;

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const chunk = rows.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
          .from("historico")
          .upsert(chunk, {
            onConflict: "fecha_datos,fecha,pg,proyecto",
            ignoreDuplicates: false,
          });
        if (error) throw new Error(`Upsert error (sheet=${sheetName}, batch=${i}): ${error.message}`);
        sheetUpserted += chunk.length;
      }

      totalUpserted += sheetUpserted;
      log.push({ sheet: sheetName, rows: rows.length, upserted: sheetUpserted, status: "ok" });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        duration_ms: Date.now() - started,
        total_upserted: totalUpserted,
        log,
      }, null, 2),
      { headers: { "Content-Type": "application/json" } },
    );

  } catch (e) {
    const msg = (e as Error).message;
    log.push({ error: msg });
    return new Response(
      JSON.stringify({ ok: false, duration_ms: Date.now() - started, error: msg, log }, null, 2),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
