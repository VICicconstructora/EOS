-- ============================================================================
-- Migración: cron mensual para historico-sync
-- Fecha: 2026-05-29
-- Función: Descarga Historico.xlsx de SharePoint GND/DataMart y hace upsert
--          en public.historico sin depender del PC del usuario.
-- ============================================================================
--
-- PRERREQUISITO — Ejecutar UNA VEZ en el SQL Editor si los secrets no existen:
--
--   SELECT vault.create_secret(
--     'https://TU_PROJECT_REF.supabase.co/functions/v1/historico-sync',
--     'historico_sync_url',
--     'URL de la Edge Function historico-sync'
--   );
--
--   SELECT vault.create_secret(
--     'TU_SERVICE_ROLE_KEY',
--     'historico_sync_service_key',
--     'Service role key — la función usa SUPABASE_SERVICE_ROLE_KEY internamente'
--   );
--
-- Las credenciales de Azure AD (AZURE_TENANT_ID, CLIENT_ID, CLIENT_SECRET)
-- ya están configuradas en sharepoint_get_creds() (compartidas con sharepoint-ingest).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- Limpiar job anterior si se re-aplica la migración
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'historico-monthly-sync') THEN
    PERFORM cron.unschedule('historico-monthly-sync');
  END IF;
END $$;

-- Cron mensual: día 25 de cada mes a las 13:00 UTC (= 08:00 Bogotá, UTC-5)
-- El 25 el archivo ya tiene el corte del mes en curso (fecha_datos = primer día del mes).
SELECT cron.schedule(
  'historico-monthly-sync',
  '0 13 25 * *',
  $$
  SELECT net.http_post(
    url     := (
      SELECT decrypted_secret
      FROM   vault.decrypted_secrets
      WHERE  name = 'historico_sync_url'
      LIMIT  1
    ),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM   vault.decrypted_secrets
        WHERE  name = 'historico_sync_service_key'
        LIMIT  1
      )
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Verificar
SELECT jobid, jobname, schedule, active
FROM   cron.job
WHERE  jobname = 'historico-monthly-sync';
