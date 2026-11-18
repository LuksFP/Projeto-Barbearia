-- Ferramentas de retenção e gestão (pedido de 2026-11-18):
--   1. Avaliação no Google — link da barbearia + "avaliação pedida" no horário
--   2. Lista de espera     — cliente entra pelo site; equipe avisa quando abre vaga
--   3. Cliente fixo        — horários que se repetem a cada N dias
--   4. Fechamento semanal  — comissão da semana marcada como paga
--   5. Meta do mês         — faturamento alvo no Financeiro

-- ═══ 1 e 5: configurações da barbearia (dono/admin edita pela policy existente)
ALTER TABLE public.barbershops
  ADD COLUMN IF NOT EXISTS google_review_url text
    CHECK (google_review_url IS NULL OR (google_review_url ~ '^https://' AND char_length(google_review_url) <= 500)),
  ADD COLUMN IF NOT EXISTS monthly_goal numeric(10,2)
    CHECK (monthly_goal IS NULL OR (monthly_goal > 0 AND monthly_goal < 10000000));

-- ═══ 1 e 3: no horário (equipe atualiza pela policy existente)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS review_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS recurrence_id uuid,
  ADD COLUMN IF NOT EXISTS recurrence_every_days smallint
    CHECK (recurrence_every_days IS NULL OR recurrence_every_days IN (7, 14, 15, 21, 28, 30));

CREATE INDEX IF NOT EXISTS appointments_recurrence_idx ON public.appointments (recurrence_id) WHERE recurrence_id IS NOT NULL;

-- ═══ 2: lista de espera ══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.waitlist (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  barber_id     uuid REFERENCES public.barbershop_members(id) ON DELETE SET NULL,
  date          date NOT NULL,
  period        text NOT NULL DEFAULT 'qualquer' CHECK (period IN ('manha', 'tarde', 'noite', 'qualquer')),
  client_name   text NOT NULL CHECK (char_length(client_name) BETWEEN 1 AND 80),
  client_phone  text NOT NULL CHECK (client_phone ~ '^[0-9]{10,13}$'),
  status        text NOT NULL DEFAULT 'esperando' CHECK (status IN ('esperando', 'avisado', 'agendou', 'removido')),
  notified_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (barbershop_id, date, client_phone)
);

CREATE INDEX IF NOT EXISTS waitlist_shop_date_idx ON public.waitlist (barbershop_id, date) WHERE status IN ('esperando', 'avisado');

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.waitlist FROM anon, authenticated;
GRANT SELECT, DELETE ON public.waitlist TO authenticated;
GRANT UPDATE (status, notified_at) ON public.waitlist TO authenticated;

DROP POLICY IF EXISTS "team reads waitlist" ON public.waitlist;
CREATE POLICY "team reads waitlist" ON public.waitlist
  FOR SELECT TO authenticated USING (barbershop_id IN (SELECT public.my_barbershop_ids()));
DROP POLICY IF EXISTS "team updates waitlist" ON public.waitlist;
CREATE POLICY "team updates waitlist" ON public.waitlist
  FOR UPDATE TO authenticated
  USING (barbershop_id IN (SELECT public.my_barbershop_ids()))
  WITH CHECK (barbershop_id IN (SELECT public.my_barbershop_ids()));
DROP POLICY IF EXISTS "admin deletes waitlist" ON public.waitlist;
CREATE POLICY "admin deletes waitlist" ON public.waitlist
  FOR DELETE TO authenticated USING (barbershop_id IN (SELECT public.my_admin_barbershop_ids()));

-- Cliente entra na lista pelo site (anon). Mesmo telefone no mesmo dia só
-- atualiza o período; no máximo 3 dias em aberto por telefone na barbearia.
CREATE OR REPLACE FUNCTION public.public_join_waitlist(
  p_barbershop_id uuid,
  p_date          date,
  p_client_name   text,
  p_client_phone  text,
  p_period        text DEFAULT 'qualquer',
  p_barber_id     uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text := regexp_replace(coalesce(p_client_phone, ''), '\D', '', 'g');
  v_name  text := btrim(coalesce(p_client_name, ''));
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_open  int;
  v_id    uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.barbershops WHERE id = p_barbershop_id AND active) THEN
    RAISE EXCEPTION 'Barbearia indisponível' USING ERRCODE = 'check_violation';
  END IF;
  IF p_date IS NULL OR p_date < v_today OR p_date > v_today + 60 THEN
    RAISE EXCEPTION 'Escolha um dia entre hoje e os próximos 60 dias' USING ERRCODE = 'check_violation';
  END IF;
  IF char_length(v_name) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'Informe seu nome' USING ERRCODE = 'check_violation';
  END IF;
  IF v_phone !~ '^[0-9]{10,13}$' THEN
    RAISE EXCEPTION 'Telefone inválido' USING ERRCODE = 'check_violation';
  END IF;
  IF coalesce(p_period, '') NOT IN ('manha', 'tarde', 'noite', 'qualquer') THEN
    RAISE EXCEPTION 'Período inválido' USING ERRCODE = 'check_violation';
  END IF;
  IF p_barber_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.barbershop_members WHERE id = p_barber_id AND barbershop_id = p_barbershop_id
  ) THEN
    RAISE EXCEPTION 'Barbeiro inválido' USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*) INTO v_open FROM public.waitlist
   WHERE barbershop_id = p_barbershop_id AND client_phone = v_phone
     AND status IN ('esperando', 'avisado') AND date >= v_today AND date <> p_date;
  IF v_open >= 3 THEN
    RAISE EXCEPTION 'Você já está na lista de espera de 3 dias. Aguarde o aviso.' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.waitlist (barbershop_id, barber_id, date, period, client_name, client_phone)
  VALUES (p_barbershop_id, p_barber_id, p_date, p_period, v_name, v_phone)
  ON CONFLICT (barbershop_id, date, client_phone) DO UPDATE
    SET period = EXCLUDED.period, barber_id = EXCLUDED.barber_id, client_name = EXCLUDED.client_name,
        status = 'esperando', notified_at = NULL, updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.public_join_waitlist(uuid, date, text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_join_waitlist(uuid, date, text, text, text, uuid) TO anon, authenticated;

-- ═══ 4: fechamento semanal da comissão (só dono/admin) ═══════════════════════
CREATE TABLE IF NOT EXISTS public.commission_payouts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  barber_id     uuid NOT NULL REFERENCES public.barbershop_members(id) ON DELETE CASCADE,
  week_start    date NOT NULL CHECK (extract(isodow FROM week_start) = 1),   -- segunda-feira
  revenue       numeric(10,2) NOT NULL CHECK (revenue >= 0),
  amount        numeric(10,2) NOT NULL CHECK (amount >= 0),
  paid_at       timestamptz NOT NULL DEFAULT now(),
  paid_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  UNIQUE (barbershop_id, barber_id, week_start)
);

ALTER TABLE public.commission_payouts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.commission_payouts FROM anon;
GRANT SELECT, INSERT, DELETE ON public.commission_payouts TO authenticated;

DROP POLICY IF EXISTS "admin reads payouts" ON public.commission_payouts;
CREATE POLICY "admin reads payouts" ON public.commission_payouts
  FOR SELECT TO authenticated USING (barbershop_id IN (SELECT public.my_admin_barbershop_ids()));
DROP POLICY IF EXISTS "admin inserts payouts" ON public.commission_payouts;
CREATE POLICY "admin inserts payouts" ON public.commission_payouts
  FOR INSERT TO authenticated
  WITH CHECK (
    barbershop_id IN (SELECT public.my_admin_barbershop_ids())
    AND barber_id IN (SELECT id FROM public.barbershop_members WHERE barbershop_id = commission_payouts.barbershop_id)
    AND (paid_by IS NULL OR paid_by = auth.uid())
  );
DROP POLICY IF EXISTS "admin deletes payouts" ON public.commission_payouts;
CREATE POLICY "admin deletes payouts" ON public.commission_payouts
  FOR DELETE TO authenticated USING (barbershop_id IN (SELECT public.my_admin_barbershop_ids()));
