-- Prova social: expõe as avaliações (rating/review) de uma barbearia para o
-- site público, SEM vazar PII. anon não pode ler `appointments` direto (RLS);
-- este RPC SECURITY DEFINER retorna só o essencial e mascara o nome do cliente
-- (primeiro nome + inicial do sobrenome).
CREATE OR REPLACE FUNCTION public.public_barbershop_reviews(p_barbershop_id uuid)
RETURNS TABLE (
  rating       integer,
  review       text,
  client_label text,
  review_date  date
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.rating,
    nullif(trim(a.review), '') AS review,
    -- "João S." — primeiro nome + inicial do sobrenome (mascarado)
    trim(
      split_part(a.client_name, ' ', 1)
      || CASE
           WHEN position(' ' in trim(a.client_name)) > 0
           THEN ' ' || left(split_part(a.client_name, ' ', 2), 1) || '.'
           ELSE ''
         END
    ) AS client_label,
    a.date AS review_date
  FROM public.appointments a
  WHERE a.barbershop_id = p_barbershop_id
    AND a.rating IS NOT NULL
  ORDER BY a.date DESC, a.time DESC
  LIMIT 24;
$$;

REVOKE ALL ON FUNCTION public.public_barbershop_reviews(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.public_barbershop_reviews(uuid) TO anon, authenticated;
