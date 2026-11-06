-- Loja da barbearia.
--
-- products       — catálogo: preço, custo, estoque, fotos, se aparece no site.
-- product_sales  — itens de pedido. A venda nasce no SITE DO CLIENTE (não no
--                  painel), por public_place_product_order:
--                    • junto com o agendamento (oferta "leve junto"), ou
--                    • reserva pra retirar, sem horário.
--                  O banco baixa o estoque na hora do pedido. Status:
--                  reservado → retirado | cancelado. Cancelar devolve o estoque.
--                  Agendamento cancelado cancela os itens dele; concluído, marca
--                  como retirado. Pagamento é na barbearia, como o corte.
--
-- Quem faz o quê:
--   catálogo (criar/editar/excluir)       → dono/admin (my_admin_barbershop_ids)
--   ver pedidos, marcar retirado/cancelar → equipe (my_barbershop_ids)
--   fazer pedido                          → cliente (anon) só pela RPC
--   ver vitrine                           → anon pela RPC public_barbershop_products

-- ═══ Catálogo ════════════════════════════════════════════════════════════════
-- Fotos: até 4 URLs públicas do Storage (a primeira é a capa).
CREATE OR REPLACE FUNCTION public.product_images_ok(urls text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT coalesce(cardinality(urls), 0) <= 4
     AND coalesce(bool_and(u ~ '^https://'), true)
  FROM unnest(coalesce(urls, '{}'::text[])) AS u
$$;

CREATE TABLE IF NOT EXISTS public.products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id   uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name            text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  description     text NOT NULL DEFAULT '' CHECK (char_length(description) <= 300),
  category        text NOT NULL DEFAULT 'Outros' CHECK (char_length(btrim(category)) BETWEEN 1 AND 40),
  price           numeric(10,2) NOT NULL CHECK (price >= 0),
  cost            numeric(10,2) CHECK (cost IS NULL OR cost >= 0),
  stock           integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  low_stock_at    integer NOT NULL DEFAULT 2 CHECK (low_stock_at >= 0),
  image_urls      text[] NOT NULL DEFAULT '{}' CHECK (public.product_images_ok(image_urls)),
  visible_on_site boolean NOT NULL DEFAULT true,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_barbershop_idx ON public.products (barbershop_id, active, name);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team reads products" ON public.products;
CREATE POLICY "team reads products" ON public.products
  FOR SELECT TO authenticated
  USING (barbershop_id IN (SELECT public.my_barbershop_ids()));

DROP POLICY IF EXISTS "admin inserts products" ON public.products;
CREATE POLICY "admin inserts products" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (barbershop_id IN (SELECT public.my_admin_barbershop_ids()));

DROP POLICY IF EXISTS "admin updates products" ON public.products;
CREATE POLICY "admin updates products" ON public.products
  FOR UPDATE TO authenticated
  USING (barbershop_id IN (SELECT public.my_admin_barbershop_ids()))
  WITH CHECK (barbershop_id IN (SELECT public.my_admin_barbershop_ids()));

-- Excluir de verdade só produto que nunca vendeu: product_sales aponta com
-- ON DELETE RESTRICT, então com venda o DELETE falha e o app arquiva
-- (active = false) — o histórico continua apontando pro produto.
DROP POLICY IF EXISTS "admin deletes products" ON public.products;
CREATE POLICY "admin deletes products" ON public.products
  FOR DELETE TO authenticated
  USING (barbershop_id IN (SELECT public.my_admin_barbershop_ids()));

REVOKE ALL ON public.products FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_product_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_products ON public.products;
CREATE TRIGGER trg_touch_products
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.touch_product_updated_at();

-- ═══ Pedidos (itens) ═════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.product_sales (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       uuid NOT NULL,                       -- agrupa os itens de um pedido
  barbershop_id  uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  product_id     uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  product_name   text NOT NULL,
  quantity       integer NOT NULL CHECK (quantity BETWEEN 1 AND 10),
  unit_price     numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  unit_cost      numeric(10,2),
  total          numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  client_name    text NOT NULL CHECK (char_length(btrim(client_name)) BETWEEN 1 AND 80),
  client_phone   text NOT NULL CHECK (client_phone ~ '^[0-9]{10,13}$'),
  status         text NOT NULL DEFAULT 'reservado' CHECK (status IN ('reservado', 'retirado', 'cancelado')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_sales_barbershop_idx ON public.product_sales (barbershop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS product_sales_product_idx ON public.product_sales (product_id);
CREATE INDEX IF NOT EXISTS product_sales_order_idx ON public.product_sales (order_id);
CREATE INDEX IF NOT EXISTS product_sales_appointment_idx ON public.product_sales (appointment_id) WHERE appointment_id IS NOT NULL;

ALTER TABLE public.product_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team reads sales" ON public.product_sales;
CREATE POLICY "team reads sales" ON public.product_sales
  FOR SELECT TO authenticated
  USING (barbershop_id IN (SELECT public.my_barbershop_ids()));

-- A equipe só mexe no status (GRANT de coluna abaixo); a transição é conferida
-- pelo gatilho.
DROP POLICY IF EXISTS "team updates order status" ON public.product_sales;
CREATE POLICY "team updates order status" ON public.product_sales
  FOR UPDATE TO authenticated
  USING (barbershop_id IN (SELECT public.my_barbershop_ids()))
  WITH CHECK (barbershop_id IN (SELECT public.my_barbershop_ids()));

-- Sem INSERT/DELETE direto pra ninguém: pedido entra só pela RPC; desfazer é cancelar.
REVOKE ALL ON public.product_sales FROM anon, authenticated;
GRANT SELECT ON public.product_sales TO authenticated;
GRANT UPDATE (status) ON public.product_sales TO authenticated;

-- Entrada do item: baixa o estoque na mesma transação. Nome e custo vêm do
-- produto; preço nunca acima do de tabela.
CREATE OR REPLACE FUNCTION public.apply_product_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name  text;
  v_price numeric;
  v_cost  numeric;
BEGIN
  UPDATE public.products
     SET stock = stock - NEW.quantity
   WHERE id = NEW.product_id
     AND barbershop_id = NEW.barbershop_id
     AND active
     AND stock >= NEW.quantity
  RETURNING name, price, cost INTO v_name, v_price, v_cost;

  IF NOT FOUND THEN
    SELECT name INTO v_name FROM public.products
     WHERE id = NEW.product_id AND barbershop_id = NEW.barbershop_id AND active;
    IF FOUND THEN
      RAISE EXCEPTION 'Sem estoque suficiente: %', v_name USING ERRCODE = 'check_violation';
    END IF;
    RAISE EXCEPTION 'Produto inválido para esta barbearia' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.unit_price > v_price THEN
    RAISE EXCEPTION 'Preço acima do preço do produto' USING ERRCODE = 'check_violation';
  END IF;

  NEW.product_name := v_name;
  NEW.unit_cost    := v_cost;
  NEW.status       := 'reservado';
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_product_sale() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_apply_product_sale ON public.product_sales;
CREATE TRIGGER trg_apply_product_sale
  BEFORE INSERT ON public.product_sales
  FOR EACH ROW EXECUTE FUNCTION public.apply_product_sale();

-- Mudança de status: reservado → retirado | cancelado; retirado → cancelado.
-- Cancelado é final. Cancelar devolve o estoque.
CREATE OR REPLACE FUNCTION public.product_sale_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'cancelado' THEN
    RAISE EXCEPTION 'Pedido cancelado não volta' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.status = 'retirado' AND NEW.status <> 'cancelado' THEN
    RAISE EXCEPTION 'Mudança de status inválida' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.status = 'cancelado' THEN
    UPDATE public.products SET stock = stock + OLD.quantity WHERE id = OLD.product_id;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.product_sale_status_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_product_sale_status ON public.product_sales;
CREATE TRIGGER trg_product_sale_status
  BEFORE UPDATE OF status ON public.product_sales
  FOR EACH ROW EXECUTE FUNCTION public.product_sale_status_change();

-- Agendamento cancelado → itens reservados dele cancelam (estoque volta).
-- Agendamento concluído → itens reservados viram retirados.
CREATE OR REPLACE FUNCTION public.sync_order_with_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' THEN
    UPDATE public.product_sales SET status = 'cancelado'
     WHERE appointment_id = NEW.id AND status = 'reservado';
  ELSIF NEW.status = 'done' THEN
    UPDATE public.product_sales SET status = 'retirado'
     WHERE appointment_id = NEW.id AND status = 'reservado';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_order_with_appointment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_sync_order_with_appointment ON public.appointments;
CREATE TRIGGER trg_sync_order_with_appointment
  AFTER UPDATE OF status ON public.appointments
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION public.sync_order_with_appointment();

-- ═══ Site do cliente: vitrine ═══════════════════════════════════════════════
-- Só o que a barbearia marcou pra aparecer. Sem custo, sem estoque exato
-- (devolve até 10, o máximo que dá pra pedir de uma vez).
CREATE OR REPLACE FUNCTION public.public_barbershop_products(p_barbershop_id uuid)
RETURNS TABLE (id uuid, name text, description text, category text, price numeric, image_urls text[], available int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.description, p.category, p.price, p.image_urls, least(p.stock, 10)
    FROM public.products p
    JOIN public.barbershops b ON b.id = p.barbershop_id AND b.active
   WHERE p.barbershop_id = p_barbershop_id
     AND p.active
     AND p.visible_on_site
   ORDER BY (p.stock > 0) DESC, p.category, p.name
$$;

REVOKE ALL ON FUNCTION public.public_barbershop_products(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_barbershop_products(uuid) TO anon, authenticated;

-- ═══ Site do cliente: fazer pedido ══════════════════════════════════════════
-- p_items: [{"product_id": "...", "quantity": 2}, ...] (1 a 10 produtos).
-- Com p_appointment_id: o agendamento tem que ser desta barbearia, do mesmo
-- telefone, não cancelado e criado há no máximo 15 min (o site gera o id do
-- agendamento e manda junto logo depois de marcar).
-- Tudo ou nada: faltou estoque de um item, nenhum entra.
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
     WHERE p.id = v_item.product_id AND p.barbershop_id = p_barbershop_id AND p.active AND p.visible_on_site;
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

-- ═══ Resumo por mês (Financeiro) ═════════════════════════════════════════════
-- Conta o que não foi cancelado. SECURITY INVOKER: a RLS de product_sales vale.
CREATE OR REPLACE FUNCTION public.product_sales_by_month(p_barbershop_id uuid, p_from date)
RETURNS TABLE (month text, revenue numeric, profit numeric, items bigint, has_cost boolean)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT to_char(created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM') AS month,
         sum(total)                                                    AS revenue,
         sum(CASE WHEN unit_cost IS NULL THEN 0 ELSE (unit_price - unit_cost) * quantity END) AS profit,
         sum(quantity)                                                 AS items,
         bool_or(unit_cost IS NOT NULL)                                AS has_cost
    FROM public.product_sales
   WHERE barbershop_id = p_barbershop_id
     AND status <> 'cancelado'
     AND created_at >= (p_from::timestamp AT TIME ZONE 'America/Sao_Paulo')
   GROUP BY 1
   ORDER BY 1
$$;

REVOKE ALL ON FUNCTION public.product_sales_by_month(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.product_sales_by_month(uuid, date) TO authenticated;

-- ═══ Fotos dos produtos ══════════════════════════════════════════════════════
-- Bucket público barbershop-assets não tinha nenhuma política de escrita.
-- Aqui só a pasta products/{barbershop_id}/{product_id}/ — dono/admin daquela barbearia.
DROP POLICY IF EXISTS "admin uploads product photos" ON storage.objects;
CREATE POLICY "admin uploads product photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'barbershop-assets'
    AND (storage.foldername(name))[1] = 'products'
    AND (storage.foldername(name))[2] IN (SELECT public.my_admin_barbershop_ids()::text)
  );

DROP POLICY IF EXISTS "admin updates product photos" ON storage.objects;
CREATE POLICY "admin updates product photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'barbershop-assets'
    AND (storage.foldername(name))[1] = 'products'
    AND (storage.foldername(name))[2] IN (SELECT public.my_admin_barbershop_ids()::text)
  );

DROP POLICY IF EXISTS "admin deletes product photos" ON storage.objects;
CREATE POLICY "admin deletes product photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'barbershop-assets'
    AND (storage.foldername(name))[1] = 'products'
    AND (storage.foldername(name))[2] IN (SELECT public.my_admin_barbershop_ids()::text)
  );

-- upsert do storage-js faz SELECT antes de sobrescrever
DROP POLICY IF EXISTS "team reads product photos" ON storage.objects;
CREATE POLICY "team reads product photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'barbershop-assets'
    AND (storage.foldername(name))[1] = 'products'
    AND (storage.foldername(name))[2] IN (SELECT public.my_barbershop_ids()::text)
  );
