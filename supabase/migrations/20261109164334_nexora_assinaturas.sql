-- Entrega as contas SaaS do BarberOS pro Nexora (CRM da Nexio), que mostra quantas barbearias
-- usam e em qual plano.
--
-- Chamada por PostgREST com a chave anon (pública) + cabeçalho `x-nexora-chave`, que precisa bater
-- com o segredo `nexora_chave` do Vault. Sem o segredo no Vault, recusa sempre. O segredo nunca
-- entra no git: é criado à parte com `select vault.create_secret('<valor>', 'nexora_chave')`.
--
-- `pago` = tem assinatura no Stripe. Conta ativa sem Stripe foi liberada à mão (cortesia/demo) e
-- não entra no faturamento. Preços = os price IDs live do Stripe (conferidos em 2026-09-15).
create or replace function public.nexora_assinaturas()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_chave    text := coalesce(current_setting('request.headers', true)::json ->> 'x-nexora-chave', '');
  v_segredo  text;
begin
  select decrypted_secret into v_segredo from vault.decrypted_secrets where name = 'nexora_chave' limit 1;
  if v_segredo is null or length(v_segredo) < 32 or v_chave <> v_segredo then
    raise exception 'chave inválida' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'produto', 'BarberOS',
    'gerado_em', now(),
    'contas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'nome', a.owner_name,
        'email', u.email,
        'empresa', a.barbershop_name,
        'plano', a.plan,
        'status', a.plan_status,
        'valor_mensal', case a.plan when 'basic' then 19.90 when 'pro' then 59.90 when 'premium' then 79.90 else 0 end,
        'pago', a.stripe_subscription_id is not null,
        'criado_em', a.created_at,
        'teste_ate', a.trial_ends_at,
        'cancela_em', a.cancel_at,
        'ultimo_acesso', a.last_login_at
      ) order by a.created_at desc)
      from public.saas_accounts a
      left join auth.users u on u.id = a.user_id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.nexora_assinaturas() from public, authenticated;
grant execute on function public.nexora_assinaturas() to anon;
