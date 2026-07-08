-- Anti-abuse no agendamento público: limita quantos agendamentos futuros em
-- aberto um mesmo telefone pode ter por barbearia. A RLS já trava os CAMPOS
-- (só 'pending', sem pagamento forjado); isto trava o VOLUME (bot floodando).
--
-- Só se aplica ao booking público (anon, auth.uid() IS NULL). Dono/membro
-- inserindo pela agenda interna (autenticado) não sofre o limite.
-- Limitação conhecida: bot que troca de telefone contorna — mitigação real
-- disso seria captcha/IP (fora do escopo desta camada).

CREATE OR REPLACE FUNCTION public.enforce_public_booking_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit int := 5;   -- máx. de agendamentos futuros em aberto por telefone/barbearia
  v_open  int;
  v_phone text := regexp_replace(coalesce(NEW.client_phone, ''), '\D', '', 'g');
BEGIN
  -- Só limita booking público (anônimo). Inserts autenticados passam direto.
  IF auth.uid() IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Sem telefone válido não há como agrupar; deixa a RLS/validação cuidar.
  IF length(v_phone) < 10 THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_open
  FROM public.appointments a
  WHERE a.barbershop_id = NEW.barbershop_id
    AND regexp_replace(coalesce(a.client_phone, ''), '\D', '', 'g') = v_phone
    AND a.date >= current_date
    AND a.status IN ('pending', 'confirmed');

  IF v_open >= v_limit THEN
    RAISE EXCEPTION 'Muitos agendamentos em aberto para este telefone. Conclua ou cancele um horário antes de marcar outro.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_public_booking_limit ON public.appointments;
CREATE TRIGGER trg_enforce_public_booking_limit
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_public_booking_limit();
