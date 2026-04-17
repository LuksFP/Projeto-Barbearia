-- Adiciona coluna cancellation_policy à tabela barbershops.
-- Armazena a política de cancelamento configurada pelo dono da barbearia.

ALTER TABLE public.barbershops
  ADD COLUMN IF NOT EXISTS cancellation_policy JSONB DEFAULT NULL;
