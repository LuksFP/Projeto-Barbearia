-- ============================================================
-- RLS: políticas de write para o dashboard + trial_ends_at
-- ============================================================

-- ── Garante RLS habilitado em todas as tabelas ───────────────
ALTER TABLE public.saas_accounts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbershops         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbershop_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments        ENABLE ROW LEVEL SECURITY;

-- ── saas_accounts ────────────────────────────────────────────

-- Owner lê a própria conta
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saas_accounts' AND policyname='owner_read_own_account') THEN
    CREATE POLICY owner_read_own_account ON public.saas_accounts
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

-- Owner atualiza a própria conta (plan, status etc via webhook admin client —
-- este policy cobre chamadas do frontend como activatePlan)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='saas_accounts' AND policyname='owner_update_own_account') THEN
    CREATE POLICY owner_update_own_account ON public.saas_accounts
      FOR UPDATE USING (user_id = auth.uid());
  END IF;
END $$;

-- ── Helper: barbershop pertence ao usuário ───────────────────
-- Reutilizado em todas as tabelas com barbershop_id

-- ── barbershops ──────────────────────────────────────────────

-- Owner lê a própria barbearia (inclui campos internos não expostos publicamente)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='barbershops' AND policyname='owner_read_own_barbershop') THEN
    CREATE POLICY owner_read_own_barbershop ON public.barbershops
      FOR SELECT USING (
        saas_account_id IN (
          SELECT id FROM public.saas_accounts WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Owner atualiza a própria barbearia (Personalizar, Configurações)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='barbershops' AND policyname='owner_update_own_barbershop') THEN
    CREATE POLICY owner_update_own_barbershop ON public.barbershops
      FOR UPDATE USING (
        saas_account_id IN (
          SELECT id FROM public.saas_accounts WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ── services ─────────────────────────────────────────────────

-- Owner lê todos os serviços da própria barbearia (inclui inativos)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='services' AND policyname='owner_read_own_services') THEN
    CREATE POLICY owner_read_own_services ON public.services
      FOR SELECT USING (
        barbershop_id IN (
          SELECT b.id FROM public.barbershops b
          JOIN public.saas_accounts sa ON sa.id = b.saas_account_id
          WHERE sa.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Owner cria serviços
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='services' AND policyname='owner_insert_service') THEN
    CREATE POLICY owner_insert_service ON public.services
      FOR INSERT WITH CHECK (
        barbershop_id IN (
          SELECT b.id FROM public.barbershops b
          JOIN public.saas_accounts sa ON sa.id = b.saas_account_id
          WHERE sa.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Owner edita serviços
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='services' AND policyname='owner_update_service') THEN
    CREATE POLICY owner_update_service ON public.services
      FOR UPDATE USING (
        barbershop_id IN (
          SELECT b.id FROM public.barbershops b
          JOIN public.saas_accounts sa ON sa.id = b.saas_account_id
          WHERE sa.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Owner deleta/desativa serviços
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='services' AND policyname='owner_delete_service') THEN
    CREATE POLICY owner_delete_service ON public.services
      FOR DELETE USING (
        barbershop_id IN (
          SELECT b.id FROM public.barbershops b
          JOIN public.saas_accounts sa ON sa.id = b.saas_account_id
          WHERE sa.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ── barbershop_members ───────────────────────────────────────

-- Owner lê todos os membros (inclui inativos — necessário para o dashboard)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='barbershop_members' AND policyname='owner_read_all_members') THEN
    CREATE POLICY owner_read_all_members ON public.barbershop_members
      FOR SELECT USING (
        barbershop_id IN (
          SELECT b.id FROM public.barbershops b
          JOIN public.saas_accounts sa ON sa.id = b.saas_account_id
          WHERE sa.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Owner adiciona membros
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='barbershop_members' AND policyname='owner_insert_member') THEN
    CREATE POLICY owner_insert_member ON public.barbershop_members
      FOR INSERT WITH CHECK (
        barbershop_id IN (
          SELECT b.id FROM public.barbershops b
          JOIN public.saas_accounts sa ON sa.id = b.saas_account_id
          WHERE sa.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Owner edita membros (nome, especialidade, bio, role, active)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='barbershop_members' AND policyname='owner_update_member') THEN
    CREATE POLICY owner_update_member ON public.barbershop_members
      FOR UPDATE USING (
        barbershop_id IN (
          SELECT b.id FROM public.barbershops b
          JOIN public.saas_accounts sa ON sa.id = b.saas_account_id
          WHERE sa.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ── memberships ──────────────────────────────────────────────

-- Owner lê todas as memberships (inclui inativas)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='memberships' AND policyname='owner_read_own_memberships') THEN
    CREATE POLICY owner_read_own_memberships ON public.memberships
      FOR SELECT USING (
        barbershop_id IN (
          SELECT b.id FROM public.barbershops b
          JOIN public.saas_accounts sa ON sa.id = b.saas_account_id
          WHERE sa.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Owner cria memberships
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='memberships' AND policyname='owner_insert_membership') THEN
    CREATE POLICY owner_insert_membership ON public.memberships
      FOR INSERT WITH CHECK (
        barbershop_id IN (
          SELECT b.id FROM public.barbershops b
          JOIN public.saas_accounts sa ON sa.id = b.saas_account_id
          WHERE sa.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Owner atualiza memberships
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='memberships' AND policyname='owner_update_membership') THEN
    CREATE POLICY owner_update_membership ON public.memberships
      FOR UPDATE USING (
        barbershop_id IN (
          SELECT b.id FROM public.barbershops b
          JOIN public.saas_accounts sa ON sa.id = b.saas_account_id
          WHERE sa.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ── clients ──────────────────────────────────────────────────

-- Owner lê clientes da própria barbearia
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='clients' AND policyname='owner_read_own_clients') THEN
    CREATE POLICY owner_read_own_clients ON public.clients
      FOR SELECT USING (
        barbershop_id IN (
          SELECT b.id FROM public.barbershops b
          JOIN public.saas_accounts sa ON sa.id = b.saas_account_id
          WHERE sa.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Owner insere clientes (dashboard)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='clients' AND policyname='owner_insert_client') THEN
    CREATE POLICY owner_insert_client ON public.clients
      FOR INSERT WITH CHECK (
        barbershop_id IN (
          SELECT b.id FROM public.barbershops b
          JOIN public.saas_accounts sa ON sa.id = b.saas_account_id
          WHERE sa.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Owner atualiza clientes (membership_type, total_visits etc)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='clients' AND policyname='owner_update_client') THEN
    CREATE POLICY owner_update_client ON public.clients
      FOR UPDATE USING (
        barbershop_id IN (
          SELECT b.id FROM public.barbershops b
          JOIN public.saas_accounts sa ON sa.id = b.saas_account_id
          WHERE sa.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ── trial_ends_at ────────────────────────────────────────────

-- Adiciona coluna de expiração do trial (não-destrutivo: DEFAULT NULL)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saas_accounts' AND column_name = 'trial_ends_at'
  ) THEN
    ALTER TABLE public.saas_accounts
      ADD COLUMN trial_ends_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Atualiza a RPC create_saas_account para preencher trial_ends_at = now() + 7 dias
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
    'trial',
    now(),
    now() + interval '7 days'
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

GRANT EXECUTE ON FUNCTION public.create_saas_account TO authenticated;
