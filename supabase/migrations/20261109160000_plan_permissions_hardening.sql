-- Permissões e regras de plano, depois da revisão do Pro (2026-11-09).
--
-- 1. barbershops.saas_account_id era editável por dono E admin (a política
--    "admin can update barbershop" cobre a linha toda). Um admin podia soltar a
--    barbearia da conta do dono (o dono perde o painel e o plano vira Básico)
--    ou apontar pra outra conta. Ninguém do lado do cliente muda isso; só o
--    servidor (service_role).
--
-- 2. barbershop_members: a política "admin can manage team" (ALL) deixava o
--    admin criar alguém como 'owner', se promover a 'owner', ou mexer/apagar a
--    linha de quem é 'owner'. Agora só o dono da conta SaaS da barbearia faz
--    isso. Admin segue gerenciando barbeiro, recepção e admin.
--
-- 3. As travas do Básico contavam também o que está DESATIVADO, e o painel só
--    vê o que está ativo (teamRepository / membershipRepository filtram active).
--    Resultado: o painel trancava a comissão/clube e o banco liberava. Agora
--    "já usava comissão" e "já tinha clube" olham só o que está ativo, igual
--    ao painel (src/hooks/usePlanGates.ts).

-- ═══ helpers ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_client_request()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '')
         IN ('authenticated', 'anon')
$$;

CREATE OR REPLACE FUNCTION public.is_account_owner_of(p_barbershop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.barbershops b
                   JOIN public.saas_accounts sa ON sa.id = b.saas_account_id
                  WHERE b.id = p_barbershop_id AND sa.user_id = auth.uid())
$$;

REVOKE ALL ON FUNCTION public.is_account_owner_of(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_account_owner_of(uuid) TO authenticated;

-- ═══ 1. conta da barbearia: só o servidor muda ═════════════════════════════
CREATE OR REPLACE FUNCTION public.prevent_barbershop_account_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_client_request() AND NEW.saas_account_id IS DISTINCT FROM OLD.saas_account_id THEN
    RAISE EXCEPTION 'A conta dona da barbearia não pode ser trocada pelo painel.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_barbershop_account_change ON public.barbershops;
CREATE TRIGGER trg_prevent_barbershop_account_change
  BEFORE UPDATE OF saas_account_id ON public.barbershops
  FOR EACH ROW EXECUTE FUNCTION public.prevent_barbershop_account_change();

REVOKE ALL ON FUNCTION public.prevent_barbershop_account_change() FROM PUBLIC;

-- ═══ 2. papel 'owner': só o dono da conta ══════════════════════════════════
CREATE OR REPLACE FUNCTION public.protect_owner_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.barbershop_id ELSE NEW.barbershop_id END;
BEGIN
  IF NOT public.is_client_request() OR public.is_account_owner_of(v_shop) THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  IF (TG_OP IN ('UPDATE', 'DELETE') AND OLD.role = 'owner')
     OR (TG_OP IN ('INSERT', 'UPDATE') AND NEW.role = 'owner') THEN
    RAISE EXCEPTION 'Só o dono da barbearia mexe no papel de dono.'
      USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.barbershop_id IS DISTINCT FROM OLD.barbershop_id THEN
    RAISE EXCEPTION 'Não dá pra mover alguém de barbearia.'
      USING ERRCODE = '42501';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_owner_role ON public.barbershop_members;
CREATE TRIGGER trg_protect_owner_role
  BEFORE INSERT OR UPDATE OR DELETE ON public.barbershop_members
  FOR EACH ROW EXECUTE FUNCTION public.protect_owner_role();

REVOKE ALL ON FUNCTION public.protect_owner_role() FROM PUBLIC;

-- ═══ 3. travas do Básico olham só o que está ativo ═════════════════════════
CREATE OR REPLACE FUNCTION public.barbershop_uses_commission(p_barbershop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.barbershop_members
                  WHERE barbershop_id = p_barbershop_id AND active AND commission_percent <> 50)
$$;

REVOKE ALL ON FUNCTION public.barbershop_uses_commission(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.enforce_basic_club()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.barbershop_store_plan(NEW.barbershop_id) <> 'basic' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.memberships
              WHERE barbershop_id = NEW.barbershop_id AND active) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'O Clube VIP vem no plano Pro.'
    USING ERRCODE = 'check_violation', HINT = 'plan_limit';
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_basic_club() FROM PUBLIC;
