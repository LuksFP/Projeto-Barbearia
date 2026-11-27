-- Pra o cliente voltar: cartão fidelidade, pacotes pré-pagos e aniversariantes.
-- Tudo OPCIONAL: começa desligado e o dono/admin liga em Configurações.

ALTER TABLE public.barbershops
  ADD COLUMN IF NOT EXISTS loyalty_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_goal int NOT NULL DEFAULT 10 CHECK (loyalty_goal BETWEEN 2 AND 50),
  ADD COLUMN IF NOT EXISTS loyalty_reward text NOT NULL DEFAULT '1 corte grátis' CHECK (char_length(loyalty_reward) BETWEEN 1 AND 80),
  ADD COLUMN IF NOT EXISTS loyalty_since date,
  ADD COLUMN IF NOT EXISTS packages_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS birthdays_enabled boolean NOT NULL DEFAULT false;

-- Aniversário: só dia e mês (o ano não é preciso).
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS birth_day smallint,
  ADD COLUMN IF NOT EXISTS birth_month smallint;
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_birthday_check;
ALTER TABLE public.clients ADD CONSTRAINT clients_birthday_check CHECK (
  (birth_day IS NULL AND birth_month IS NULL)
  OR coalesce(birth_month BETWEEN 1 AND 12 AND birth_day BETWEEN 1 AND
     (ARRAY[31,29,31,30,31,30,31,31,30,31,30,31])[birth_month], false));

-- Pacote vendido a um cliente (ex.: 4 cortes por R$ 150).
CREATE TABLE IF NOT EXISTS public.client_packages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  client_id     uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name          text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  total_uses    int NOT NULL CHECK (total_uses BETWEEN 2 AND 50),
  price         numeric(10,2) NOT NULL CHECK (price > 0),
  sold_on       date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  sold_by       uuid DEFAULT auth.uid(),
  cancelled_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS client_packages_shop_idx ON public.client_packages (barbershop_id, client_id);
ALTER TABLE public.client_packages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.client_packages FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE (cancelled_at) ON public.client_packages TO authenticated;
DROP POLICY IF EXISTS "team reads client_packages" ON public.client_packages;
CREATE POLICY "team reads client_packages" ON public.client_packages
  FOR SELECT TO authenticated USING (barbershop_id IN (SELECT public.my_barbershop_ids()));
DROP POLICY IF EXISTS "team sells client_packages" ON public.client_packages;
CREATE POLICY "team sells client_packages" ON public.client_packages
  FOR INSERT TO authenticated WITH CHECK (
    barbershop_id IN (SELECT public.my_barbershop_ids()) AND sold_by = auth.uid() AND cancelled_at IS NULL
    AND EXISTS (SELECT 1 FROM public.barbershops b WHERE b.id = barbershop_id AND b.packages_enabled)
    AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.barbershop_id = client_packages.barbershop_id));
DROP POLICY IF EXISTS "admin cancels client_packages" ON public.client_packages;
CREATE POLICY "admin cancels client_packages" ON public.client_packages
  FOR UPDATE TO authenticated
  USING (barbershop_id IN (SELECT public.my_admin_barbershop_ids()))
  WITH CHECK (barbershop_id IN (SELECT public.my_admin_barbershop_ids()));

-- Cada uso desconta 1 corte. O horário concluído passa a valer preço ÷ usos,
-- então Financeiro e comissão reconhecem o pacote conforme é usado.
CREATE TABLE IF NOT EXISTS public.package_uses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id  uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  package_id     uuid NOT NULL REFERENCES public.client_packages(id) ON DELETE CASCADE,
  appointment_id uuid UNIQUE REFERENCES public.appointments(id) ON DELETE SET NULL,
  original_price numeric(10,2),
  used_by        uuid DEFAULT auth.uid(),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS package_uses_package_idx ON public.package_uses (package_id);

-- Prêmio do cartão entregue. Se foi num atendimento do dia, ele não conta pro cartão.
CREATE TABLE IF NOT EXISTS public.loyalty_redemptions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id  uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  phone          text NOT NULL CHECK (phone ~ '^[0-9]{10,13}$'),
  appointment_id uuid UNIQUE REFERENCES public.appointments(id) ON DELETE SET NULL,
  redeemed_by    uuid DEFAULT auth.uid(),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS loyalty_redemptions_phone_idx ON public.loyalty_redemptions (barbershop_id, phone);

ALTER TABLE public.package_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.package_uses, public.loyalty_redemptions FROM anon, authenticated;
GRANT SELECT ON public.package_uses, public.loyalty_redemptions TO authenticated;
DROP POLICY IF EXISTS "team reads package_uses" ON public.package_uses;
CREATE POLICY "team reads package_uses" ON public.package_uses
  FOR SELECT TO authenticated USING (barbershop_id IN (SELECT public.my_barbershop_ids()));
DROP POLICY IF EXISTS "team reads loyalty_redemptions" ON public.loyalty_redemptions;
CREATE POLICY "team reads loyalty_redemptions" ON public.loyalty_redemptions
  FOR SELECT TO authenticated USING (barbershop_id IN (SELECT public.my_barbershop_ids()));

-- Desconta 1 uso no atendimento concluído mais recente do cliente (últimos 7 dias)
-- que ainda não usou pacote nem foi pago pelo site.
CREATE OR REPLACE FUNCTION public.use_package(p_package_id uuid)
RETURNS date
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE k public.client_packages; a public.appointments;
BEGIN
  SELECT * INTO k FROM public.client_packages WHERE id = p_package_id FOR UPDATE;
  IF NOT FOUND OR k.barbershop_id NOT IN (SELECT public.my_barbershop_ids()) THEN
    RAISE EXCEPTION 'Sem acesso a esse pacote' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF k.cancelled_at IS NOT NULL OR (SELECT count(*) FROM public.package_uses u WHERE u.package_id = k.id) >= k.total_uses THEN
    RAISE EXCEPTION 'Esse pacote já foi todo usado' USING ERRCODE = 'check_violation';
  END IF;
  SELECT x.* INTO a FROM public.appointments x
    JOIN public.clients c ON c.id = k.client_id
   WHERE x.barbershop_id = k.barbershop_id AND x.status = 'done'
     AND regexp_replace(x.client_phone, '\D', '', 'g') = regexp_replace(c.phone, '\D', '', 'g')
     AND x.date BETWEEN (now() AT TIME ZONE 'America/Sao_Paulo')::date - 7 AND (now() AT TIME ZONE 'America/Sao_Paulo')::date
     AND NOT EXISTS (SELECT 1 FROM public.package_uses u WHERE u.appointment_id = x.id)
     AND NOT EXISTS (SELECT 1 FROM public.online_payments op WHERE op.appointment_id = x.id AND op.status = 'pago')
   ORDER BY x.date DESC, x.time DESC LIMIT 1 FOR UPDATE OF x;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conclua o horário do cliente na Agenda antes de descontar' USING ERRCODE = 'check_violation';
  END IF;
  INSERT INTO public.package_uses (barbershop_id, package_id, appointment_id, original_price)
  VALUES (k.barbershop_id, k.id, a.id, a.price);
  UPDATE public.appointments SET price = round(k.price / k.total_uses, 2) WHERE id = a.id;
  RETURN a.date;
END;
$$;

CREATE OR REPLACE FUNCTION public.undo_package_use(p_package_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE u public.package_uses;
BEGIN
  SELECT * INTO u FROM public.package_uses WHERE package_id = p_package_id
     AND barbershop_id IN (SELECT public.my_barbershop_ids())
   ORDER BY created_at DESC, id LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nada pra desfazer' USING ERRCODE = 'no_data_found';
  END IF;
  UPDATE public.appointments SET price = u.original_price WHERE id = u.appointment_id;
  DELETE FROM public.package_uses WHERE id = u.id;
END;
$$;

-- Cartão fidelidade: visitas concluídas desde que ligou, menos as de prêmio.
CREATE OR REPLACE FUNCTION public.loyalty_status(p_barbershop_id uuid, p_phone text, p_exclude uuid DEFAULT NULL)
RETURNS TABLE (visits int, goal int, reward text, rewards_available int, progress int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH shop AS (
    SELECT loyalty_goal AS goal, loyalty_reward AS reward, loyalty_since FROM public.barbershops
     WHERE id = p_barbershop_id AND loyalty_enabled AND id IN (SELECT public.my_barbershop_ids())
  ), n AS (
    SELECT count(a.id)::int AS visits,
           (SELECT count(*)::int FROM public.loyalty_redemptions r
             WHERE r.barbershop_id = p_barbershop_id AND r.phone = regexp_replace(p_phone, '\D', '', 'g')) AS used
      FROM shop
      LEFT JOIN public.appointments a ON a.barbershop_id = p_barbershop_id AND a.status = 'done'
       AND a.id IS DISTINCT FROM p_exclude
       AND a.date >= coalesce(shop.loyalty_since, a.date)
       AND length(regexp_replace(p_phone, '\D', '', 'g')) >= 10
       AND regexp_replace(a.client_phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g')
       AND NOT EXISTS (SELECT 1 FROM public.loyalty_redemptions r WHERE r.appointment_id = a.id)
  )
  SELECT n.visits, shop.goal, shop.reward,
         greatest(0, n.visits / shop.goal - n.used),
         greatest(0, n.visits - n.used * shop.goal)
    FROM n, shop;
$$;

-- Entrega o prêmio. Se há atendimento de hoje que não é necessário pra fechar o
-- cartão, ele é o do prêmio e não conta pro próximo.
CREATE OR REPLACE FUNCTION public.redeem_loyalty(p_barbershop_id uuid, p_phone text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'); v_apt uuid;
BEGIN
  IF p_barbershop_id IS NULL OR p_barbershop_id NOT IN (SELECT public.my_barbershop_ids()) THEN
    RAISE EXCEPTION 'Sem acesso a essa barbearia' USING ERRCODE = 'insufficient_privilege';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('loyalty:' || p_barbershop_id::text || ':' || v_phone));
  IF NOT EXISTS (SELECT 1 FROM public.loyalty_status(p_barbershop_id, v_phone) s WHERE s.rewards_available > 0) THEN
    RAISE EXCEPTION 'Esse cliente ainda não completou o cartão' USING ERRCODE = 'check_violation';
  END IF;
  SELECT a.id INTO v_apt FROM public.appointments a
   WHERE a.barbershop_id = p_barbershop_id AND a.status = 'done'
     AND a.date = (now() AT TIME ZONE 'America/Sao_Paulo')::date
     AND regexp_replace(a.client_phone, '\D', '', 'g') = v_phone
     AND NOT EXISTS (SELECT 1 FROM public.loyalty_redemptions r WHERE r.appointment_id = a.id)
   ORDER BY a.time DESC LIMIT 1;
  IF v_apt IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.loyalty_status(p_barbershop_id, v_phone, v_apt) s WHERE s.rewards_available > 0) THEN
    v_apt := NULL;  -- o de hoje foi o que completou o cartão: o prêmio é do próximo
  END IF;
  INSERT INTO public.loyalty_redemptions (barbershop_id, phone, appointment_id) VALUES (p_barbershop_id, v_phone, v_apt);
END;
$$;

REVOKE ALL ON FUNCTION public.use_package(uuid), public.undo_package_use(uuid), public.redeem_loyalty(uuid, text),
  public.loyalty_status(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.use_package(uuid), public.undo_package_use(uuid), public.redeem_loyalty(uuid, text),
  public.loyalty_status(uuid, text, uuid) TO authenticated;
