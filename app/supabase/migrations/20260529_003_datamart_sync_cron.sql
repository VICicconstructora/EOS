-- ============================================================================
-- Migración: cron semanal para datamart-sync
-- Fecha: 2026-05-29
-- ============================================================================
--
-- PRERREQUISITO — Ejecutar UNA VEZ en el SQL Editor de Supabase Dashboard
-- (con los valores reales antes de aplicar esta migración):
--
--   SELECT vault.create_secret(
--     'https://TU_PROJECT_REF.supabase.co/functions/v1/datamart-sync',
--     'datamart_sync_url',
--     'URL de la Edge Function datamart-sync'
--   );
--
--   SELECT vault.create_secret(
--     'TU_ANON_KEY',
--     'datamart_sync_anon_key',
--     'Anon key del proyecto (Dashboard > Settings > API)'
--   );
--
-- SECRETOS DE LA EDGE FUNCTION — Configurar con el CLI de Supabase:
--   supabase secrets set AZURE_TENANT_ID=129cb8aa-2444-49b4-acc9-3f6a696f1ff0
--   supabase secrets set AZURE_CLIENT_ID=a3e3e09a-9bcc-4c58-b6d7-3aefd8bbd744
--   supabase secrets set AZURE_CLIENT_SECRET=<client-secret-de-Traccion-IC>
--   supabase secrets set ALERT_FROM_EMAIL=<buzon-remitente@icconstructora.com>
--   supabase secrets set ALERT_TO_EMAILS=<destinatario1@...,destinatario2@...>
--
-- PERMISOS del App Registration Traccion-IC (portal.azure.com):
--   Microsoft Graph → Application permissions → agregar:
--     Sites.Read.All   (descargar Datamart.xlsx de SharePoint)
--     Mail.Send        (enviar email de reporte)
--   → Grant admin consent for IC Constructora
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- Eliminar job anterior si existe (re-aplicar sin errores)
SELECT cron.unschedule('datamart-weekly-sync')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'datamart-weekly-sync'
);

-- Cron semanal: lunes 12:00 UTC = 07:00 Bogotá (UTC-5)
SELECT cron.schedule(
  'datamart-weekly-sync',
  '0 12 * * 1',
  $$
  SELECT net.http_post(
    url     := (
      SELECT decrypted_secret
      FROM   vault.decrypted_secrets
      WHERE  name = 'datamart_sync_url'
      LIMIT  1
    ),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM   vault.decrypted_secrets
        WHERE  name = 'datamart_sync_anon_key'
        LIMIT  1
      )
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT jobid, jobname, schedule
FROM   cron.job
WHERE  jobname = 'datamart-weekly-sync';
