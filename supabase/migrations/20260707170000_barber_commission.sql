-- Comissão por barbeiro (% sobre a receita que ele gera). Usado no Financeiro
-- para calcular quanto cada barbeiro recebe.

alter table public.barbershop_members
  add column if not exists commission_percent numeric not null default 50;
