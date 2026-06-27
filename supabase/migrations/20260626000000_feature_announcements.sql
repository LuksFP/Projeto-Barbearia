-- Central de novidades: registra quais avisos de feature cada conta já viu.
-- O front mostra o modal de novidade enquanto a key do aviso não estiver aqui.

alter table public.saas_accounts
  add column if not exists seen_announcements text[] not null default '{}';

-- Marca um aviso como visto para a conta do usuário autenticado.
-- SECURITY DEFINER para não depender de policy de UPDATE em saas_accounts.
create or replace function public.mark_announcement_seen(p_key text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.saas_accounts
     set seen_announcements = array_append(seen_announcements, p_key)
   where user_id = auth.uid()
     and not (p_key = any(seen_announcements));
$$;

grant execute on function public.mark_announcement_seen(text) to authenticated;
