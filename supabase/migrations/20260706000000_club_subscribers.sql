-- Cobranças do Clube VIP: assinantes individuais com dia de vencimento e status de pagamento.
-- SEM gateway de pagamento — controle manual (dar baixa) + PIX/boleto gerados no front.

-- Chave PIX da barbearia (usada na mensagem de cobrança). Sincroniza entre dispositivos.
alter table public.barbershops
  add column if not exists club_pix_key text not null default '';

create table if not exists public.club_subscribers (
  id            uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  membership_id uuid references public.memberships(id) on delete set null,
  name          text not null,
  phone         text not null default '',
  billing_day   int  not null default 5 check (billing_day between 1 and 28),
  paid_until    text,               -- 'YYYY-MM' da última competência quitada (null = nada pago)
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists club_subscribers_barbershop_idx
  on public.club_subscribers (barbershop_id);

alter table public.club_subscribers enable row level security;

-- Owner CRUD escopado à própria barbearia (mesmo padrão de services/clients)
do $$ begin
  if not exists (select 1 from pg_policies where tablename='club_subscribers' and policyname='owner_read_club_subscribers') then
    create policy owner_read_club_subscribers on public.club_subscribers
      for select using (
        barbershop_id in (
          select b.id from public.barbershops b
          join public.saas_accounts sa on sa.id = b.saas_account_id
          where sa.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='club_subscribers' and policyname='owner_insert_club_subscriber') then
    create policy owner_insert_club_subscriber on public.club_subscribers
      for insert with check (
        barbershop_id in (
          select b.id from public.barbershops b
          join public.saas_accounts sa on sa.id = b.saas_account_id
          where sa.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='club_subscribers' and policyname='owner_update_club_subscriber') then
    create policy owner_update_club_subscriber on public.club_subscribers
      for update using (
        barbershop_id in (
          select b.id from public.barbershops b
          join public.saas_accounts sa on sa.id = b.saas_account_id
          where sa.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='club_subscribers' and policyname='owner_delete_club_subscriber') then
    create policy owner_delete_club_subscriber on public.club_subscribers
      for delete using (
        barbershop_id in (
          select b.id from public.barbershops b
          join public.saas_accounts sa on sa.id = b.saas_account_id
          where sa.user_id = auth.uid()
        )
      );
  end if;
end $$;
