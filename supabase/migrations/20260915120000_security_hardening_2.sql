-- Hardening de segurança, parte 2 (auditoria de 2026-09-15)

-- ═══ 1. Cobrança ═════════════════════════════════════════════════════════════
-- Conta e barbearia só nascem pela RPC create_saas_account (SECURITY DEFINER).
-- O INSERT direto deixava qualquer usuário recém-cadastrado criar a própria
-- conta já com plan='premium' e plan_status='active'.
DROP POLICY IF EXISTS "owner can insert own account" ON public.saas_accounts;
DROP POLICY IF EXISTS "owner can insert barbershop" ON public.barbershops;

-- Trava ampliada: além de plano/status/Stripe, trava datas de trial e
-- cancelamento e os vínculos (antes dava pra estender o trial pra 2099).
-- Decide pelo papel do JWT da requisição: cron e service_role passam.
-- (A versão anterior comparava current_setting('role') e barraria o cron.)
CREATE OR REPLACE FUNCTION public.prevent_billing_field_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
BEGIN
  IF v_role IN ('authenticated', 'anon') THEN
    IF NEW.plan                   IS DISTINCT FROM OLD.plan
    OR NEW.plan_status            IS DISTINCT FROM OLD.plan_status
    OR NEW.plan_started_at        IS DISTINCT FROM OLD.plan_started_at
    OR NEW.stripe_customer_id     IS DISTINCT FROM OLD.stripe_customer_id
    OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
    OR NEW.trial_ends_at          IS DISTINCT FROM OLD.trial_ends_at
    OR NEW.cancel_at              IS DISTINCT FROM OLD.cancel_at
    OR NEW.trial_reminder_sent_at IS DISTINCT FROM OLD.trial_reminder_sent_at
    OR NEW.barbershop_id          IS DISTINCT FROM OLD.barbershop_id
    OR NEW.user_id                IS DISTINCT FROM OLD.user_id
    THEN
      RAISE EXCEPTION 'Alteração de campos de cobrança não permitida pelo cliente'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ═══ 2. Papéis: barbeiro não tem poder de dono ═══════════════════════════════
CREATE OR REPLACE FUNCTION public.my_admin_barbershop_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id
  FROM public.barbershops b
  JOIN public.saas_accounts sa ON sa.id = b.saas_account_id
  WHERE sa.user_id = auth.uid()
  UNION
  SELECT bm.barbershop_id
  FROM public.barbershop_members bm
  WHERE bm.user_id = auth.uid()
    AND bm.active
    AND bm.role IN ('owner', 'admin')
$$;
REVOKE ALL ON FUNCTION public.my_admin_barbershop_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_admin_barbershop_ids() TO authenticated, service_role;

-- Barbearia, equipe, serviços e planos do clube: só dono/admin mexe.
DROP POLICY IF EXISTS "owner/admin can update barbershop" ON public.barbershops;
CREATE POLICY "admin can update barbershop" ON public.barbershops
  FOR UPDATE TO authenticated
  USING (id IN (SELECT public.my_admin_barbershop_ids()))
  WITH CHECK (id IN (SELECT public.my_admin_barbershop_ids()));

DROP POLICY IF EXISTS "owner/admin can manage team" ON public.barbershop_members;
CREATE POLICY "admin can manage team" ON public.barbershop_members
  FOR ALL TO authenticated
  USING (barbershop_id IN (SELECT public.my_admin_barbershop_ids()))
  WITH CHECK (barbershop_id IN (SELECT public.my_admin_barbershop_ids()));

DROP POLICY IF EXISTS "owner/admin can manage services" ON public.services;
CREATE POLICY "admin can manage services" ON public.services
  FOR ALL TO authenticated
  USING (barbershop_id IN (SELECT public.my_admin_barbershop_ids()))
  WITH CHECK (barbershop_id IN (SELECT public.my_admin_barbershop_ids()));

DROP POLICY IF EXISTS "owner/admin can manage memberships" ON public.memberships;
CREATE POLICY "admin can manage memberships" ON public.memberships
  FOR ALL TO authenticated
  USING (barbershop_id IN (SELECT public.my_admin_barbershop_ids()))
  WITH CHECK (barbershop_id IN (SELECT public.my_admin_barbershop_ids()));

-- Clientes, assinaturas de cliente e agendamentos: a equipe cria e edita,
-- só dono/admin apaga. (INSERT de agendamento já é owner_insert_appointment.)
DROP POLICY IF EXISTS "members can manage clients" ON public.clients;
CREATE POLICY "members can insert clients" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (barbershop_id IN (SELECT public.my_barbershop_ids()));
CREATE POLICY "members can update clients" ON public.clients
  FOR UPDATE TO authenticated
  USING (barbershop_id IN (SELECT public.my_barbershop_ids()))
  WITH CHECK (barbershop_id IN (SELECT public.my_barbershop_ids()));
CREATE POLICY "admin can delete clients" ON public.clients
  FOR DELETE TO authenticated
  USING (barbershop_id IN (SELECT public.my_admin_barbershop_ids()));

DROP POLICY IF EXISTS "members can manage client_memberships" ON public.client_memberships;
CREATE POLICY "members can insert client_memberships" ON public.client_memberships
  FOR INSERT TO authenticated
  WITH CHECK (barbershop_id IN (SELECT public.my_barbershop_ids()));
CREATE POLICY "members can update client_memberships" ON public.client_memberships
  FOR UPDATE TO authenticated
  USING (barbershop_id IN (SELECT public.my_barbershop_ids()))
  WITH CHECK (barbershop_id IN (SELECT public.my_barbershop_ids()));
CREATE POLICY "admin can delete client_memberships" ON public.client_memberships
  FOR DELETE TO authenticated
  USING (barbershop_id IN (SELECT public.my_admin_barbershop_ids()));

DROP POLICY IF EXISTS "members can manage appointments" ON public.appointments;
CREATE POLICY "members can update appointments" ON public.appointments
  FOR UPDATE TO authenticated
  USING (barbershop_id IN (SELECT public.my_barbershop_ids()))
  WITH CHECK (barbershop_id IN (SELECT public.my_barbershop_ids()));
CREATE POLICY "admin can delete appointments" ON public.appointments
  FOR DELETE TO authenticated
  USING (barbershop_id IN (SELECT public.my_admin_barbershop_ids()));

-- ═══ 3. Site público: só colunas seguras ═════════════════════════════════════
-- Antes qualquer visitante lia a linha inteira (chave PIX, embed_key, conta
-- SaaS, comissão e user_id dos barbeiros). Agora o site lê por RPC.
DROP POLICY IF EXISTS "public_read_active_barbershops" ON public.barbershops;
DROP POLICY IF EXISTS "public_read_active_members" ON public.barbershop_members;

CREATE OR REPLACE FUNCTION public.public_barbershop_by_slug(p_slug text)
RETURNS TABLE (
  id uuid, slug text, name text, tagline text, description text,
  phone text, whatsapp text, address text, city text, state text, instagram text,
  primary_color text, accent_color text, logo_text text, cover_image text,
  site_type text, custom_domain text, active boolean,
  cancellation_policy jsonb, open_time text, close_time text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.slug::text, b.name::text, b.tagline::text, b.description::text,
         b.phone::text, b.whatsapp::text, b.address::text, b.city::text, b.state::text, b.instagram::text,
         b.primary_color::text, b.accent_color::text, b.logo_text::text, b.cover_image::text,
         b.site_type::text, b.custom_domain::text, b.active,
         b.cancellation_policy::jsonb, b.open_time::text, b.close_time::text
  FROM public.barbershops b
  WHERE b.slug = p_slug AND b.active
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.public_barbershop_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_barbershop_by_slug(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.public_barbershop_team(p_barbershop_id uuid)
RETURNS TABLE (
  id uuid, barbershop_id uuid, name text, bio text, specialty text,
  avatar text, active boolean, cut_duration_minutes integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.barbershop_id, m.name::text, m.bio::text, m.specialty::text,
         m.avatar::text, m.active, m.cut_duration_minutes::integer
  FROM public.barbershop_members m
  JOIN public.barbershops b ON b.id = m.barbershop_id AND b.active
  WHERE m.barbershop_id = p_barbershop_id AND m.active
  ORDER BY m.joined_at
$$;
REVOKE ALL ON FUNCTION public.public_barbershop_team(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_barbershop_team(uuid) TO anon, authenticated, service_role;

-- Permissões do anon no mínimo necessário. As policies anônimas de
-- agendamento/serviços/planos checam barbershops.id/active numa subquery.
REVOKE ALL ON public.barbershops FROM anon;
GRANT SELECT (id, active) ON public.barbershops TO anon;
REVOKE ALL ON public.barbershop_members FROM anon;
REVOKE ALL ON public.saas_accounts, public.processed_stripe_events, public.ai_rate_limit,
              public.auth_audit_log, public.barbershop_invites, public.club_subscribers,
              public.clients, public.client_memberships
  FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES
  ON public.services, public.memberships FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON public.appointments FROM anon;
REVOKE ALL ON public.processed_stripe_events, public.ai_rate_limit, public.auth_audit_log
  FROM authenticated;

-- ═══ 4. Site externo só no Premium ═══════════════════════════════════════════
-- Checava 'starter' (plano que não existe mais), então o basic passava.
-- Só valida quando o site vira externo, pra não travar edição de quem já é.
CREATE OR REPLACE FUNCTION public.enforce_plan_site_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
BEGIN
  IF NEW.site_type = 'external'
     AND (TG_OP = 'INSERT' OR OLD.site_type IS DISTINCT FROM 'external') THEN
    SELECT sa.plan INTO v_plan
    FROM public.saas_accounts sa
    WHERE sa.id = NEW.saas_account_id;

    IF v_plan IS DISTINCT FROM 'premium' THEN
      RAISE EXCEPTION 'Site externo é exclusivo do plano Premium.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ═══ 5. Rate limit por chave (IP) ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.rate_limit_hits (
  key          text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  count        integer NOT NULL
);
ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limit_hits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.rate_limit_hits AS r (key, window_start, count)
  VALUES (p_key, now(), 1)
  ON CONFLICT (key) DO UPDATE SET
    count = CASE WHEN r.window_start > now() - make_interval(secs => p_window_seconds)
                 THEN r.count + 1 ELSE 1 END,
    window_start = CASE WHEN r.window_start > now() - make_interval(secs => p_window_seconds)
                        THEN r.window_start ELSE now() END
  RETURNING count INTO v_count;
  RETURN v_count <= p_limit;
END;
$$;
REVOKE ALL ON FUNCTION public.hit_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hit_rate_limit(text, integer, integer) TO service_role;

-- IP de quem chamou o PostgREST (cabeçalhos da requisição).
CREATE OR REPLACE FUNCTION public.request_ip()
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(
    nullif(trim(split_part(coalesce(
      nullif(current_setting('request.headers', true), '')::json ->> 'cf-connecting-ip',
      nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for',
      ''
    ), ',', 1)), ''),
    'unknown'
  )
$$;
REVOKE ALL ON FUNCTION public.request_ip() FROM PUBLIC, anon, authenticated;

-- Consulta pública por contato: 30 buscas válidas por hora por IP.
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
  IF v_email IS NOT NULL AND (position('@' in v_email) = 0 OR length(v_email) < 6) THEN
    v_email := NULL;
  END IF;
  IF v_phone IS NOT NULL AND length(v_phone) < 10 THEN
    v_phone := NULL;
  END IF;

  IF v_email IS NULL AND v_phone IS NULL THEN
    RETURN;
  END IF;

  IF NOT public.hit_rate_limit('lookup:' || public.request_ip(), 30, 3600) THEN
    RAISE EXCEPTION 'Muitas consultas seguidas. Tente novamente mais tarde.'
      USING ERRCODE = '54000';
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
REVOKE ALL ON FUNCTION public.search_appointments_by_contact(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_appointments_by_contact(text, text) TO anon, authenticated;
