-- Notificação push de agendamento novo, mesmo com o navegador fechado.
--
-- Cada aparelho da equipe que ligou o sino guarda aqui a sua inscrição de push
-- (endpoint + chaves do navegador). Quando o cliente marca pelo site (INSERT
-- 'pending'), um gatilho chama a edge function `push-new-booking`, que manda o
-- push pra todos os aparelhos da barbearia.
--
-- Segredos: URL do projeto e segredo compartilhado vêm do Vault
-- (`project_url`, `trial_cron_secret` — o mesmo CRON_SECRET da trial-reminders).
-- Nada de segredo neste arquivo.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  endpoint      text NOT NULL UNIQUE CHECK (endpoint ~ '^https://'),
  p256dh        text NOT NULL,
  auth          text NOT NULL,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz
);

CREATE INDEX IF NOT EXISTS push_subscriptions_barbershop_idx
  ON public.push_subscriptions (barbershop_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Cada usuário só vê/cria/apaga as próprias inscrições, e só em barbearia
-- da qual faz parte (dono ou membro ativo).
DROP POLICY IF EXISTS "own push subscriptions read" ON public.push_subscriptions;
CREATE POLICY "own push subscriptions read" ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "own push subscriptions insert" ON public.push_subscriptions;
CREATE POLICY "own push subscriptions insert" ON public.push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND barbershop_id IN (SELECT public.my_barbershop_ids())
  );

DROP POLICY IF EXISTS "own push subscriptions update" ON public.push_subscriptions;
CREATE POLICY "own push subscriptions update" ON public.push_subscriptions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND barbershop_id IN (SELECT public.my_barbershop_ids())
  );

DROP POLICY IF EXISTS "own push subscriptions delete" ON public.push_subscriptions;
CREATE POLICY "own push subscriptions delete" ON public.push_subscriptions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON public.push_subscriptions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;

-- ─── Gatilho: agendamento do site → push ─────────────────────────────────────
-- Só manda o id; a função relê o agendamento com service role (não confia no corpo).
-- net.http_post é assíncrono: não atrasa nem derruba o INSERT do cliente.
CREATE OR REPLACE FUNCTION public.notify_push_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url    text;
  v_secret text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_url
    FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets WHERE name = 'trial_cron_secret';

  IF v_url IS NULL OR v_secret IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url     := v_url || '/functions/v1/push-new-booking',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', v_secret
      ),
      body    := jsonb_build_object('appointment_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    -- Push é extra: se falhar, o agendamento continua valendo.
    RAISE WARNING 'notify_push_new_booking: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_push_new_booking() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_push_new_booking ON public.appointments;
CREATE TRIGGER trg_push_new_booking
  AFTER INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.notify_push_new_booking();
