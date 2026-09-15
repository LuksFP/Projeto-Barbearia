-- Painel em vários celulares:
-- 1) agendamentos entram no Realtime, pra agenda do barbeiro atualizar sozinha
--    quando o cliente marca pelo site (RLS continua valendo: cada membro só
--    recebe eventos da própria barbearia).
-- 2) "já lembrei" (Lembretes) e "já contatei" (Reativação) saem do localStorage
--    e vão pro banco, pra equipe inteira ver a mesma marcação.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reminded_at timestamptz;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS reactivation_contacted_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'appointments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
  END IF;
END $$;
