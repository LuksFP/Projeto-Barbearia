-- Transferir horário (outro dia, hora ou barbeiro) numa operação só.
-- Cliente fixo: só aquele dia muda. O horário movido sai da série e o dia
-- antigo ganha um registro cancelado ("transferido"); sem ele,
-- ensure_fixed_appointments recriaria o horário antigo.
-- SECURITY INVOKER: valem as mesmas regras de acesso da equipe (RLS).
-- A trava appointments_no_overlap_per_barber recusa destino ocupado (23P01)
-- e desfaz tudo.

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS transferred_to text;

CREATE OR REPLACE FUNCTION public.transfer_appointment(
  p_id uuid,
  p_date date,
  p_time text,
  p_barber_id uuid
)
RETURNS public.appointments
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_old public.appointments%ROWTYPE;
  v_new public.appointments%ROWTYPE;
  v_name text;
BEGIN
  SELECT * INTO v_old FROM public.appointments WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agendamento não encontrado' USING ERRCODE = 'no_data_found';
  END IF;
  IF v_old.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Só dá pra transferir horário em aberto' USING ERRCODE = 'check_violation';
  END IF;
  IF p_date IS NULL OR p_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN
    RAISE EXCEPTION 'Escolha um dia de hoje em diante' USING ERRCODE = 'check_violation';
  END IF;
  IF p_time IS NULL OR p_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN
    RAISE EXCEPTION 'Horário inválido' USING ERRCODE = 'check_violation';
  END IF;

  IF p_barber_id IS NOT NULL THEN
    SELECT name INTO v_name FROM public.barbershop_members
     WHERE id = p_barber_id AND barbershop_id = v_old.barbershop_id AND active;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Barbeiro não encontrado nessa barbearia' USING ERRCODE = 'check_violation';
    END IF;
  ELSIF v_old.barber_id IS NOT NULL THEN
    RAISE EXCEPTION 'Escolha o barbeiro' USING ERRCODE = 'check_violation';
  ELSE
    v_name := v_old.barber_name;
  END IF;

  IF p_date = v_old.date AND p_time = left(v_old.time, 5) AND p_barber_id IS NOT DISTINCT FROM v_old.barber_id THEN
    RETURN v_old;
  END IF;

  UPDATE public.appointments
     SET date = p_date, time = p_time, barber_id = p_barber_id, barber_name = v_name,
         reminded_at = NULL,  -- a confirmação mandada antes era do horário antigo
         recurrence_id = NULL, recurrence_every_days = NULL
   WHERE id = p_id
  RETURNING * INTO v_new;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sem permissão pra alterar esse horário' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_old.recurrence_id IS NOT NULL THEN
    -- Copia o horário antigo inteiro (notes inclusive): ensure_fixed_appointments
    -- usa o registro mais recente da série como molde dos próximos
    INSERT INTO public.appointments (
      barbershop_id, client_name, client_phone, client_email, service_id, service_ids, service_name,
      service_category, barber_id, barber_name, date, time, duration_min, price, notes, status,
      recurrence_id, recurrence_every_days, transferred_to
    ) VALUES (
      v_old.barbershop_id, v_old.client_name, v_old.client_phone, v_old.client_email, v_old.service_id,
      v_old.service_ids, v_old.service_name, v_old.service_category, v_old.barber_id, v_old.barber_name,
      v_old.date, v_old.time, v_old.duration_min, v_old.price, v_old.notes, 'cancelled',
      v_old.recurrence_id, v_old.recurrence_every_days,
      to_char(p_date, 'DD/MM') || ' às ' || p_time || CASE WHEN p_barber_id IS NULL THEN '' ELSE ' com ' || v_name END
    );
  END IF;

  RETURN v_new;
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_appointment(uuid, date, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transfer_appointment(uuid, date, text, uuid) TO authenticated;
