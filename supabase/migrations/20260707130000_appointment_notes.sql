-- Observação do agendamento (ex: "pai e filho", "cabelo cacheado"). Vai também
-- para a descrição (notes) do cliente na aba Clientes, via o trigger de sync.

alter table public.appointments
  add column if not exists notes text;

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

  insert into public.clients (barbershop_id, name, phone, email, notes)
  values (new.barbershop_id, new.client_name, new.client_phone, new.client_email, nullif(new.notes, ''))
  on conflict (barbershop_id, phone) do update
    set name  = excluded.name,
        email = coalesce(excluded.email, public.clients.email),
        notes = case
          when coalesce(excluded.notes, '') = '' then public.clients.notes
          when coalesce(public.clients.notes, '') = '' then excluded.notes
          when position(excluded.notes in public.clients.notes) > 0 then public.clients.notes
          else public.clients.notes || E'\n' || excluded.notes
        end;

  return new;
end;
$$;
