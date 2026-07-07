-- Ao agendar um serviço, o cliente entra automaticamente na aba Clientes.
-- Trigger no INSERT de appointments faz upsert em clients (por barbershop+telefone).
-- SECURITY DEFINER pra funcionar também no agendamento público (anon, via RLS).

create or replace function public.sync_client_from_appointment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.client_phone, '') = '' then
    return new;
  end if;

  insert into public.clients (barbershop_id, name, phone, email)
  values (new.barbershop_id, new.client_name, new.client_phone, new.client_email)
  on conflict (barbershop_id, phone) do update
    set name  = excluded.name,
        email = coalesce(excluded.email, public.clients.email);

  return new;
end;
$$;

drop trigger if exists trg_sync_client_from_appointment on public.appointments;
create trigger trg_sync_client_from_appointment
  after insert on public.appointments
  for each row execute function public.sync_client_from_appointment();
