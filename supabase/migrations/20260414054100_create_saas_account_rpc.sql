-- RPC atômica: cria saas_account + barbershop em uma transação.
-- Chamada por saasAccountRepository.signup() no frontend.
-- SECURITY DEFINER para contornar RLS durante o cadastro inicial.

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
  -- Cria a conta SaaS (dono da barbearia que paga a plataforma)
  INSERT INTO public.saas_accounts (
    user_id,
    owner_name,
    barbershop_name,
    barbershop_slug,
    plan,
    plan_status,
    plan_started_at
  ) VALUES (
    p_user_id,
    p_owner_name,
    p_barb_name,
    p_barb_slug,
    NULL,
    'trial',
    now()
  )
  RETURNING * INTO v_account;

  -- Cria a barbearia com valores padrão editáveis depois
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

-- Apenas usuários autenticados podem chamar (o Supabase garante isso no signup)
GRANT EXECUTE ON FUNCTION public.create_saas_account TO authenticated;

-- Políticas RLS mínimas para o produto funcionar
-- (ajuste conforme as policies existentes no seu projeto)

-- Permite leitura pública de barbearias ativas (site público /b/:slug)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'barbershops' AND policyname = 'public_read_active_barbershops'
  ) THEN
    CREATE POLICY public_read_active_barbershops ON public.barbershops
      FOR SELECT USING (active = true);
  END IF;
END $$;

-- Permite leitura pública de serviços ativos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'services' AND policyname = 'public_read_active_services'
  ) THEN
    CREATE POLICY public_read_active_services ON public.services
      FOR SELECT USING (active = true);
  END IF;
END $$;

-- Permite leitura pública de membros da equipe ativos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'barbershop_members' AND policyname = 'public_read_active_members'
  ) THEN
    CREATE POLICY public_read_active_members ON public.barbershop_members
      FOR SELECT USING (active = true);
  END IF;
END $$;

-- Permite leitura pública de memberships ativas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'memberships' AND policyname = 'public_read_active_memberships'
  ) THEN
    CREATE POLICY public_read_active_memberships ON public.memberships
      FOR SELECT USING (active = true);
  END IF;
END $$;

-- Permite inserção anônima de agendamentos (booking público no site da barbearia)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'appointments' AND policyname = 'public_insert_appointments'
  ) THEN
    CREATE POLICY public_insert_appointments ON public.appointments
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;
