-- Telefone do cliente guardado só com dígitos.
--
-- A ficha é única por (barbershop_id, phone), mas o telefone chegava do jeito
-- que o cliente digitou: "(13) 99000-0003" e "13990000003" viravam duas fichas
-- (visto em produção em 2026-11-10). Agora todo INSERT/UPDATE em clients
-- normaliza o telefone pra dígitos antes de gravar, e o gatilho que cria a
-- ficha a partir do agendamento faz o mesmo. As fichas que já existem são
-- normalizadas aqui (não havia duplicata por dígitos em produção).
-- O painel formata na tela (formatPhoneBR em src/lib/phone.ts).

CREATE OR REPLACE FUNCTION public.phone_digits(p text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT nullif(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '')
$$;

CREATE OR REPLACE FUNCTION public.normalize_client_phone()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.phone := coalesce(public.phone_digits(NEW.phone), NEW.phone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_client_phone ON public.clients;
CREATE TRIGGER trg_normalize_client_phone
  BEFORE INSERT OR UPDATE OF phone ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.normalize_client_phone();

-- Fichas antigas: só as que não colidem com outra já normalizada.
UPDATE public.clients c
   SET phone = public.phone_digits(c.phone)
 WHERE c.phone IS DISTINCT FROM public.phone_digits(c.phone)
   AND public.phone_digits(c.phone) IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.clients o
      WHERE o.barbershop_id = c.barbershop_id
        AND o.id <> c.id
        AND o.phone = public.phone_digits(c.phone)
   );

-- Ficha a partir do agendamento: procura pelos dígitos.
CREATE OR REPLACE FUNCTION public.sync_client_from_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_phone text := public.phone_digits(new.client_phone);
BEGIN
  IF v_phone IS NULL THEN
    RETURN new;
  END IF;

  INSERT INTO public.clients (barbershop_id, name, phone, email, notes)
  VALUES (new.barbershop_id, new.client_name, v_phone, new.client_email, nullif(new.notes, ''))
  ON CONFLICT (barbershop_id, phone) DO UPDATE
    SET name  = excluded.name,
        email = coalesce(excluded.email, public.clients.email),
        notes = CASE
          WHEN coalesce(excluded.notes, '') = '' THEN public.clients.notes
          WHEN coalesce(public.clients.notes, '') = '' THEN excluded.notes
          WHEN position(excluded.notes IN public.clients.notes) > 0 THEN public.clients.notes
          ELSE public.clients.notes || E'\n' || excluded.notes
        END;

  RETURN new;
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_client_phone() FROM PUBLIC;
