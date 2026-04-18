-- Adiciona 'pending' ao check constraint de plan_status.
-- O valor 'pending' foi introduzido em 20260416191000 mas o constraint
-- não foi atualizado naquele momento.

ALTER TABLE public.saas_accounts
  DROP CONSTRAINT IF EXISTS saas_accounts_plan_status_check;

ALTER TABLE public.saas_accounts
  ADD CONSTRAINT saas_accounts_plan_status_check
  CHECK (plan_status = ANY (ARRAY[
    'active'::text,
    'pending'::text,
    'trial'::text,
    'past_due'::text,
    'cancelled'::text
  ]));
