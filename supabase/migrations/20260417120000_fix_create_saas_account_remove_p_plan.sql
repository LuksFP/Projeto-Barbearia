-- Remove p_plan do create_saas_account.
-- O plano não é definido no cadastro — é ativado pelo webhook do Stripe.
-- A conta nasce com plan = NULL e plan_status = 'pending'.

DROP FUNCTION IF EXISTS public.create_saas_account(uuid, text, text, text, text, text);

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
    'pending',
    NULL,
    NULL
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

GRANT EXECUTE ON FUNCTION public.create_saas_account(uuid, text, text, text, text) TO authenticated;
