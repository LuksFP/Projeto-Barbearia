-- Texto do logo da barbearia (topo do site, hero, "Bom dia" do painel).
--
-- Antes o cadastro gravava as 8 primeiras letras do nome sem espaço:
-- "Barbearia Demo" virava "BARBEARI", "Abravanel" virava "ABRAVANE".
-- Agora: o nome em maiúsculas, com espaço, até 20 caracteres — passando
-- disso, corta na última palavra inteira ("BARBEARIA TESTE", não
-- "BARBEARIA TESTE AGEN").
-- O Personalizar também passa a aceitar até 20.
--
-- 0) default_logo_text(nome): a regra acima.
-- 1) create_saas_account: cópia da versão em produção com só essa troca.
-- 2) Corrige quem ficou com o logo cortado automaticamente (só onde o logo
--    ainda é exatamente o corte antigo — quem escolheu outro texto fica).

CREATE OR REPLACE FUNCTION public.default_logo_text(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  WITH n AS (SELECT upper(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'))) AS v)
  SELECT CASE
           WHEN char_length(v) <= 20 THEN v
           ELSE coalesce(nullif(substring(left(v, 21) from '^(.*\S)\s'), ''), left(v, 20))
         END
    FROM n
$$;

CREATE OR REPLACE FUNCTION public.create_saas_account(p_user_id uuid, p_owner_name text, p_barb_name text, p_barb_slug text, p_embed_key text)
 RETURNS saas_accounts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    public.default_logo_text(p_barb_name),
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
$function$;

UPDATE public.barbershops
   SET logo_text = public.default_logo_text(name)
 WHERE logo_text = upper(left(regexp_replace(name, '\s+', '', 'g'), 8))
   AND char_length(regexp_replace(name, '\s+', '', 'g')) > 8;
