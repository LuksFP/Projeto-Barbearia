-- Horário de funcionamento configurável por barbearia (abre/fecha).
-- Usado pra gerar os slots de agendamento só dentro do expediente.

alter table public.barbershops
  add column if not exists open_time  text not null default '08:00',
  add column if not exists close_time text not null default '20:00';
