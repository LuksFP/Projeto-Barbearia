-- Dois números que nada mantinha:
--
-- 1) clients.total_visits / clients.last_visit — nenhum gatilho gravava, então a
--    Reativação (só lista quem tem visita) ficava sempre vazia, a ficha mostrava
--    "0 visitas" e a Visão Geral "nenhum veio nos últimos 30 dias". Agora são
--    recontados dos agendamentos concluídos daquele telefone sempre que um
--    agendamento entra, muda de status/data/telefone ou sai.
--
-- 2) memberships.subscriber_count — o Clube passou a ter a lista de assinantes
--    (club_subscribers) e o contador velho ficou parado em 0. Agora é a contagem
--    de assinantes ativos daquele plano.
--
-- Acerto dos dados antigos: todas as barbearias, menos a Elegance (2f3da06c…),
-- que não se mexe à mão. Ela passa a ser atualizada pelo gatilho a partir do
-- próximo agendamento, como qualquer outra.

-- ─── 1. Visitas do cliente ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.recount_client_visits(p_barbershop_id uuid, p_phone text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.clients c
     SET total_visits = v.n,
         last_visit   = v.last
    FROM (
      SELECT count(*)::int AS n, max(a.date) AS last
        FROM public.appointments a
       WHERE a.barbershop_id = p_barbershop_id
         AND a.status = 'done'
         AND public.phone_digits(a.client_phone) = p_phone
    ) v
   WHERE c.barbershop_id = p_barbershop_id
     AND c.phone = p_phone
     AND (c.total_visits IS DISTINCT FROM v.n OR c.last_visit IS DISTINCT FROM v.last);
$$;

CREATE OR REPLACE FUNCTION public.sync_client_visits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old text;
  v_new text;
BEGIN
  IF TG_OP <> 'INSERT' THEN v_old := public.phone_digits(OLD.client_phone); END IF;
  IF TG_OP <> 'DELETE' THEN v_new := public.phone_digits(NEW.client_phone); END IF;

  IF v_new IS NOT NULL THEN
    PERFORM public.recount_client_visits(NEW.barbershop_id, v_new);
  END IF;
  IF v_old IS NOT NULL AND (TG_OP = 'DELETE' OR v_old IS DISTINCT FROM v_new OR OLD.barbershop_id <> NEW.barbershop_id) THEN
    PERFORM public.recount_client_visits(OLD.barbershop_id, v_old);
  END IF;
  RETURN NULL;
END;
$$;

-- Nome depois de trg_sync_client_from_appointment (ordem alfabética): no INSERT
-- a ficha já existe quando a contagem roda.
DROP TRIGGER IF EXISTS trg_sync_client_visits ON public.appointments;
CREATE TRIGGER trg_sync_client_visits
  AFTER INSERT OR DELETE OR UPDATE OF status, date, client_phone, barbershop_id ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.sync_client_visits();

UPDATE public.clients c
   SET total_visits = coalesce(v.n, 0),
       last_visit   = v.last
  FROM public.clients c2
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS n, max(a.date) AS last
      FROM public.appointments a
     WHERE a.barbershop_id = c2.barbershop_id
       AND a.status = 'done'
       AND public.phone_digits(a.client_phone) = c2.phone
  ) v ON true
 WHERE c.id = c2.id
   AND c.barbershop_id::text NOT LIKE '2f3da06c%';

-- ─── 2. Assinantes por plano do Clube ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.recount_membership_subscribers(p_membership_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.memberships m
     SET subscriber_count = (
       SELECT count(*)::int FROM public.club_subscribers s
        WHERE s.membership_id = p_membership_id AND s.active
     )
   WHERE m.id = p_membership_id;
$$;

CREATE OR REPLACE FUNCTION public.sync_membership_subscribers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP <> 'DELETE' AND NEW.membership_id IS NOT NULL THEN
    PERFORM public.recount_membership_subscribers(NEW.membership_id);
  END IF;
  IF TG_OP <> 'INSERT' AND OLD.membership_id IS NOT NULL
     AND (TG_OP = 'DELETE' OR OLD.membership_id IS DISTINCT FROM NEW.membership_id) THEN
    PERFORM public.recount_membership_subscribers(OLD.membership_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_membership_subscribers ON public.club_subscribers;
CREATE TRIGGER trg_sync_membership_subscribers
  AFTER INSERT OR DELETE OR UPDATE OF membership_id, active ON public.club_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.sync_membership_subscribers();

UPDATE public.memberships m
   SET subscriber_count = (
     SELECT count(*)::int FROM public.club_subscribers s
      WHERE s.membership_id = m.id AND s.active
   )
 WHERE m.barbershop_id::text NOT LIKE '2f3da06c%';

REVOKE ALL ON FUNCTION public.recount_client_visits(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_client_visits() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recount_membership_subscribers(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_membership_subscribers() FROM PUBLIC, anon, authenticated;
