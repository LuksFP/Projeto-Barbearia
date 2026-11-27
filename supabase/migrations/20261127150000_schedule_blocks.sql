-- Folgas e bloqueios: dia da semana fechado, pausa que se repete (almoço) e
-- bloqueio por datas (feriado, férias, médico). Uma tabela só:
--   barber_id NULL        = barbearia toda
--   weekdays preenchido   = repete toda semana (0 = domingo)
--   date_from..date_to    = vale só nessas datas
--   start/end NULL        = dia inteiro
-- Dono/admin mexe em qualquer agenda; barbeiro só na própria.
-- O que já estava marcado NÃO é cancelado: o painel mostra pra equipe resolver.

CREATE TABLE IF NOT EXISTS public.schedule_blocks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  barber_id     uuid REFERENCES public.barbershop_members(id) ON DELETE CASCADE,
  weekdays      smallint[],
  date_from     date,
  date_to       date,
  start_time    text,
  end_time      text,
  reason        text NOT NULL DEFAULT '' CHECK (char_length(reason) <= 80),
  created_by    uuid DEFAULT auth.uid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT schedule_blocks_when CHECK (
    (weekdays IS NOT NULL AND date_from IS NULL AND date_to IS NULL
       AND cardinality(weekdays) BETWEEN 1 AND 7 AND weekdays <@ ARRAY[0,1,2,3,4,5,6]::smallint[])
    OR (weekdays IS NULL AND date_from IS NOT NULL AND date_to IS NOT NULL
       AND date_to >= date_from AND date_to - date_from <= 366)
  ),
  CONSTRAINT schedule_blocks_hours CHECK (
    (start_time IS NULL AND end_time IS NULL)
    OR coalesce(start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        AND end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
        AND end_time > start_time, false)
  )
);
CREATE INDEX IF NOT EXISTS schedule_blocks_shop_idx ON public.schedule_blocks (barbershop_id);

ALTER TABLE public.schedule_blocks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.schedule_blocks FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.schedule_blocks TO authenticated;

-- Quem pode criar/apagar: dono/admin (tudo da barbearia) ou o próprio barbeiro
-- (só linhas com o id dele, nunca a barbearia toda).
CREATE OR REPLACE FUNCTION public.can_manage_schedule_block(p_barbershop_id uuid, p_barber_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_barbershop_id IN (SELECT public.my_admin_barbershop_ids()) THEN
      p_barber_id IS NULL OR EXISTS (
        SELECT 1 FROM public.barbershop_members m
         WHERE m.id = p_barber_id AND m.barbershop_id = p_barbershop_id)
    ELSE EXISTS (
      SELECT 1 FROM public.barbershop_members m
       WHERE m.id = p_barber_id AND m.barbershop_id = p_barbershop_id
         AND m.user_id = auth.uid() AND m.active)
  END;
$$;
REVOKE ALL ON FUNCTION public.can_manage_schedule_block(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_schedule_block(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "team reads schedule_blocks" ON public.schedule_blocks;
CREATE POLICY "team reads schedule_blocks" ON public.schedule_blocks
  FOR SELECT TO authenticated USING (barbershop_id IN (SELECT public.my_barbershop_ids()));
DROP POLICY IF EXISTS "manage inserts schedule_blocks" ON public.schedule_blocks;
CREATE POLICY "manage inserts schedule_blocks" ON public.schedule_blocks
  FOR INSERT TO authenticated WITH CHECK (public.can_manage_schedule_block(barbershop_id, barber_id));
DROP POLICY IF EXISTS "manage deletes schedule_blocks" ON public.schedule_blocks;
CREATE POLICY "manage deletes schedule_blocks" ON public.schedule_blocks
  FOR DELETE TO authenticated USING (public.can_manage_schedule_block(barbershop_id, barber_id));

-- Períodos bloqueados de um barbeiro num dia. É o que o site vê: sem motivo.
CREATE OR REPLACE FUNCTION public.public_schedule_blocks(p_barbershop_id uuid, p_barber_id uuid, p_date date)
RETURNS TABLE(slot_time text, slot_duration int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(k.start_time, '00:00'),
         CASE WHEN k.start_time IS NULL THEN 2880
              ELSE (extract(epoch FROM (k.end_time::time - k.start_time::time)) / 60)::int END
    FROM public.schedule_blocks k
   WHERE k.barbershop_id = p_barbershop_id
     AND (k.barber_id IS NULL OR k.barber_id = p_barber_id)
     AND CASE WHEN k.weekdays IS NOT NULL
              THEN extract(dow FROM p_date)::smallint = ANY (k.weekdays)
              ELSE p_date BETWEEN k.date_from AND k.date_to END;
$$;
GRANT EXECUTE ON FUNCTION public.public_schedule_blocks(uuid, uuid, date) TO anon, authenticated;

-- Ocupados = agendamentos + clientes fixos + bloqueios. Assim até uma aba antiga
-- do site já mostra o horário como indisponível.
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
  SELECT h.slot_time, h.slot_duration FROM public.fixed_slot_hits(p_barbershop_id, p_barber_id, p_date) h
  UNION ALL
  SELECT k.slot_time, k.slot_duration FROM public.public_schedule_blocks(p_barbershop_id, p_barber_id, p_date) k;
$$;
GRANT EXECUTE ON FUNCTION public.public_barber_busy_slots(uuid, uuid, date) TO anon, authenticated;

-- Ninguém (site ou painel) põe horário dentro de um bloqueio. Só confere quando
-- o horário NASCE, MUDA de dia/hora/barbeiro ou REABRE depois de cancelado:
-- concluir ou marcar falta num horário que já estava lá continua livre.
-- 23P01 = o site já trata como "reservado" e ensure_fixed_appointments pula.
CREATE OR REPLACE FUNCTION public.enforce_schedule_block()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status <> 'cancelled'
       AND NEW.date = OLD.date AND NEW.time = OLD.time
       AND NEW.barber_id IS NOT DISTINCT FROM OLD.barber_id
       AND NEW.duration_min IS NOT DISTINCT FROM OLD.duration_min THEN
      RETURN NEW;
    END IF;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.public_schedule_blocks(NEW.barbershop_id, NEW.barber_id, NEW.date) k
     WHERE public.appointment_time_range(NEW.date, k.slot_time, k.slot_duration)
           && public.appointment_time_range(NEW.date, NEW.time, NEW.duration_min)
  ) THEN
    RAISE EXCEPTION 'Esse horário está bloqueado na agenda.'
      USING ERRCODE = 'exclusion_violation', HINT = 'schedule_block';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_schedule_block() FROM PUBLIC, anon, authenticated;

-- "zz": roda depois de validate_appointment_insert, que define a duração.
DROP TRIGGER IF EXISTS trg_zz_schedule_block ON public.appointments;
CREATE TRIGGER trg_zz_schedule_block
  BEFORE INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_schedule_block();
