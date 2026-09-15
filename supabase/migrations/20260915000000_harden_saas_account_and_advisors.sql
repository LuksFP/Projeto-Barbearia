-- 1) create_saas_account: só cria conta pro próprio usuário logado.
--    Antes recebia p_user_id de fora sem conferir, e o EXECUTE nunca tinha sido
--    tirado do PUBLIC (anon chamava via /rest/v1/rpc). Chamadores legítimos:
--    CompletarRegistro (authenticated, o próprio uid) e a EF auth-register
--    (service_role).
CREATE OR REPLACE FUNCTION public.create_saas_account(
  p_user_id    uuid,
  p_owner_name text,
  p_barb_name  text,
  p_barb_slug  text,
  p_embed_key  text
)
RETURNS public.saas_accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account public.saas_accounts;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id
     AND coalesce(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'create_saas_account: usuário não autorizado'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.saas_accounts (
    user_id,
    owner_name,
    barbershop_name,
    barbershop_slug,
    plan,
    plan_status,
    plan_started_at,
    trial_ends_at
  ) VALUES (
    p_user_id,
    p_owner_name,
    p_barb_name,
    p_barb_slug,
    NULL,
    'trial',
    now(),
    now() + interval '2 days'
  )
  RETURNING * INTO v_account;

  INSERT INTO public.barbershops (
    saas_account_id,
    name,
    slug,
    embed_key,
    primary_color,
    accent_color,
    logo_text,
    site_type,
    tagline,
    description,
    phone,
    whatsapp,
    address,
    city,
    state,
    instagram
  ) VALUES (
    v_account.id,
    p_barb_name,
    p_barb_slug,
    p_embed_key,
    '#C9A84C',
    '#8B6914',
    upper(left(regexp_replace(p_barb_name, '\s+', '', 'g'), 8)),
    'generic',
    'Barbearia com agenda online.',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  );

  RETURN v_account;
END;
$$;

REVOKE ALL ON FUNCTION public.create_saas_account(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_saas_account(uuid, text, text, text, text) TO authenticated, service_role;

-- 2) search_path fixo nas funções apontadas pelo advisor (function_search_path_mutable).
DO $$
DECLARE
  f regprocedure;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'prevent_billing_field_update',
        'my_barbershop_ids',
        'assert_barbershop_owner',
        'enforce_plan_site_type',
        'frete_log_set_updated_at'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', f);
  END LOOP;
END;
$$;

-- 3) Índice duplicado em appointments (idêntico a idx_appointments_financials).
DROP INDEX IF EXISTS public.idx_appointments_revenue;
