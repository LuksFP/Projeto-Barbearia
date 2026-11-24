-- Cliente fixo = horário reservado. Antes, só as datas já criadas na Agenda
-- bloqueavam o site; depois da última, o horário ficava livre pra qualquer um.
-- Agora a série vira uma reserva (fixed_slots) que vale toda semana/quinzena
-- até a equipe tocar em "Parar":
--   - public_barber_busy_slots devolve também os horários reservados do dia;
--   - quem marca pelo site (anon) é recusado se cair em cima de um reservado.
-- Semana em que o horário do fixo foi CANCELADO fica livre (o barbeiro liberou).
-- O painel continua podendo marcar por cima (decisão da equipe).

CREATE TABLE IF NOT EXISTS public.fixed_slots (
  id            uuid PRIMARY KEY,                -- = appointments.recurrence_id
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  barber_id     uuid,
  anchor_date   date NOT NULL,                   -- qualquer data da série; repete de every_days em every_days
  every_days    int  NOT NULL CHECK (every_days IN (7, 14, 15, 21, 28, 30)),
  time          text NOT NULL CHECK (time ~ '^[0-2][0-9]:[0-5][0-9]'),
  duration_min  int  NOT NULL DEFAULT 30 CHECK (duration_min BETWEEN 5 AND 600),
  client_name   text NOT NULL DEFAULT '',
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  stopped_at    timestamptz
);
CREATE INDEX IF NOT EXISTS fixed_slots_shop_active_idx ON public.fixed_slots (barbershop_id, barber_id) WHERE active;

ALTER TABLE public.fixed_slots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fixed_slots FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.fixed_slots TO authenticated;
GRANT DELETE ON public.fixed_slots TO authenticated;

DROP POLICY IF EXISTS "team reads fixed_slots" ON public.fixed_slots;
CREATE POLICY "team reads fixed_slots" ON public.fixed_slots
  FOR SELECT TO authenticated USING (barbershop_id IN (SELECT public.my_barbershop_ids()));
DROP POLICY IF EXISTS "team inserts fixed_slots" ON public.fixed_slots;
CREATE POLICY "team inserts fixed_slots" ON public.fixed_slots
  FOR INSERT TO authenticated WITH CHECK (barbershop_id IN (SELECT public.my_barbershop_ids()));
DROP POLICY IF EXISTS "team updates fixed_slots" ON public.fixed_slots;
CREATE POLICY "team updates fixed_slots" ON public.fixed_slots
  FOR UPDATE TO authenticated
  USING (barbershop_id IN (SELECT public.my_barbershop_ids()))
  WITH CHECK (barbershop_id IN (SELECT public.my_barbershop_ids()));
DROP POLICY IF EXISTS "admin deletes fixed_slots" ON public.fixed_slots;
CREATE POLICY "admin deletes fixed_slots" ON public.fixed_slots
  FOR DELETE TO authenticated USING (barbershop_id IN (SELECT public.my_admin_barbershop_ids()));

-- Reservas que caem num dia: série ativa, data no ritmo, e a série ainda não
-- tem horário nesse dia (se tem e não está cancelado, o próprio horário já
-- bloqueia; se foi cancelado, o barbeiro liberou aquela semana).
CREATE OR REPLACE FUNCTION public.fixed_slot_hits(p_barbershop_id uuid, p_barber_id uuid, p_date date)
RETURNS TABLE(slot_time text, slot_duration int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.time, f.duration_min
    FROM public.fixed_slots f
   WHERE f.barbershop_id = p_barbershop_id
     AND f.barber_id IS NOT DISTINCT FROM p_barber_id
     AND f.active
     AND p_date >= f.anchor_date
     AND (p_date - f.anchor_date) % f.every_days = 0
     AND NOT EXISTS (
       SELECT 1 FROM public.appointments a
        WHERE a.recurrence_id = f.id AND a.date = p_date
     );
$$;
REVOKE ALL ON FUNCTION public.fixed_slot_hits(uuid, uuid, date) FROM PUBLIC, anon, authenticated;

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
     AND a.status <> 'cancelled'
  UNION ALL
  SELECT h.slot_time, h.slot_duration FROM public.fixed_slot_hits(p_barbershop_id, p_barber_id, p_date) h;
$$;
GRANT EXECUTE ON FUNCTION public.public_barber_busy_slots(uuid, uuid, date) TO anon, authenticated;

-- Site (anon) não marca em cima de horário reservado de cliente fixo
CREATE OR REPLACE FUNCTION public.enforce_fixed_slot_reserved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' OR NEW.barber_id IS NULL
     OR coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') <> 'anon' THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.fixed_slot_hits(NEW.barbershop_id, NEW.barber_id, NEW.date) h
     WHERE public.appointment_time_range(NEW.date, h.slot_time, h.slot_duration)
           && public.appointment_time_range(NEW.date, NEW.time, NEW.duration_min)
  ) THEN
    RAISE EXCEPTION 'Esse horário é reservado de um cliente fixo.' USING ERRCODE = 'exclusion_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fixed_slot_reserved ON public.appointments;
CREATE TRIGGER trg_fixed_slot_reserved
  BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_fixed_slot_reserved();

-- Séries que já existiam: vira reserva ativa se ainda tem horário aberto pra frente
INSERT INTO public.fixed_slots (id, barbershop_id, barber_id, anchor_date, every_days, time, duration_min, client_name, active, stopped_at)
SELECT DISTINCT ON (a.recurrence_id)
       a.recurrence_id, a.barbershop_id, a.barber_id,
       (SELECT min(m.date) FROM public.appointments m WHERE m.recurrence_id = a.recurrence_id),
       coalesce(a.recurrence_every_days, 7), left(a.time, 5), coalesce(a.duration_min, 30), a.client_name,
       open.has_open, CASE WHEN open.has_open THEN NULL ELSE now() END
  FROM public.appointments a
  CROSS JOIN LATERAL (
    SELECT EXISTS (
      SELECT 1 FROM public.appointments o
       WHERE o.recurrence_id = a.recurrence_id
         AND o.status IN ('pending', 'confirmed')
         AND o.date >= (now() AT TIME ZONE 'America/Sao_Paulo')::date
    ) AS has_open
  ) open
 WHERE a.recurrence_id IS NOT NULL
   AND coalesce(a.recurrence_every_days, 7) IN (7, 14, 15, 21, 28, 30)
 ORDER BY a.recurrence_id, a.date DESC
ON CONFLICT (id) DO NOTHING;

-- Painel abriu: cria os horários dos fixos que faltam nas próximas semanas,
-- pra o cliente aparecer no dia (Agenda/Lembretes) com o botão de WhatsApp.
-- Copia o último horário da série. Pula a data que já tem horário dela
-- (inclusive cancelado: o barbeiro liberou aquela semana) e a que bater com
-- outro horário ou cair fora do expediente. Devolve quantos criou.
CREATE OR REPLACE FUNCTION public.ensure_fixed_appointments(p_barbershop_id uuid, p_days int DEFAULT 35)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_count int := 0;
  f record;
  t public.appointments%ROWTYPE;
  d date;
BEGIN
  IF p_barbershop_id IS NULL OR p_barbershop_id NOT IN (SELECT public.my_barbershop_ids()) THEN
    RAISE EXCEPTION 'Sem acesso a essa barbearia' USING ERRCODE = 'insufficient_privilege';
  END IF;
  p_days := least(greatest(coalesce(p_days, 35), 1), 60);

  FOR f IN SELECT * FROM public.fixed_slots WHERE barbershop_id = p_barbershop_id AND active LOOP
    SELECT * INTO t FROM public.appointments WHERE recurrence_id = f.id ORDER BY date DESC LIMIT 1;
    CONTINUE WHEN NOT FOUND;
    FOR d IN
      SELECT g::date FROM generate_series(greatest(v_today, f.anchor_date), v_today + p_days, interval '1 day') g
       WHERE (g::date - f.anchor_date) % f.every_days = 0
    LOOP
      CONTINUE WHEN EXISTS (SELECT 1 FROM public.appointments WHERE recurrence_id = f.id AND date = d);
      BEGIN
        INSERT INTO public.appointments (
          barbershop_id, client_name, client_phone, client_email, service_id, service_ids, service_name,
          service_category, barber_id, barber_name, date, time, duration_min, price, notes, status,
          recurrence_id, recurrence_every_days
        ) VALUES (
          t.barbershop_id, t.client_name, t.client_phone, t.client_email, t.service_id, t.service_ids, t.service_name,
          t.service_category, t.barber_id, t.barber_name, d, f.time, f.duration_min, t.price, t.notes, 'confirmed',
          f.id, f.every_days
        );
        v_count := v_count + 1;
      EXCEPTION WHEN exclusion_violation OR check_violation OR raise_exception THEN
        NULL; -- ocupado / fora do expediente: pula essa data
      END;
    END LOOP;
  END LOOP;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_fixed_appointments(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_fixed_appointments(uuid, int) TO authenticated;
