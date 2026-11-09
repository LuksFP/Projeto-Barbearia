-- Loja por plano, configurada em Configurações.
--
--   Básico  → "Leve junto no dia" com 1 produto (fim do agendamento).
--   Pro     → "Leve junto no dia" com até 3 produtos.
--   Premium → loja completa no site (página da loja, sacola, reserva sem
--             horário) + "Leve junto" com os produtos que o dono marcar.
--
-- Chaves da barbearia (Configurações):
--   barbershops.bump_enabled  → oferece o "Leve junto" no agendamento
--   barbershops.store_enabled → mostra a loja completa (só vale no Premium)
-- Produto:
--   products.in_bump → entra no "Leve junto". Fora do Premium o catálogo já é
--   do tamanho do limite; depois de descer de plano, vale o limite pelos
--   mais antigos.
--
-- Substitui as regras de 20261109065024 (que davam loja completa ao Pro).

ALTER TABLE public.barbershops
  ADD COLUMN IF NOT EXISTS store_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS bump_enabled  boolean NOT NULL DEFAULT true;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS in_bump boolean NOT NULL DEFAULT true;

-- ═══ Plano da barbearia ═════════════════════════════════════════════════════
-- Sem conta ou sem plano conta como Básico.
CREATE OR REPLACE FUNCTION public.barbershop_store_plan(p_barbershop_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((
    SELECT CASE WHEN sa.plan IN ('pro', 'premium') THEN sa.plan ELSE 'basic' END
      FROM public.barbershops b
      JOIN public.saas_accounts sa ON sa.id = b.saas_account_id
     WHERE b.id = p_barbershop_id
  ), 'basic')
$$;

REVOKE ALL ON FUNCTION public.barbershop_store_plan(uuid) FROM PUBLIC;

-- Quantos produtos cabem no catálogo / no "Leve junto". NULL = sem limite.
CREATE OR REPLACE FUNCTION public.barbershop_bump_limit(p_barbershop_id uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE public.barbershop_store_plan(p_barbershop_id)
           WHEN 'basic' THEN 1
           WHEN 'pro'   THEN 3
           ELSE NULL
         END
$$;

REVOKE ALL ON FUNCTION public.barbershop_bump_limit(uuid) FROM PUBLIC;

-- O plano permite loja completa (Premium). Usado pelo limite de catálogo.
CREATE OR REPLACE FUNCTION public.barbershop_has_full_store(p_barbershop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.barbershop_store_plan(p_barbershop_id) = 'premium'
$$;

REVOKE ALL ON FUNCTION public.barbershop_has_full_store(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.barbershop_has_full_store(uuid) TO authenticated;

-- A loja completa está no ar: Premium E chave ligada.
CREATE OR REPLACE FUNCTION public.barbershop_store_open(p_barbershop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.barbershop_has_full_store(p_barbershop_id)
     AND coalesce((SELECT store_enabled FROM public.barbershops WHERE id = p_barbershop_id), false)
$$;

REVOKE ALL ON FUNCTION public.barbershop_store_open(uuid) FROM PUBLIC;

-- Produtos do "Leve junto": chave ligada, ativos, no site, marcados, até o
-- limite do plano (os mais antigos primeiro).
CREATE OR REPLACE FUNCTION public.barbershop_bump_products(p_barbershop_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id FROM public.products p
    JOIN public.barbershops b ON b.id = p.barbershop_id AND b.bump_enabled
   WHERE p.barbershop_id = p_barbershop_id AND p.active AND p.visible_on_site AND p.in_bump
   ORDER BY p.created_at, p.id
   LIMIT public.barbershop_bump_limit(p_barbershop_id)
$$;

REVOKE ALL ON FUNCTION public.barbershop_bump_products(uuid) FROM PUBLIC;

-- ═══ Site: qual loja mostrar ════════════════════════════════════════════════
-- 'loja' = completa; 'leve_junto' = só a oferta no agendamento; 'nenhuma'.
CREATE OR REPLACE FUNCTION public.public_store_mode(p_barbershop_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.barbershop_store_open(p_barbershop_id) THEN 'loja'
    WHEN coalesce((SELECT bump_enabled FROM public.barbershops WHERE id = p_barbershop_id), false) THEN 'leve_junto'
    ELSE 'nenhuma'
  END
$$;

REVOKE ALL ON FUNCTION public.public_store_mode(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_store_mode(uuid) TO anon, authenticated;

-- ═══ Limite de catálogo: Básico 1, Pro 3 ════════════════════════════════════
-- Só barra quem ENTRA no catálogo (criar, ou reativar um arquivado). Editar
-- preço ou estoque de um produto que já estava ativo continua livre, mesmo
-- para quem desceu de plano com vários.
CREATE OR REPLACE FUNCTION public.enforce_store_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int;
BEGIN
  IF NOT NEW.active THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.active THEN RETURN NEW; END IF;
  v_limit := public.barbershop_bump_limit(NEW.barbershop_id);
  IF v_limit IS NULL THEN RETURN NEW; END IF;

  PERFORM pg_advisory_xact_lock(hashtext('store-limit:' || NEW.barbershop_id::text));
  IF (SELECT count(*) FROM public.products
       WHERE barbershop_id = NEW.barbershop_id AND active AND id <> NEW.id) >= v_limit THEN
    IF v_limit = 1 THEN
      RAISE EXCEPTION 'No plano Básico cabe 1 produto, o do agendamento. A loja completa vem no Premium.'
        USING ERRCODE = 'check_violation';
    END IF;
    RAISE EXCEPTION 'No plano Pro cabem 3 produtos, os do agendamento. A loja completa vem no Premium.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- ═══ Site: vitrine ══════════════════════════════════════════════════════════
-- Loja aberta: tudo que está no site, com in_bump dizendo o que vai no
-- agendamento. Senão: só os do "Leve junto".
DROP FUNCTION IF EXISTS public.public_barbershop_products(uuid);
CREATE FUNCTION public.public_barbershop_products(p_barbershop_id uuid)
RETURNS TABLE (id uuid, name text, description text, category text, price numeric, image_urls text[], available int, in_bump boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bump AS (SELECT public.barbershop_bump_products(p_barbershop_id) AS id),
       open AS (SELECT public.barbershop_store_open(p_barbershop_id) AS v)
  SELECT p.id, p.name, p.description, p.category, p.price, p.image_urls, least(p.stock, 10),
         p.id IN (SELECT id FROM bump)
    FROM public.products p
    JOIN public.barbershops b ON b.id = p.barbershop_id AND b.active
   WHERE p.barbershop_id = p_barbershop_id
     AND p.active
     AND p.visible_on_site
     AND ((SELECT v FROM open) OR p.id IN (SELECT id FROM bump))
   ORDER BY (p.stock > 0) DESC, p.category, p.name
$$;

REVOKE ALL ON FUNCTION public.public_barbershop_products(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_barbershop_products(uuid) TO anon, authenticated;

-- ═══ Site: pedido ═══════════════════════════════════════════════════════════
-- Loja aberta: qualquer produto do site, com ou sem horário. Senão: só junto
-- de um agendamento e só os produtos do "Leve junto".
CREATE OR REPLACE FUNCTION public.public_place_product_order(
  p_barbershop_id  uuid,
  p_items          jsonb,
  p_client_name    text,
  p_client_phone   text,
  p_appointment_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order  uuid := gen_random_uuid();
  v_phone  text := regexp_replace(coalesce(p_client_phone, ''), '\D', '', 'g');
  v_name   text := btrim(coalesce(p_client_name, ''));
  v_full   boolean;
  v_bump   uuid[];
  v_item   record;
  v_prod   record;
  v_open   int;
  v_url    text;
  v_secret text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.barbershops WHERE id = p_barbershop_id AND active) THEN
    RAISE EXCEPTION 'Barbearia indisponível' USING ERRCODE = 'check_violation';
  END IF;
  IF char_length(v_name) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'Informe seu nome' USING ERRCODE = 'check_violation';
  END IF;
  IF v_phone !~ '^[0-9]{10,13}$' THEN
    RAISE EXCEPTION 'Telefone inválido' USING ERRCODE = 'check_violation';
  END IF;
  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 10 THEN
    RAISE EXCEPTION 'Escolha de 1 a 10 produtos' USING ERRCODE = 'check_violation';
  END IF;

  v_full := public.barbershop_store_open(p_barbershop_id);
  IF NOT v_full THEN
    IF p_appointment_id IS NULL THEN
      RAISE EXCEPTION 'Produto indisponível' USING ERRCODE = 'check_violation';
    END IF;
    v_bump := ARRAY(SELECT public.barbershop_bump_products(p_barbershop_id));
  END IF;

  IF p_appointment_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.appointments a
     WHERE a.id = p_appointment_id
       AND a.barbershop_id = p_barbershop_id
       AND a.status <> 'cancelled'
       AND regexp_replace(a.client_phone, '\D', '', 'g') = v_phone
       AND a.created_at > now() - interval '15 minutes'
  ) THEN
    RAISE EXCEPTION 'Agendamento não encontrado' USING ERRCODE = 'check_violation';
  END IF;

  -- Freio: no máximo 5 pedidos em aberto por telefone nesta barbearia.
  SELECT count(DISTINCT order_id) INTO v_open
    FROM public.product_sales
   WHERE barbershop_id = p_barbershop_id AND client_phone = v_phone AND status = 'reservado';
  IF v_open >= 5 THEN
    RAISE EXCEPTION 'Muitas reservas em aberto. Retire as anteriores antes.' USING ERRCODE = 'check_violation';
  END IF;

  FOR v_item IN
    SELECT (x ->> 'product_id')::uuid AS product_id, sum((x ->> 'quantity')::int) AS quantity
      FROM jsonb_array_elements(p_items) AS x
     GROUP BY 1
  LOOP
    IF v_item.quantity IS NULL OR v_item.quantity NOT BETWEEN 1 AND 10 THEN
      RAISE EXCEPTION 'Quantidade inválida' USING ERRCODE = 'check_violation';
    END IF;
    SELECT p.id, p.price INTO v_prod
      FROM public.products p
     WHERE p.id = v_item.product_id AND p.barbershop_id = p_barbershop_id AND p.active AND p.visible_on_site
       AND (v_full OR p.id = ANY (v_bump));
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produto indisponível' USING ERRCODE = 'check_violation';
    END IF;
    -- O gatilho baixa o estoque (ou recusa com o nome do produto)
    INSERT INTO public.product_sales
      (order_id, barbershop_id, product_id, appointment_id, product_name, quantity, unit_price, client_name, client_phone)
    VALUES
      (v_order, p_barbershop_id, v_prod.id, p_appointment_id, '', v_item.quantity, v_prod.price, v_name, v_phone);
  END LOOP;

  -- Push pra equipe ("cliente agendado e venda realizada" / "reserva na loja").
  -- Assíncrono e opcional: se falhar, o pedido continua valendo.
  BEGIN
    SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url';
    SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'trial_cron_secret';
    IF v_url IS NOT NULL AND v_secret IS NOT NULL THEN
      PERFORM net.http_post(
        url     := v_url || '/functions/v1/push-new-booking',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
        body    := jsonb_build_object('order_id', v_order)
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'push do pedido: %', SQLERRM;
  END;

  RETURN v_order;
END;
$$;

REVOKE ALL ON FUNCTION public.public_place_product_order(uuid, jsonb, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_place_product_order(uuid, jsonb, text, text, uuid) TO anon, authenticated;

-- A versão de 1 produto saiu: tudo usa barbershop_bump_products agora.
DROP FUNCTION IF EXISTS public.barbershop_bump_product(uuid);
