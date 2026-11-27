-- O cliente mexe no próprio horário por um link só dele (/b/:slug/horario/:token):
-- cancelar, remarcar (dia e hora; mesmo serviço e barbeiro) e, depois de
-- atendido, avaliar. Quem tem o link é o dono do horário: o token é um uuid
-- aleatório e o anon não lê a tabela.
--   self_cancel_hours  antecedência mínima; NULL = barbearia desligou
--   reviews_enabled    avaliação pelo cliente (começa desligada)
-- Fica fora do link (vai pro WhatsApp): pago online e cliente fixo.

ALTER TABLE public.barbershops
  ADD COLUMN IF NOT EXISTS self_cancel_hours int DEFAULT 2,
  ADD COLUMN IF NOT EXISTS reviews_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.barbershops DROP CONSTRAINT IF EXISTS barbershops_self_cancel_hours_check;
ALTER TABLE public.barbershops ADD CONSTRAINT barbershops_self_cancel_hours_check
  CHECK (self_cancel_hours IS NULL OR self_cancel_hours BETWEEN 0 AND 168);

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS manage_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS client_changed_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_change text,
  ADD COLUMN IF NOT EXISTS reschedule_count int NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS appointments_manage_token_key ON public.appointments (manage_token);

-- Quem agenda pelo site não grava o que é do sistema (aviso pro painel, nota).
CREATE OR REPLACE FUNCTION public.reset_public_appointment_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'anon' THEN
    NEW.client_change := NULL;
    NEW.client_changed_at := NULL;
    NEW.reschedule_count := 0;
    NEW.rating := NULL;
    NEW.review := NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.reset_public_appointment_fields() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_reset_public_appointment_fields ON public.appointments;
CREATE TRIGGER trg_reset_public_appointment_fields
  BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.reset_public_appointment_fields();

-- O que o site precisa saber pra oferecer o link.
CREATE OR REPLACE FUNCTION public.public_shop_features(p_barbershop_id uuid)
RETURNS TABLE (self_cancel_hours int, reviews_enabled boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT b.self_cancel_hours, b.reviews_enabled FROM public.barbershops b
   WHERE b.id = p_barbershop_id AND b.active;
$$;
GRANT EXECUTE ON FUNCTION public.public_shop_features(uuid) TO anon, authenticated;

-- Por que não dá pra cancelar/remarcar pelo link (NULL = dá).
CREATE OR REPLACE FUNCTION public.manage_lock_reason(a public.appointments, p_hours int)
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF a.status NOT IN ('pending', 'confirmed') THEN RETURN 'encerrado'; END IF;
  IF (a.date + a.time::time) <= (now() AT TIME ZONE 'America/Sao_Paulo') THEN RETURN 'passou'; END IF;
  IF p_hours IS NULL THEN RETURN 'desligado'; END IF;
  IF a.recurrence_id IS NOT NULL THEN RETURN 'fixo'; END IF;
  IF EXISTS (SELECT 1 FROM public.online_payments op WHERE op.appointment_id = a.id AND op.status = 'pago') THEN
    RETURN 'pago';
  END IF;
  IF (a.date + a.time::time) - make_interval(hours => p_hours) < (now() AT TIME ZONE 'America/Sao_Paulo') THEN
    RETURN 'prazo';
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.manage_lock_reason(public.appointments, int) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_manage_get(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE a public.appointments; b public.barbershops;
BEGIN
  SELECT * INTO a FROM public.appointments WHERE manage_token = p_token;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO b FROM public.barbershops WHERE id = a.barbershop_id AND active;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'barbershop_id', b.id, 'slug', b.slug, 'client_name', split_part(a.client_name, ' ', 1),
    'service_name', a.service_name, 'barber_id', a.barber_id, 'barber_name', a.barber_name,
    'date', a.date, 'time', left(a.time, 5), 'duration_min', coalesce(a.duration_min, 30),
    'status', a.status, 'min_hours', b.self_cancel_hours,
    'lock_reason', public.manage_lock_reason(a, b.self_cancel_hours),
    'reschedules_left', greatest(0, 3 - a.reschedule_count),
    'can_review', b.reviews_enabled AND a.status = 'done' AND a.rating IS NULL
                  AND a.date >= (now() AT TIME ZONE 'America/Sao_Paulo')::date - 30,
    'rating', a.rating);
END;
$$;
GRANT EXECUTE ON FUNCTION public.public_manage_get(uuid) TO anon, authenticated;

-- Trava a linha e confere se ainda dá pra mexer. Uso interno.
CREATE OR REPLACE FUNCTION public.manage_open_appointment(p_token uuid)
RETURNS public.appointments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE a public.appointments; v_hours int;
BEGIN
  SELECT * INTO a FROM public.appointments WHERE manage_token = p_token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Horário não encontrado' USING ERRCODE = 'no_data_found'; END IF;
  SELECT self_cancel_hours INTO v_hours FROM public.barbershops WHERE id = a.barbershop_id AND active;
  IF NOT FOUND OR public.manage_lock_reason(a, v_hours) IS NOT NULL THEN
    RAISE EXCEPTION 'Esse horário não pode mais ser mudado pelo link. Fale com a barbearia.'
      USING ERRCODE = 'check_violation', HINT = 'manage_locked';
  END IF;
  RETURN a;
END;
$$;
REVOKE ALL ON FUNCTION public.manage_open_appointment(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_manage_cancel(p_token uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE a public.appointments;
BEGIN
  a := public.manage_open_appointment(p_token);
  UPDATE public.appointments
     SET status = 'cancelled', client_changed_at = now(), client_change = 'Cancelado pelo cliente no link'
   WHERE id = a.id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.public_manage_cancel(uuid) TO anon, authenticated;

-- As regras do agendamento novo só rodam no INSERT, então são conferidas aqui.
-- Bloqueios e sobreposição por barbeiro já valem no UPDATE.
CREATE OR REPLACE FUNCTION public.public_manage_reschedule(p_token uuid, p_date date, p_time text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  a public.appointments; b public.barbershops;
  v_now timestamp := (now() AT TIME ZONE 'America/Sao_Paulo');
  v_dur int; v_start int; v_open int; v_close int; v_at int; v_from text; v_to text;
BEGIN
  a := public.manage_open_appointment(p_token);
  SELECT * INTO b FROM public.barbershops WHERE id = a.barbershop_id;
  v_dur := coalesce(a.duration_min, 30);
  IF a.reschedule_count >= 3 THEN
    RAISE EXCEPTION 'Esse horário já foi remarcado 3 vezes. Fale com a barbearia.' USING ERRCODE = 'check_violation';
  END IF;
  IF p_date IS NULL OR p_time IS NULL OR p_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN
    RAISE EXCEPTION 'Horário inválido' USING ERRCODE = 'check_violation';
  END IF;
  IF p_date = a.date AND p_time = left(a.time, 5) THEN RETURN; END IF;
  IF (p_date + p_time::time) < v_now + make_interval(hours => b.self_cancel_hours) OR p_date > v_now::date + 60 THEN
    RAISE EXCEPTION 'Escolha um horário dentro do prazo, em até 60 dias' USING ERRCODE = 'check_violation';
  END IF;

  v_start := extract(hour FROM p_time::time)::int * 60 + extract(minute FROM p_time::time)::int;
  -- expediente da barbearia e, se tiver, o do barbeiro
  FOR v_from, v_to IN
    SELECT b.open_time, b.close_time
    UNION ALL
    SELECT m.work_start, m.work_end FROM public.barbershop_members m
     WHERE m.id = a.barber_id AND m.work_start IS NOT NULL AND m.work_end IS NOT NULL
  LOOP
    v_open  := split_part(v_from, ':', 1)::int * 60 + split_part(v_from, ':', 2)::int;
    v_close := split_part(v_to, ':', 1)::int * 60 + split_part(v_to, ':', 2)::int;
    IF v_close <= v_open THEN v_close := v_close + 1440; END IF;
    v_at := CASE WHEN v_start < v_open AND v_close > 1440 THEN v_start + 1440 ELSE v_start END;
    IF v_at < v_open OR v_at + v_dur > v_close THEN
      RAISE EXCEPTION 'Horário fora do expediente' USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;
  IF a.barber_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.barbershop_members m WHERE m.id = a.barber_id AND m.active) THEN
    RAISE EXCEPTION 'Esse barbeiro não atende mais. Fale com a barbearia.' USING ERRCODE = 'check_violation';
  END IF;

  IF a.barber_id IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('no-barber:' || a.barbershop_id::text || ':' || p_date::text));
    IF EXISTS (SELECT 1 FROM public.appointments o
        WHERE o.barbershop_id = a.barbershop_id AND o.barber_id IS NULL AND o.id <> a.id
          AND o.status <> 'cancelled' AND o.date = p_date
          AND public.appointment_time_range(o.date, o.time, o.duration_min)
              && public.appointment_time_range(p_date, p_time, v_dur)) THEN
      RAISE EXCEPTION 'Esse horário acabou de ser reservado.' USING ERRCODE = 'exclusion_violation';
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.fixed_slot_hits(a.barbershop_id, a.barber_id, p_date) h
      WHERE public.appointment_time_range(p_date, h.slot_time, h.slot_duration)
            && public.appointment_time_range(p_date, p_time, v_dur)) THEN
    RAISE EXCEPTION 'Esse horário é reservado de um cliente fixo.' USING ERRCODE = 'exclusion_violation';
  END IF;

  UPDATE public.appointments
     SET date = p_date, time = p_time, reschedule_count = a.reschedule_count + 1, reminded_at = NULL,
         client_changed_at = now(),
         client_change = 'Remarcado pelo cliente (era ' || to_char(a.date, 'DD/MM') || ' às ' || left(a.time, 5) || ')'
   WHERE id = a.id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.public_manage_reschedule(uuid, date, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_manage_review(p_token uuid, p_rating int, p_review text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 OR char_length(coalesce(p_review, '')) > 500 THEN
    RAISE EXCEPTION 'Avaliação inválida' USING ERRCODE = 'check_violation';
  END IF;
  UPDATE public.appointments a SET rating = p_rating, review = nullif(btrim(coalesce(p_review, '')), '')
    FROM public.barbershops b
   WHERE a.manage_token = p_token AND b.id = a.barbershop_id AND b.active AND b.reviews_enabled
     AND a.status = 'done' AND a.rating IS NULL
     AND a.date >= (now() AT TIME ZONE 'America/Sao_Paulo')::date - 30;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Não dá pra avaliar esse atendimento' USING ERRCODE = 'check_violation';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.public_manage_review(uuid, int, text) TO anon, authenticated;
