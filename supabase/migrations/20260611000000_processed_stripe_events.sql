-- Idempotência do webhook do Stripe: registra cada event.id já processado.
-- Evita reprocessamento (e e-mails duplicados) em reenvios do Stripe.
create table if not exists public.processed_stripe_events (
  event_id     text primary key,
  type         text,
  processed_at timestamptz not null default now()
);

-- Só o service_role (Edge Function) acessa. RLS ligado sem policies = nega o resto.
alter table public.processed_stripe_events enable row level security;
