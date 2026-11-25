-- Horário de trabalho por barbeiro. O admin da barbearia (ex.: Everton, 09–19)
-- trava o expediente de cada barbeiro (ex.: Lucas só começa às 10). NULL = segue
-- o horário da barbearia. Só dono/admin altera (policy "admin can manage team").

ALTER TABLE public.barbershop_members
  ADD COLUMN IF NOT EXISTS work_start text,
  ADD COLUMN IF NOT EXISTS work_end   text;

ALTER TABLE public.barbershop_members
  DROP CONSTRAINT IF EXISTS barbershop_members_work_hours_check;
ALTER TABLE public.barbershop_members
  ADD CONSTRAINT barbershop_members_work_hours_check CHECK (
    (work_start IS NULL AND work_end IS NULL)
    OR (work_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND work_end ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
  );

-- Site público passa a receber o horário do barbeiro.
DROP FUNCTION IF EXISTS public.public_barbershop_team(uuid);
CREATE FUNCTION public.public_barbershop_team(p_barbershop_id uuid)
RETURNS TABLE (
  id uuid, barbershop_id uuid, name text, bio text, specialty text,
  avatar text, active boolean, cut_duration_minutes integer,
  work_start text, work_end text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.barbershop_id, m.name::text, m.bio::text, m.specialty::text,
         m.avatar::text, m.active, m.cut_duration_minutes::integer,
         m.work_start, m.work_end
  FROM public.barbershop_members m
  JOIN public.barbershops b ON b.id = m.barbershop_id AND b.active
  WHERE m.barbershop_id = p_barbershop_id AND m.active
  ORDER BY m.joined_at
$$;
REVOKE ALL ON FUNCTION public.public_barbershop_team(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_barbershop_team(uuid) TO anon, authenticated, service_role;

-- Banco recusa agendamento do site fora do expediente do barbeiro.
CREATE OR REPLACE FUNCTION public.enforce_barber_work_hours()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role  text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
  v_ws    text;
  v_we    text;
  v_start int;
  v_end   int;
  v_at    int;
BEGIN
  IF v_role <> 'anon' OR NEW.barber_id IS NULL OR NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  SELECT m.work_start, m.work_end INTO v_ws, v_we
    FROM public.barbershop_members m
   WHERE m.id = NEW.barber_id AND m.barbershop_id = NEW.barbershop_id;
  IF v_ws IS NULL OR v_we IS NULL THEN
    RETURN NEW;
  END IF;

  v_start := split_part(v_ws, ':', 1)::int * 60 + split_part(v_ws, ':', 2)::int;
  v_end   := split_part(v_we, ':', 1)::int * 60 + split_part(v_we, ':', 2)::int;
  IF v_end <= v_start THEN v_end := v_end + 1440; END IF;

  v_at := extract(hour from NEW.time::time)::int * 60 + extract(minute from NEW.time::time)::int;
  IF v_at < v_start AND v_end > 1440 THEN v_at := v_at + 1440; END IF;

  IF v_at < v_start OR v_at + coalesce(NEW.duration_min, 30) > v_end THEN
    RAISE EXCEPTION 'Horário fora do expediente do barbeiro' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_barber_work_hours ON public.appointments;
CREATE TRIGGER trg_enforce_barber_work_hours
  BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_barber_work_hours();
