-- Despesas da barbearia (Financeiro › Despesas) → faturamento x lucro.
--
-- Lançamento avulso: conta no mês de `date`.
-- Fixa (recurring): conta todo mês a partir do mês de `date` até `ends_on`
-- (exclusivo; NULL = continua). Ex.: aluguel lançado uma vez só.
-- Só dono/admin vê e mexe (mesma regra do resto do financeiro).

CREATE TABLE IF NOT EXISTS public.expenses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  description   text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 1 AND 80),
  category      text NOT NULL CHECK (category IN ('aluguel', 'contas', 'insumos', 'salarios', 'marketing', 'impostos', 'manutencao', 'outros')),
  amount        numeric(10,2) NOT NULL CHECK (amount > 0 AND amount < 1000000),
  date          date NOT NULL,
  recurring     boolean NOT NULL DEFAULT false,
  ends_on       date,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT expenses_ends_after_start CHECK (ends_on IS NULL OR (recurring AND ends_on > date))
);

CREATE INDEX IF NOT EXISTS expenses_barbershop_date_idx ON public.expenses (barbershop_id, date);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.expenses FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;

DROP POLICY IF EXISTS "admin reads expenses" ON public.expenses;
CREATE POLICY "admin reads expenses" ON public.expenses
  FOR SELECT TO authenticated
  USING (barbershop_id IN (SELECT public.my_admin_barbershop_ids()));

DROP POLICY IF EXISTS "admin inserts expenses" ON public.expenses;
CREATE POLICY "admin inserts expenses" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (barbershop_id IN (SELECT public.my_admin_barbershop_ids()));

DROP POLICY IF EXISTS "admin updates expenses" ON public.expenses;
CREATE POLICY "admin updates expenses" ON public.expenses
  FOR UPDATE TO authenticated
  USING (barbershop_id IN (SELECT public.my_admin_barbershop_ids()))
  WITH CHECK (barbershop_id IN (SELECT public.my_admin_barbershop_ids()));

DROP POLICY IF EXISTS "admin deletes expenses" ON public.expenses;
CREATE POLICY "admin deletes expenses" ON public.expenses
  FOR DELETE TO authenticated
  USING (barbershop_id IN (SELECT public.my_admin_barbershop_ids()));

-- Quem lançou não muda e a barbearia não troca
CREATE OR REPLACE FUNCTION public.expenses_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.barbershop_id := OLD.barbershop_id;
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
  ELSE
    NEW.created_by := auth.uid();
  END IF;
  NEW.description := btrim(NEW.description);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_expenses_guard ON public.expenses;
CREATE TRIGGER trg_expenses_guard
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.expenses_guard();
