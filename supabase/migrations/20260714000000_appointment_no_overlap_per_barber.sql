-- Trava definitiva contra double-booking: impede que dois atendimentos do MESMO
-- barbeiro se sobreponham no tempo. Vale para qualquer origem (site público ou
-- painel) e é à prova de corrida (garantia no banco, não só no app).
-- Cancelados e agendamentos sem barbeiro definido ficam de fora.

create extension if not exists btree_gist;

-- Helper IMMUTABLE: o cast text->time é "stable" por padrão, então encapsulamos
-- num wrapper immutable para poder usar na constraint de exclusão.
create or replace function public.appointment_time_range(p_date date, p_time text, p_dur int)
returns tsrange
language sql
immutable
set search_path = public
as $$
  select tsrange(
    (p_date + p_time::time),
    (p_date + p_time::time) + make_interval(mins => coalesce(p_dur, 30)),
    '[)'
  );
$$;

alter table public.appointments
  add constraint appointments_no_overlap_per_barber
  exclude using gist (
    barber_id with =,
    public.appointment_time_range(date, time, duration_min) with &&
  )
  where (status <> 'cancelled' and barber_id is not null);
