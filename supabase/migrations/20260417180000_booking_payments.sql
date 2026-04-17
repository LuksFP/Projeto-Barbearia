-- Pagamento online para agendamentos públicos.
-- Adiciona rastreamento de checkout/ pagamento por Stripe na tabela appointments.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS payment_status text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_appointments_stripe_checkout_session_id
  ON public.appointments (stripe_checkout_session_id);

COMMENT ON COLUMN public.appointments.payment_status IS
  'Status do pagamento do agendamento: pending, paid, failed, cancelled.';
COMMENT ON COLUMN public.appointments.payment_method IS
  'Forma de pagamento usada no agendamento público.';
COMMENT ON COLUMN public.appointments.stripe_checkout_session_id IS
  'ID da sessão de checkout do Stripe usada para pagar o agendamento.';
COMMENT ON COLUMN public.appointments.stripe_payment_intent_id IS
  'ID do PaymentIntent do Stripe associado ao agendamento.';
COMMENT ON COLUMN public.appointments.paid_at IS
  'Data/hora em que o pagamento do agendamento foi confirmado.';
