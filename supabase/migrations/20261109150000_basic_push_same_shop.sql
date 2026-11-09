-- Aviso no celular no Básico: fecha a brecha do aparelho de outra barbearia.
--
-- enforce_basic_push liberava a inscrição quando o endpoint já existia em
-- QUALQUER barbearia. Como endpoint é UNIQUE e o painel faz upsert por
-- endpoint, um aparelho inscrito numa barbearia Pro, ao abrir o painel de uma
-- barbearia Básico, passava no gatilho e o ON CONFLICT trocava o barbershop_id
-- — a barbearia Básico ganhava o aviso sem nunca ter tido.
--
-- Agora vale só a própria barbearia: libera se ela já tem algum aparelho
-- inscrito (regra de transição de 20261109074946 continua igual). E o mesmo
-- teste roda quando o upsert muda o barbershop_id de uma linha existente.

CREATE OR REPLACE FUNCTION public.enforce_basic_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.barbershop_id IS NOT DISTINCT FROM OLD.barbershop_id THEN
    RETURN NEW;
  END IF;
  IF public.barbershop_store_plan(NEW.barbershop_id) <> 'basic' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.push_subscriptions
              WHERE barbershop_id = NEW.barbershop_id) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Aviso de agendamento no celular vem no plano Pro.'
    USING ERRCODE = 'check_violation', HINT = 'plan_limit';
END;
$$;

DROP TRIGGER IF EXISTS trg_basic_push ON public.push_subscriptions;
CREATE TRIGGER trg_basic_push
  BEFORE INSERT OR UPDATE OF barbershop_id ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_basic_push();

REVOKE ALL ON FUNCTION public.enforce_basic_push() FROM PUBLIC;
