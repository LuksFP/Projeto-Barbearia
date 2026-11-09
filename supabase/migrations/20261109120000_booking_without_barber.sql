-- Agendamento no site de barbearia sem barbeiro cadastrado.
--
-- Antes: a etapa "Escolha o barbeiro" ficava vazia e o cliente não conseguia
-- seguir. Agora o site pula a etapa e a barbearia conta como uma cadeira só:
-- os ocupados são os agendamentos sem barbeiro (barber_id NULL).
--
-- 0) validate_appointment_insert: barbeiro continua obrigatório, menos
--    quando a barbearia não tem nenhum barbeiro ativo. (Cópia da versão de
--    20261106150000 com só essa mudança.)
-- 1) public_barber_busy_slots aceita p_barber_id NULL (= agendamentos sem
--    barbeiro).
-- 2) A trava de sobreposição (appointments_no_overlap_per_barber) ignora
--    barber_id NULL. Pro site (anon) não marcar dois clientes no mesmo
--    horário sem barbeiro, um gatilho faz a mesma checagem com lock por
--    barbearia+data e devolve 23P01 — o site já trata esse código.
--    O painel (autenticado) continua livre, como antes.

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
  v_svc_dur   int;
  v_total     numeric;
  v_total_dur int;
  v_n_ids     int;
  v_n_found   int;
  v_sum_price numeric;
  v_sum_dur   int;
  v_min_dur   int;
  v_open      text;
  v_close     text;
  v_open_min  int;
  v_close_min int;
  v_start_min int;
  v_now       timestamp := (now() AT TIME ZONE 'America/Sao_Paulo');
BEGIN
  -- Barbeiro obrigatório, menos quando a barbearia não tem nenhum ativo
  -- (aí ela é uma cadeira só e o site pula a etapa do barbeiro).
  IF NEW.barber_id IS NULL AND NEW.status <> 'cancelled' AND EXISTS (
    SELECT 1 FROM public.barbershop_members m
     WHERE m.barbershop_id = NEW.barbershop_id AND m.active
  ) THEN
    RAISE EXCEPTION 'Agendamento precisa de um barbeiro' USING ERRCODE = 'check_violation';
  END IF;

  IF v_role <> 'anon' THEN
    RETURN NEW;
  END IF;

  IF NEW.barber_id IS NOT NULL THEN
    SELECT m.cut_duration_minutes INTO v_cut
    FROM public.barbershop_members m
    WHERE m.id = NEW.barber_id AND m.barbershop_id = NEW.barbershop_id AND m.active;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Barbeiro inválido para esta barbearia' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  SELECT s.price, s.duration_min INTO v_svc_price, v_svc_dur
  FROM public.services s
  WHERE s.id = NEW.service_id AND s.barbershop_id = NEW.barbershop_id AND s.active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Serviço inválido para esta barbearia' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.service_ids IS NOT NULL AND cardinality(NEW.service_ids) > 0 THEN
    -- Combo explícito: todos os serviços precisam ser desta barbearia e ativos.
    SELECT count(DISTINCT x) INTO v_n_ids FROM unnest(NEW.service_ids) AS x;
    SELECT count(*), coalesce(sum(s.price), 0), coalesce(sum(s.duration_min), 0)
      INTO v_n_found, v_sum_price, v_sum_dur
    FROM public.services s
    WHERE s.id = ANY (NEW.service_ids) AND s.barbershop_id = NEW.barbershop_id AND s.active;
    IF v_n_found <> v_n_ids OR v_n_ids > 20 OR NOT (NEW.service_id = ANY (NEW.service_ids)) THEN
      RAISE EXCEPTION 'Serviço inválido para esta barbearia' USING ERRCODE = 'check_violation';
    END IF;
    NEW.service_ids  := ARRAY(SELECT DISTINCT x FROM unnest(NEW.service_ids) AS x);
    NEW.price        := v_sum_price;
    NEW.duration_min := CASE WHEN v_sum_dur > 0 THEN v_sum_dur ELSE coalesce(v_cut, 30) END;
  ELSE
    SELECT coalesce(sum(s.price), 0), coalesce(sum(s.duration_min), 0) INTO v_total, v_total_dur
    FROM public.services s
    WHERE s.barbershop_id = NEW.barbershop_id AND s.active;
    IF coalesce(NEW.price, 0) < v_svc_price OR coalesce(NEW.price, 0) > v_total THEN
      RAISE EXCEPTION 'Preço inválido para os serviços escolhidos' USING ERRCODE = 'check_violation';
    END IF;
    v_min_dur := CASE WHEN coalesce(v_svc_dur, 0) > 0 THEN v_svc_dur ELSE coalesce(v_cut, 30) END;
    NEW.duration_min := least(greatest(coalesce(NEW.duration_min, v_min_dur), v_min_dur),
                              greatest(v_total_dur, v_min_dur));
  END IF;

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

CREATE OR REPLACE FUNCTION public.public_barber_busy_slots(
  p_barbershop_id uuid,
  p_barber_id uuid,
  p_date date
)
RETURNS TABLE(slot_time text, slot_duration int)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.time, coalesce(a.duration_min, 30)
    FROM public.appointments a
   WHERE a.barbershop_id = p_barbershop_id
     AND a.barber_id IS NOT DISTINCT FROM p_barber_id
     AND a.date = p_date
     AND a.status <> 'cancelled';
$$;

GRANT EXECUTE ON FUNCTION public.public_barber_busy_slots(uuid, uuid, date) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_public_no_barber_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.barber_id IS NOT NULL OR NEW.status = 'cancelled'
     OR coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') <> 'anon' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('no-barber:' || NEW.barbershop_id::text || ':' || NEW.date::text));
  IF EXISTS (
    SELECT 1 FROM public.appointments a
     WHERE a.barbershop_id = NEW.barbershop_id
       AND a.barber_id IS NULL
       AND a.status <> 'cancelled'
       AND a.date = NEW.date
       AND public.appointment_time_range(a.date, a.time, a.duration_min)
           && public.appointment_time_range(NEW.date, NEW.time, NEW.duration_min)
  ) THEN
    RAISE EXCEPTION 'Esse horário acabou de ser reservado.' USING ERRCODE = 'exclusion_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_public_no_barber_overlap ON public.appointments;
CREATE TRIGGER trg_public_no_barber_overlap
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_public_no_barber_overlap();
