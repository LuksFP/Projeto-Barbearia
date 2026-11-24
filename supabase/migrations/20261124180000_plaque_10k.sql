-- Placa BarberPro dos R$10 mil: barbearia que fatura R$10 mil num mês ganha uma
-- placa física, enviada pela equipe BarberPro. Uma placa por barbearia.
--   - faturamento do mês = o mesmo do Financeiro: serviços concluídos (e falta
--     com sinal pago online) + loja (pedidos não cancelados);
--   - o pedido só entra pela RPC claim_plaque, que recalcula o mês no banco
--     (o painel não consegue pedir placa de mês que não bateu a meta);
--   - a equipe BarberPro acompanha em public.plaque_claims e muda o status
--     pra 'enviada' / 'entregue' pelo painel do Supabase.

CREATE TABLE IF NOT EXISTS public.plaque_claims (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id  uuid NOT NULL UNIQUE REFERENCES public.barbershops(id) ON DELETE CASCADE,
  month          text NOT NULL CHECK (month ~ '^\d{4}-\d{2}$'),
  revenue        numeric(12, 2) NOT NULL,
  name_on_plaque text NOT NULL CHECK (char_length(name_on_plaque) BETWEEN 2 AND 60),
  recipient      text NOT NULL CHECK (char_length(recipient) BETWEEN 2 AND 120),
  phone          text NOT NULL CHECK (char_length(phone) BETWEEN 10 AND 20),
  cep            text NOT NULL CHECK (cep ~ '^\d{5}-?\d{3}$'),
  address        text NOT NULL CHECK (char_length(address) BETWEEN 5 AND 200),
  city           text NOT NULL CHECK (char_length(city) BETWEEN 2 AND 80),
  state          text NOT NULL CHECK (state ~ '^[A-Z]{2}$'),
  status         text NOT NULL DEFAULT 'pedida' CHECK (status IN ('pedida', 'enviada', 'entregue')),
  requested_by   uuid DEFAULT auth.uid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  shipped_at     timestamptz
);

ALTER TABLE public.plaque_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.plaque_claims FROM anon, authenticated;
GRANT SELECT ON public.plaque_claims TO authenticated;

DROP POLICY IF EXISTS "team reads plaque_claims" ON public.plaque_claims;
CREATE POLICY "team reads plaque_claims" ON public.plaque_claims
  FOR SELECT TO authenticated USING (barbershop_id IN (SELECT public.my_barbershop_ids()));

-- Faturamento de um mês ('YYYY-MM'), igual ao Financeiro. Interna.
CREATE OR REPLACE FUNCTION public.plaque_month_revenue(p_barbershop_id uuid, p_month text)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT to_date(p_month || '-01', 'YYYY-MM-DD') AS d0,
           (to_date(p_month || '-01', 'YYYY-MM-DD') + interval '1 month')::date AS d1
  )
  SELECT coalesce((
           SELECT sum(a.price) FROM public.appointments a, bounds b
            WHERE a.barbershop_id = p_barbershop_id
              AND a.date >= b.d0 AND a.date < b.d1
              AND a.price IS NOT NULL
              AND (a.status = 'done'
                   OR (a.status = 'no_show' AND EXISTS (
                         SELECT 1 FROM public.online_payments op
                          WHERE op.appointment_id = a.id AND op.status = 'pago')))
         ), 0)
       + coalesce((
           SELECT sum(s.total) FROM public.product_sales s, bounds b
            WHERE s.barbershop_id = p_barbershop_id
              AND s.status <> 'cancelado'
              AND s.created_at >= (b.d0::timestamp AT TIME ZONE 'America/Sao_Paulo')
              AND s.created_at <  (b.d1::timestamp AT TIME ZONE 'America/Sao_Paulo')
         ), 0);
$$;
REVOKE ALL ON FUNCTION public.plaque_month_revenue(uuid, text) FROM PUBLIC, anon, authenticated;

-- Dono/admin pede a placa: o mês precisa ser o atual ou um dos 3 anteriores e
-- ter batido R$10 mil. Devolve o pedido (o já existente, se pedir de novo).
CREATE OR REPLACE FUNCTION public.claim_plaque(
  p_barbershop_id uuid,
  p_month text,
  p_name_on_plaque text,
  p_recipient text,
  p_phone text,
  p_cep text,
  p_address text,
  p_city text,
  p_state text
)
RETURNS public.plaque_claims
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_this  text := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM');
  v_first text := to_char((now() AT TIME ZONE 'America/Sao_Paulo') - interval '3 months', 'YYYY-MM');
  v_rev   numeric;
  v_row   public.plaque_claims;
BEGIN
  IF p_barbershop_id IS NULL OR p_barbershop_id NOT IN (SELECT public.my_admin_barbershop_ids()) THEN
    RAISE EXCEPTION 'Só o dono ou um admin pode pedir a placa' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_row FROM public.plaque_claims WHERE barbershop_id = p_barbershop_id;
  IF FOUND THEN RETURN v_row; END IF;

  IF p_month IS NULL OR p_month !~ '^\d{4}-\d{2}$' OR p_month < v_first OR p_month > v_this THEN
    RAISE EXCEPTION 'Mês fora do prazo pra pedir a placa' USING ERRCODE = 'check_violation';
  END IF;

  v_rev := public.plaque_month_revenue(p_barbershop_id, p_month);
  IF v_rev < 10000 THEN
    RAISE EXCEPTION 'Esse mês ainda não bateu R$ 10 mil' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.plaque_claims (barbershop_id, month, revenue, name_on_plaque, recipient, phone, cep, address, city, state)
  VALUES (p_barbershop_id, p_month, v_rev, btrim(p_name_on_plaque), btrim(p_recipient),
          regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), btrim(p_cep), btrim(p_address), btrim(p_city), upper(btrim(p_state)))
  ON CONFLICT (barbershop_id) DO NOTHING
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    SELECT * INTO v_row FROM public.plaque_claims WHERE barbershop_id = p_barbershop_id;
  END IF;
  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_plaque(uuid, text, text, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_plaque(uuid, text, text, text, text, text, text, text, text) TO authenticated;
