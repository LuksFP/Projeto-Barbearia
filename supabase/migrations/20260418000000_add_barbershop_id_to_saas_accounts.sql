-- Adiciona barbershop_id em saas_accounts para evitar lookup por slug a cada login.
-- Reduz de 3 roundtrips sequenciais para 2 no carregamento do dashboard.

ALTER TABLE public.saas_accounts
  ADD COLUMN IF NOT EXISTS barbershop_id uuid REFERENCES public.barbershops(id) ON DELETE SET NULL;

-- Preenche registros existentes via join
UPDATE public.saas_accounts sa
SET barbershop_id = b.id
FROM public.barbershops b
WHERE b.saas_account_id = sa.id
  AND sa.barbershop_id IS NULL;

-- Atualiza RPC para armazenar o barbershop_id atomicamente no cadastro
CREATE OR REPLACE FUNCTION public.create_saas_account(
  p_user_id    uuid,
  p_owner_name text,
  p_barb_name  text,
  p_barb_slug  text,
  p_embed_key  text,
  p_plan       text DEFAULT NULL
)
RETURNS public.saas_accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account       public.saas_accounts;
  v_barbershop_id uuid;
BEGIN
  INSERT INTO public.saas_accounts (
    user_id, owner_name, barbershop_name, barbershop_slug,
    plan, plan_status, plan_started_at
  ) VALUES (
    p_user_id, p_owner_name, p_barb_name, p_barb_slug,
    NULL, 'pending', now()
  )
  RETURNING * INTO v_account;

  INSERT INTO public.barbershops (
    saas_account_id, name, slug, embed_key,
    primary_color, accent_color, logo_text, site_type,
    tagline, description, phone, whatsapp,
    address, city, state, instagram
  ) VALUES (
    v_account.id, p_barb_name, p_barb_slug, p_embed_key,
    '#C9A84C', '#8B6914',
    upper(left(regexp_replace(p_barb_name, '\s+', '', 'g'), 8)),
    'generic', 'Barbearia com agenda online.',
    '', '', '', '', '', '', ''
  )
  RETURNING id INTO v_barbershop_id;

  UPDATE public.saas_accounts
  SET barbershop_id = v_barbershop_id
  WHERE id = v_account.id
  RETURNING * INTO v_account;

  RETURN v_account;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_saas_account(uuid, text, text, text, text, text) TO authenticated;
