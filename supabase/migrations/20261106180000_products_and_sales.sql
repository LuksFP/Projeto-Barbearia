-- Loja de produtos da barbearia (lado do barbeiro).
--
-- products       — catálogo: preço, custo, estoque, foto, se aparece no site.
-- product_sales  — venda registrada no balcão. O banco baixa o estoque na
--                  mesma transação e recusa se não tiver o suficiente; apagar
--                  a venda (estorno) devolve o estoque.
--
-- Quem faz o quê:
--   catálogo (criar/editar/arquivar) e estorno → dono/admin (my_admin_barbershop_ids)
--   ver catálogo e registrar venda            → qualquer pessoa da equipe (my_barbershop_ids)
-- O site público (anon) ainda não lê nada daqui: o lado cliente vem depois, por RPC.

-- ═══ Catálogo ════════════════════════════════════════════════════════════════
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
  image_url       text CHECK (image_url IS NULL OR image_url ~ '^https://'),
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

-- Sem DELETE: produto sai do catálogo arquivando (active = false), pra o
-- histórico de vendas continuar apontando pra ele.
REVOKE ALL ON public.products FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.products TO authenticated;

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

-- ═══ Vendas ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.product_sales (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id  uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  product_id     uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name   text NOT NULL,
  quantity       integer NOT NULL CHECK (quantity BETWEEN 1 AND 999),
  unit_price     numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  unit_cost      numeric(10,2),
  total          numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  sold_by        uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  seller_name    text NOT NULL CHECK (char_length(seller_name) BETWEEN 1 AND 80),
  client_name    text CHECK (client_name IS NULL OR char_length(client_name) <= 80),
  payment_method text CHECK (payment_method IS NULL OR payment_method IN ('dinheiro', 'pix', 'cartao')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_sales_barbershop_idx ON public.product_sales (barbershop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS product_sales_product_idx ON public.product_sales (product_id);

ALTER TABLE public.product_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team reads sales" ON public.product_sales;
CREATE POLICY "team reads sales" ON public.product_sales
  FOR SELECT TO authenticated
  USING (barbershop_id IN (SELECT public.my_barbershop_ids()));

DROP POLICY IF EXISTS "team registers sale" ON public.product_sales;
CREATE POLICY "team registers sale" ON public.product_sales
  FOR INSERT TO authenticated
  WITH CHECK (
    sold_by = auth.uid()
    AND barbershop_id IN (SELECT public.my_barbershop_ids())
  );

DROP POLICY IF EXISTS "admin reverses sale" ON public.product_sales;
CREATE POLICY "admin reverses sale" ON public.product_sales
  FOR DELETE TO authenticated
  USING (barbershop_id IN (SELECT public.my_admin_barbershop_ids()));

REVOKE ALL ON public.product_sales FROM anon;
GRANT SELECT, INSERT, DELETE ON public.product_sales TO authenticated;

-- Baixa o estoque na mesma transação. Nome, custo e o produto ser desta
-- barbearia vêm do banco, não do navegador. O preço pode ter desconto, mas
-- nunca passa do preço de tabela.
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
    IF EXISTS (SELECT 1 FROM public.products
               WHERE id = NEW.product_id AND barbershop_id = NEW.barbershop_id AND active) THEN
      RAISE EXCEPTION 'Estoque insuficiente' USING ERRCODE = 'check_violation';
    END IF;
    RAISE EXCEPTION 'Produto inválido para esta barbearia' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.unit_price > v_price THEN
    RAISE EXCEPTION 'Preço acima do preço do produto' USING ERRCODE = 'check_violation';
  END IF;

  NEW.product_name := v_name;
  NEW.unit_cost    := v_cost;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_product_sale() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_apply_product_sale ON public.product_sales;
CREATE TRIGGER trg_apply_product_sale
  BEFORE INSERT ON public.product_sales
  FOR EACH ROW EXECUTE FUNCTION public.apply_product_sale();

-- Estorno: venda apagada devolve o estoque.
CREATE OR REPLACE FUNCTION public.reverse_product_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products SET stock = stock + OLD.quantity WHERE id = OLD.product_id;
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.reverse_product_sale() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_reverse_product_sale ON public.product_sales;
CREATE TRIGGER trg_reverse_product_sale
  AFTER DELETE ON public.product_sales
  FOR EACH ROW EXECUTE FUNCTION public.reverse_product_sale();

-- ═══ Fotos dos produtos ══════════════════════════════════════════════════════
-- Bucket público barbershop-assets não tinha nenhuma política de escrita.
-- Aqui só a pasta products/{barbershop_id}/ — dono/admin daquela barbearia.
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
