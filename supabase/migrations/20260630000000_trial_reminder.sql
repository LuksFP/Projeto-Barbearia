-- Lembrete automático de fim de trial
-- Coluna de idempotência + cron horário que chama a EF trial-reminders.

-- 1. Marca quando o email de lembrete já foi enviado (evita reenvio)
ALTER TABLE public.saas_accounts
  ADD COLUMN IF NOT EXISTS trial_reminder_sent_at timestamptz;

-- 2. Extensões necessárias para o cron chamar a Edge Function via HTTP
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3. Remove job anterior se existir (idempotente)
SELECT cron.unschedule('trial-reminders') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'trial-reminders'
);

-- 4. Roda de hora em hora: chama a EF que envia lembretes para trials
--    que vencem em <= 24h. URL e secret vêm do Vault (nenhum segredo no git).
SELECT cron.schedule(
  'trial-reminders',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/trial-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'trial_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
