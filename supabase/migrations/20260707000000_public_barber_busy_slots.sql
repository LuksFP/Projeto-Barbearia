-- Disponibilidade no site público: retorna os horários OCUPADOS de um barbeiro
-- numa data (só horário + duração, sem nenhum dado do cliente). Usado pelo
-- agendamento público pra bloquear ranges já preenchidos. SECURITY DEFINER
-- porque RLS não deixa o anon ler a tabela appointments diretamente.

create or replace function public.public_barber_busy_slots(
  p_barbershop_id uuid,
  p_barber_id uuid,
  p_date date
)
returns table(slot_time text, slot_duration int)
language sql
security definer
set search_path = public
as $$
  select a.time, coalesce(a.duration_min, 30)
  from public.appointments a
  where a.barbershop_id = p_barbershop_id
    and a.barber_id = p_barber_id
    and a.date = p_date
    and a.status <> 'cancelled';
$$;

grant execute on function public.public_barber_busy_slots(uuid, uuid, date) to anon, authenticated;
