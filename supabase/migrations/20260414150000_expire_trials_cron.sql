-- Habilita pg_cron (extensão nativa do Supabase)
create extension if not exists pg_cron;

-- Remove job anterior se existir (idempotente)
select cron.unschedule('expire-trials') where exists (
  select 1 from cron.job where jobname = 'expire-trials'
);

-- Roda todo dia às 3h UTC: marca como cancelled todo trial vencido
select cron.schedule(
  'expire-trials',
  '0 3 * * *',
  $$
    update public.saas_accounts
    set
      plan_status = 'cancelled',
      plan        = null
    where
      plan_status = 'trial'
      and trial_ends_at is not null
      and trial_ends_at < now();
  $$
);
