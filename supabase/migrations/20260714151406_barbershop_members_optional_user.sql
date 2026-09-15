-- Permite cadastrar barbeiro SEM conta de login (user_id nulo). Assim o dono
-- adiciona a equipe direto no painel, sem depender de convite por email — o
-- barbeiro serve para agendar/relatórios mesmo sem acessar o sistema.
alter table public.barbershop_members
  alter column user_id drop not null;
