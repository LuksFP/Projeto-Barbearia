-- Travas do plano Básico — o que a lista de planos já promete como Pro.
--
--   Equipe     → até 2 membros ativos (barbeiros, recepção, admin)
--   Clube VIP  → criar clube é Pro
--   Avisos     → notificação no celular (push) é Pro
--   Comissão   → % por barbeiro é Pro
--
-- Regra de transição (decisão do Lucas, 2026-11-09): o que já existe fica.
-- Quem está no Básico com 3 barbeiros continua com os 3, só não entra o 4º;
-- clube que já existe segue funcionando (inclusive plano novo dentro dele);
-- barbearia que já tem aparelho com aviso continua podendo inscrever aparelho;
-- quem já mudou a comissão de alguém continua podendo mexer.
--
-- O plano vem de barbershop_store_plan() (20261109090000): sem conta = Básico.

-- ═══ Equipe: até 2 no Básico ═══════════════════════════════════════════════
-- Só barra quem ENTRA na equipe (criar, ou reativar alguém desligado).
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
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_basic_team_limit ON public.barbershop_members;
CREATE TRIGGER trg_basic_team_limit
  BEFORE INSERT OR UPDATE OF active ON public.barbershop_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_basic_team_limit();

-- ═══ Comissão: Pro ═════════════════════════════════════════════════════════
-- "Em uso" = alguém da barbearia já tem % diferente do padrão (50).
CREATE OR REPLACE FUNCTION public.enforce_basic_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.commission_percent IS NOT DISTINCT FROM OLD.commission_percent THEN RETURN NEW; END IF;
  IF public.barbershop_store_plan(NEW.barbershop_id) <> 'basic' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.barbershop_members
              WHERE barbershop_id = NEW.barbershop_id AND commission_percent <> 50) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Comissão por barbeiro vem no plano Pro.'
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_basic_commission ON public.barbershop_members;
CREATE TRIGGER trg_basic_commission
  BEFORE UPDATE OF commission_percent ON public.barbershop_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_basic_commission();

-- Comissão na entrada também: no Básico o membro novo entra com o padrão,
-- a não ser que a barbearia já use comissão.
CREATE OR REPLACE FUNCTION public.default_basic_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.commission_percent IS DISTINCT FROM 50
     AND public.barbershop_store_plan(NEW.barbershop_id) = 'basic'
     AND NOT EXISTS (SELECT 1 FROM public.barbershop_members
                      WHERE barbershop_id = NEW.barbershop_id AND commission_percent <> 50) THEN
    NEW.commission_percent := 50;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_basic_commission_insert ON public.barbershop_members;
CREATE TRIGGER trg_basic_commission_insert
  BEFORE INSERT ON public.barbershop_members
  FOR EACH ROW EXECUTE FUNCTION public.default_basic_commission();

-- ═══ Clube VIP: Pro ════════════════════════════════════════════════════════
-- Barra só o PRIMEIRO plano do clube. Clube que já existe segue normal.
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
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_basic_club ON public.memberships;
CREATE TRIGGER trg_basic_club
  BEFORE INSERT ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.enforce_basic_club();

-- ═══ Aviso no celular (push): Pro ══════════════════════════════════════════
-- Barbearia que já tem algum aparelho inscrito continua podendo inscrever
-- (inclusive o mesmo aparelho de novo — o painel faz upsert a cada abertura).
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
    USING ERRCODE = 'check_violation';
END;
$$;

DROP TRIGGER IF EXISTS trg_basic_push ON public.push_subscriptions;
CREATE TRIGGER trg_basic_push
  BEFORE INSERT ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_basic_push();

REVOKE ALL ON FUNCTION public.enforce_basic_team_limit() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_basic_commission() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.default_basic_commission() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_basic_club() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_basic_push() FROM PUBLIC;
