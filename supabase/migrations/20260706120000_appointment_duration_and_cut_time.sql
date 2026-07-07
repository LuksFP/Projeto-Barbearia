-- Tempo de corte por barbeiro + duração do atendimento (base pro bloqueio de
-- horários na agenda). Os tipos TS já referenciavam estes campos, mas a coluna
-- nunca tinha sido criada no banco.

alter table public.appointments
  add column if not exists duration_min int not null default 30;

alter table public.barbershop_members
  add column if not exists cut_duration_minutes int not null default 30;
