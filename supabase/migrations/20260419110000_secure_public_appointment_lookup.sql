-- Endurece a consulta pública de agendamentos e move a avaliação pública para RPC validada.

DROP FUNCTION IF EXISTS public.search_appointments_by_contact(text, text);

CREATE OR REPLACE FUNCTION public.search_appointments_by_contact(
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  service_name text,
  appointment_date date,
  appointment_time text,
  status text,
  barber_name text,
  rating integer,
  review text,
  payment_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '');
BEGIN
  IF v_email IS NULL AND v_phone IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.service_name,
    a.date AS appointment_date,
    a.time AS appointment_time,
    a.status,
    a.barber_name,
    a.rating,
    a.review,
    a.payment_status
  FROM public.appointments a
  WHERE
    (v_email IS NOT NULL AND lower(coalesce(a.client_email, '')) = v_email)
    OR (
      v_phone IS NOT NULL
      AND regexp_replace(a.client_phone, '\D', '', 'g') = v_phone
    )
  ORDER BY a.date DESC, a.time DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_appointments_by_contact(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.search_appointments_by_contact(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_public_appointment_review(
  p_appointment_id uuid,
  p_rating integer,
  p_review text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  rating integer,
  review text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '');
BEGIN
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Avaliação inválida.';
  END IF;

  IF v_email IS NULL AND v_phone IS NULL THEN
    RAISE EXCEPTION 'Informe email ou telefone.';
  END IF;

  RETURN QUERY
  UPDATE public.appointments a
  SET
    rating = p_rating,
    review = nullif(trim(coalesce(p_review, '')), '')
  WHERE
    a.id = p_appointment_id
    AND a.status IN ('done', 'completed')
    AND a.rating IS NULL
    AND (
      (v_email IS NOT NULL AND lower(coalesce(a.client_email, '')) = v_email)
      OR (
        v_phone IS NOT NULL
        AND regexp_replace(a.client_phone, '\D', '', 'g') = v_phone
      )
    )
  RETURNING a.id, a.rating, a.review;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agendamento não encontrado ou avaliação já enviada.';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_public_appointment_review(uuid, integer, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_public_appointment_review(uuid, integer, text, text, text) TO authenticated;
