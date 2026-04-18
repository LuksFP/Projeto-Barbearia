-- Trial expiration automática + política de cancelamento de plano

-- 1. Coluna para armazenar data de fim de acesso após cancelamento
ALTER TABLE public.saas_accounts
  ADD COLUMN IF NOT EXISTS cancel_at timestamptz;

-- 2. Expande check constraint para incluir 'cancelling' (cancelado mas ainda com acesso)
ALTER TABLE public.saas_accounts
  DROP CONSTRAINT IF EXISTS saas_accounts_plan_status_check;

ALTER TABLE public.saas_accounts
  ADD CONSTRAINT saas_accounts_plan_status_check
  CHECK (plan_status = ANY (ARRAY[
    'active'::text,
    'pending'::text,
    'trial'::text,
    'past_due'::text,
    'cancelling'::text,
    'cancelled'::text
  ]));

-- 3. pg_cron: expira trials automaticamente às 3h UTC
SELECT cron.schedule(
  'expire-trials',
  '0 3 * * *',
  $$
    UPDATE public.saas_accounts
    SET plan_status = 'cancelled'
    WHERE plan_status = 'trial'
      AND trial_ends_at IS NOT NULL
      AND trial_ends_at < now();
  $$
);

-- 4. pg_cron: revoga acesso de contas em 'cancelling' após cancel_at
SELECT cron.schedule(
  'revoke-cancelled-plans',
  '5 3 * * *',
  $$
    UPDATE public.saas_accounts
    SET plan_status = 'cancelled',
        stripe_subscription_id = NULL
    WHERE plan_status = 'cancelling'
      AND cancel_at IS NOT NULL
      AND cancel_at < now();
  $$
);
