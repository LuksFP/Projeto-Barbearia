-- Endurecimento de segurança (auditoria 2026-07-08)
--   1. Remove vazamento da tabela de convites (policy USING(true) lia tudo)
--   2. Restringe a inserção pública de agendamentos (anon) e cria policy de
--      insert para donos/membros autenticados (que antes dependiam da mesma
--      policy aberta)
--   3. Endurece a consulta pública por contato (evita fishing com valores curtos)
--   4. Gate server-side para os endpoints de IA (plano Pro/Premium + rate limit)

-- ─── 1. Convites: remove leitura pública da tabela inteira ────────────────────
-- O app aceita convite via edge function accept-invite (valida token + email no
-- servidor); nenhuma tela lê barbershop_invites direto. A policy USING(true)
-- expunha email/nome/token/barbershop_id de TODOS os convites para qualquer anon.
DROP POLICY IF EXISTS "public read invite by token" ON public.barbershop_invites;

-- ─── 2. Agendamentos: separa insert autenticado do insert público ─────────────
-- Dono da conta SaaS ou membro ativo insere na própria barbearia (qualquer status).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'appointments' AND policyname = 'owner_insert_appointment'
  ) THEN
    CREATE POLICY owner_insert_appointment ON public.appointments
      FOR INSERT TO authenticated WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.saas_accounts sa
          JOIN public.barbershops b ON b.saas_account_id = sa.id
          WHERE b.id = appointments.barbershop_id
            AND sa.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.barbershop_members m
          WHERE m.barbershop_id = appointments.barbershop_id
            AND m.user_id = auth.uid()
            AND m.active = true
        )
      );
  END IF;
END $$;

-- Insert público (anon, booking no site): só reserva PENDENTE, barbearia real,
-- e sem forjar campos de pagamento nem preço negativo.
DROP POLICY IF EXISTS public_insert_appointments ON public.appointments;
CREATE POLICY public_insert_appointments ON public.appointments
  FOR INSERT TO anon WITH CHECK (
    status = 'pending'
    AND payment_status IS NULL
    AND paid_at IS NULL
    AND stripe_checkout_session_id IS NULL
    AND stripe_payment_intent_id IS NULL
    AND COALESCE(price, 0) >= 0
    AND EXISTS (SELECT 1 FROM public.barbershops b WHERE b.id = appointments.barbershop_id)
  );

-- ─── 3. Consulta pública por contato: exige identificador "completo" ──────────
-- Mantém a busca por email OU telefone (email é opcional no agendamento), mas
-- ignora valores curtos/parciais para dificultar enumeração.
CREATE OR REPLACE FUNCTION public.search_appointments_by_contact(
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  service_name text,
  appointment_date date,
  appointment_time text,
  status text,
  barber_name text,
  rating integer,
  review text,
  payment_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '');
BEGIN
  -- email precisa parecer email; telefone precisa de pelo menos 10 dígitos (BR)
  IF v_email IS NOT NULL AND (position('@' in v_email) = 0 OR length(v_email) < 6) THEN
    v_email := NULL;
  END IF;
  IF v_phone IS NOT NULL AND length(v_phone) < 10 THEN
    v_phone := NULL;
  END IF;

  IF v_email IS NULL AND v_phone IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.service_name,
    a.date AS appointment_date,
    a.time AS appointment_time,
    a.status,
    a.barber_name,
    a.rating,
    a.review,
    a.payment_status
  FROM public.appointments a
  WHERE
    (v_email IS NOT NULL AND lower(coalesce(a.client_email, '')) = v_email)
    OR (
      v_phone IS NOT NULL
      AND regexp_replace(a.client_phone, '\D', '', 'g') = v_phone
    )
  ORDER BY a.date DESC, a.time DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_appointments_by_contact(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.search_appointments_by_contact(text, text) TO authenticated;

-- ─── 4. Gate dos endpoints de IA (plano + rate limit) ─────────────────────────
-- Antes: financeiro-insights/cliente-resumo só checavam role='authenticated'.
-- Qualquer usuário logado (inclusive basic/trial) podia consumir tokens da Groq,
-- sem limite. Agora exige plano Pro/Premium e aplica janela de 1h por função.
CREATE TABLE IF NOT EXISTS public.ai_rate_limit (
  user_id      uuid NOT NULL,
  fn           text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT date_trunc('hour', now()),
  count        int NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, fn)
);
ALTER TABLE public.ai_rate_limit ENABLE ROW LEVEL SECURITY;
-- Sem policies: tabela só é tocada via ai_gate (SECURITY DEFINER) / service_role.

CREATE OR REPLACE FUNCTION public.ai_gate(p_fn text, p_limit int)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_plan   text;
  v_count  int;
  v_window timestamptz := date_trunc('hour', now());
BEGIN
  IF v_uid IS NULL THEN
    RETURN 'unauthorized';
  END IF;

  SELECT plan INTO v_plan
  FROM public.saas_accounts
  WHERE user_id = v_uid
  LIMIT 1;

  IF v_plan IS NULL OR v_plan NOT IN ('pro', 'premium') THEN
    RETURN 'plan';
  END IF;

  INSERT INTO public.ai_rate_limit (user_id, fn, window_start, count)
    VALUES (v_uid, p_fn, v_window, 1)
  ON CONFLICT (user_id, fn) DO UPDATE SET
    count = CASE WHEN public.ai_rate_limit.window_start = v_window
                 THEN public.ai_rate_limit.count + 1 ELSE 1 END,
    window_start = v_window
  RETURNING count INTO v_count;

  IF v_count > p_limit THEN
    RETURN 'rate';
  END IF;

  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.ai_gate(text, int) FROM public;
GRANT EXECUTE ON FUNCTION public.ai_gate(text, int) TO authenticated;
