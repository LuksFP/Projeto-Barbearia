-- Limpeza de 20261109074946_basic_plan_limits — mesmas regras, sem repetição.
--
-- 1. "A barbearia já usa comissão" estava escrito em duas funções
--    (enforce_basic_commission e default_basic_commission). Vira
--    barbershop_uses_commission() e uma função de gatilho só, pra INSERT e UPDATE.
-- 2. Toda recusa de plano sai com HINT 'plan_limit': o painel mostra a mensagem
--    do banco só quando vê esse hint (planLimitMessage em src/lib/errors.ts),
--    em vez de procurar texto na mensagem.

CREATE OR REPLACE FUNCTION public.barbershop_uses_commission(p_barbershop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.barbershop_members
                  WHERE barbershop_id = p_barbershop_id AND commission_percent <> 50)
$$;

REVOKE ALL ON FUNCTION public.barbershop_uses_commission(uuid) FROM PUBLIC;

-- Básico sem comissão em uso: membro novo entra com 50%, e mudar a % é recusado.
CREATE OR REPLACE FUNCTION public.enforce_basic_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.commission_percent IS NOT DISTINCT FROM OLD.commission_percent THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' AND NEW.commission_percent IS NOT DISTINCT FROM 50 THEN RETURN NEW; END IF;
  IF public.barbershop_store_plan(NEW.barbershop_id) <> 'basic'
     OR public.barbershop_uses_commission(NEW.barbershop_id) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.commission_percent := 50;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Comissão por barbeiro vem no plano Pro.'
    USING ERRCODE = 'check_violation', HINT = 'plan_limit';
END;
$$;

DROP TRIGGER IF EXISTS trg_basic_commission_insert ON public.barbershop_members;
DROP FUNCTION IF EXISTS public.default_basic_commission();
DROP TRIGGER IF EXISTS trg_basic_commission ON public.barbershop_members;
CREATE TRIGGER trg_basic_commission
  BEFORE INSERT OR UPDATE OF commission_percent ON public.barbershop_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_basic_commission();

-- As outras três: mesmo corpo, só com o HINT.
CREATE OR REPLACE FUNCTION public.enforce_basic_team_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT NEW.active THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.active THEN RETURN NEW; END IF;
  IF public.barbershop_store_plan(NEW.barbershop_id) <> 'basic' THEN RETURN NEW; END IF;

  PERFORM pg_advisory_xact_lock(hashtext('team-limit:' || NEW.barbershop_id::text));
  IF (SELECT count(*) FROM public.barbershop_members
       WHERE barbershop_id = NEW.barbershop_id AND active AND id <> NEW.id) >= 2 THEN
    RAISE EXCEPTION 'No plano Básico cabem 2 pessoas na equipe. Barbeiros ilimitados vêm no Pro.'
      USING ERRCODE = 'check_violation', HINT = 'plan_limit';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_basic_club()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.barbershop_store_plan(NEW.barbershop_id) <> 'basic' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.memberships WHERE barbershop_id = NEW.barbershop_id) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'O Clube VIP vem no plano Pro.'
    USING ERRCODE = 'check_violation', HINT = 'plan_limit';
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_basic_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.barbershop_store_plan(NEW.barbershop_id) <> 'basic' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.push_subscriptions
              WHERE barbershop_id = NEW.barbershop_id OR endpoint = NEW.endpoint) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Aviso de agendamento no celular vem no plano Pro.'
    USING ERRCODE = 'check_violation', HINT = 'plan_limit';
END;
$$;
