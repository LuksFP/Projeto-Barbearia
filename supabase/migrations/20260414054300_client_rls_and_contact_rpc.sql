-- RLS: clientes autenticados (via supabasePublic) podem ler seus próprios agendamentos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'appointments' AND policyname = 'client_read_own_appointments'
  ) THEN
    CREATE POLICY client_read_own_appointments ON public.appointments
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

-- RLS: donos/membros do dashboard (supabase main client) podem ler agendamentos da barbearia
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'appointments' AND policyname = 'owner_read_barbershop_appointments'
  ) THEN
    CREATE POLICY owner_read_barbershop_appointments ON public.appointments
      FOR SELECT USING (
        -- Dono da conta SaaS da barbearia
        EXISTS (
          SELECT 1 FROM public.saas_accounts sa
          JOIN public.barbershops b ON b.saas_account_id = sa.id
          WHERE b.id = appointments.barbershop_id
            AND sa.user_id = auth.uid()
        )
        OR
        -- Membro ativo da equipe (barbeiro, admin, recepcionista)
        EXISTS (
          SELECT 1 FROM public.barbershop_members m
          WHERE m.barbershop_id = appointments.barbershop_id
            AND m.user_id = auth.uid()
            AND m.active = true
        )
      );
  END IF;
END $$;

-- RLS: donos/membros podem atualizar agendamentos da barbearia (status, rating)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'appointments' AND policyname = 'owner_update_barbershop_appointments'
  ) THEN
    CREATE POLICY owner_update_barbershop_appointments ON public.appointments
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.saas_accounts sa
          JOIN public.barbershops b ON b.saas_account_id = sa.id
          WHERE b.id = appointments.barbershop_id
            AND sa.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.barbershop_members m
          WHERE m.barbershop_id = appointments.barbershop_id
            AND m.user_id = auth.uid()
            AND m.active = true
        )
      );
  END IF;
END $$;

-- RPC: busca pública de agendamentos por email/telefone (guest lookup sem login)
-- SECURITY DEFINER = contorna RLS para que visitantes sem conta possam consultar
CREATE OR REPLACE FUNCTION public.search_appointments_by_contact(
  p_email text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS SETOF public.appointments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_email IS NULL AND p_phone IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT a.*
  FROM public.appointments a
  WHERE
    (p_email IS NOT NULL AND a.client_email ILIKE p_email)
    OR (p_phone IS NOT NULL AND a.client_phone = p_phone)
  ORDER BY a.date DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_appointments_by_contact TO anon;
GRANT EXECUTE ON FUNCTION public.search_appointments_by_contact TO authenticated;
