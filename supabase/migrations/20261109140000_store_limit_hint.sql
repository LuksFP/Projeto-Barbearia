-- A trava de catálogo da Loja (20261109090000_store_settings) passa a recusar com
-- HINT 'plan_limit', como as outras travas de plano. O painel mostra a mensagem
-- do banco por esse hint (planLimitMessage em src/lib/errors.ts) em vez de
-- procurar "No plano … cabe" no texto. Mesmo corpo de antes, só o HINT.
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
        USING ERRCODE = 'check_violation', HINT = 'plan_limit';
    END IF;
    RAISE EXCEPTION 'No plano Pro cabem 3 produtos, os do agendamento. A loja completa vem no Premium.'
      USING ERRCODE = 'check_violation', HINT = 'plan_limit';
  END IF;
  RETURN NEW;
END;
$$;
