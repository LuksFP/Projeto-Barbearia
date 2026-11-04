-- Auditoria de 2026-11-04.

-- ═══ 1. Validação do agendamento no banco ═══════════════════════════════════
-- O site público insere direto via API: preço, duração, barbeiro e horário
-- vinham do navegador e eram aceitos como estavam. Agora o banco confere.
--  • Todo INSERT (qualquer origem) exige barbeiro, exceto cancelado — sem
--    barbeiro a constraint anti-sobreposição não vale.
--  • INSERT anônimo: barbeiro e serviço precisam ser da barbearia e estar
--    ativos; a duração vem do barbeiro (cut_duration_minutes), não do cliente;
--    o preço fica entre o do serviço e a soma dos serviços ativos (combo);
--    o horário não pode estar no passado nem fora do expediente.
CREATE OR REPLACE FUNCTION public.validate_appointment_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role      text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
  v_cut       int;
  v_svc_price numeric;
  v_total     numeric;
  v_open      text;
  v_close     text;
  v_open_min  int;
  v_close_min int;
  v_start_min int;
  v_now       timestamp := (now() AT TIME ZONE 'America/Sao_Paulo');
BEGIN
  IF NEW.barber_id IS NULL AND NEW.status <> 'cancelled' THEN
    RAISE EXCEPTION 'Agendamento precisa de um barbeiro' USING ERRCODE = 'check_violation';
  END IF;

  IF v_role <> 'anon' THEN
    RETURN NEW;
  END IF;

  SELECT m.cut_duration_minutes INTO v_cut
  FROM public.barbershop_members m
  WHERE m.id = NEW.barber_id AND m.barbershop_id = NEW.barbershop_id AND m.active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Barbeiro inválido para esta barbearia' USING ERRCODE = 'check_violation';
  END IF;

  SELECT s.price INTO v_svc_price
  FROM public.services s
  WHERE s.id = NEW.service_id AND s.barbershop_id = NEW.barbershop_id AND s.active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Serviço inválido para esta barbearia' USING ERRCODE = 'check_violation';
  END IF;

  SELECT coalesce(sum(s.price), 0) INTO v_total
  FROM public.services s
  WHERE s.barbershop_id = NEW.barbershop_id AND s.active;
  IF coalesce(NEW.price, 0) < v_svc_price OR coalesce(NEW.price, 0) > v_total THEN
    RAISE EXCEPTION 'Preço inválido para os serviços escolhidos' USING ERRCODE = 'check_violation';
  END IF;

  NEW.duration_min := v_cut;

  IF (NEW.date + NEW.time::time) < v_now - interval '5 minutes' THEN
    RAISE EXCEPTION 'Esse horário já passou' USING ERRCODE = 'check_violation';
  END IF;

  SELECT b.open_time, b.close_time INTO v_open, v_close
  FROM public.barbershops b WHERE b.id = NEW.barbershop_id;

  v_open_min  := split_part(v_open, ':', 1)::int * 60 + split_part(v_open, ':', 2)::int;
  v_close_min := split_part(v_close, ':', 1)::int * 60 + split_part(v_close, ':', 2)::int;
  IF v_close_min <= v_open_min THEN v_close_min := v_close_min + 1440; END IF;  -- fecha depois da meia-noite

  v_start_min := extract(hour from NEW.time::time)::int * 60 + extract(minute from NEW.time::time)::int;
  IF v_start_min < v_open_min AND v_close_min > 1440 THEN v_start_min := v_start_min + 1440; END IF;

  IF v_start_min < v_open_min OR v_start_min + NEW.duration_min > v_close_min THEN
    RAISE EXCEPTION 'Horário fora do expediente da barbearia' USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_appointment_insert ON public.appointments;
CREATE TRIGGER trg_validate_appointment_insert
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_appointment_insert();

-- ═══ 2. Carência de past_due ════════════════════════════════════════════════
-- O Stripe tenta cobrar de novo por dias; o acesso caía na 1ª falha. A coluna
-- guarda quando começou o atraso (webhook) e o front dá 3 dias de acesso.
ALTER TABLE public.saas_accounts
  ADD COLUMN IF NOT EXISTS past_due_since timestamptz;

-- Mesma trava de cobrança da migration anterior, agora incluindo past_due_since.
CREATE OR REPLACE FUNCTION public.prevent_billing_field_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
BEGIN
  IF v_role IN ('authenticated', 'anon') THEN
    IF NEW.plan                   IS DISTINCT FROM OLD.plan
    OR NEW.plan_status            IS DISTINCT FROM OLD.plan_status
    OR NEW.plan_started_at        IS DISTINCT FROM OLD.plan_started_at
    OR NEW.stripe_customer_id     IS DISTINCT FROM OLD.stripe_customer_id
    OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
    OR NEW.trial_ends_at          IS DISTINCT FROM OLD.trial_ends_at
    OR NEW.cancel_at              IS DISTINCT FROM OLD.cancel_at
    OR NEW.trial_reminder_sent_at IS DISTINCT FROM OLD.trial_reminder_sent_at
    OR NEW.past_due_since         IS DISTINCT FROM OLD.past_due_since
    OR NEW.barbershop_id          IS DISTINCT FROM OLD.barbershop_id
    OR NEW.user_id                IS DISTINCT FROM OLD.user_id
    THEN
      RAISE EXCEPTION 'Alteração de campos de cobrança não permitida pelo cliente'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ═══ 3. Fim de trial de hora em hora ════════════════════════════════════════
-- Era 1x/dia (3h UTC): trial vencido seguia valendo no banco por até ~24h.
SELECT cron.unschedule('expire-trials') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'expire-trials'
);
SELECT cron.schedule(
  'expire-trials',
  '5 * * * *',
  $$
    UPDATE public.saas_accounts
    SET plan_status = 'cancelled', plan = NULL
    WHERE plan_status = 'trial'
      AND trial_ends_at IS NOT NULL
      AND trial_ends_at < now();
  $$
);
