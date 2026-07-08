-- Fix da auditoria: no remoto, a policy real de booking anônimo chamava-se
-- "anon can book appointment" (divergiu dos arquivos de migration) e só exigia
-- a barbearia existir/ativa — SEM travar status nem campos de pagamento. Como
-- policies permissivas se combinam por OR, ela anulava a public_insert_appointments
-- estrita criada na migration anterior (anon conseguia inserir status='done' ou
-- payment_status='paid'). Removemos a policy solta e deixamos apenas a estrita.
DROP POLICY IF EXISTS "anon can book appointment" ON public.appointments;

-- Recria a policy estrita exigindo também barbearia ATIVA (paridade com a antiga).
DROP POLICY IF EXISTS public_insert_appointments ON public.appointments;
CREATE POLICY public_insert_appointments ON public.appointments
  FOR INSERT TO anon WITH CHECK (
    status = 'pending'
    AND payment_status IS NULL
    AND paid_at IS NULL
    AND stripe_checkout_session_id IS NULL
    AND stripe_payment_intent_id IS NULL
    AND COALESCE(price, 0) >= 0
    AND EXISTS (
      SELECT 1 FROM public.barbershops b
      WHERE b.id = appointments.barbershop_id AND b.active = true
    )
  );
