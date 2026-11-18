-- Pagamento online no site da barbearia: corte e produtos (Mercado Pago,
-- modelo marketplace). Muda a regra de 2026-06-26 ("agendamento não se paga
-- online"): continua opcional, quem quiser paga na barbearia.
--
-- Cada barbearia conecta a PRÓPRIA conta Mercado Pago (OAuth). O cliente paga
-- no checkout do MP, o dinheiro cai na conta da barbearia e a taxa da
-- plataforma (MP_PLATFORM_FEE_PCT, 1,5%) sai sozinha como marketplace_fee.
--
--   mp_accounts     — tokens da conta MP da barbearia (cifrados na Edge
--                     Function). Ninguém do front lê: só service role.
--   online_payments — um pagamento por horário e/ou pedido da loja.
--                     Só as Edge Functions gravam; a equipe lê.
--
-- Pagar online é opcional: horário e pedido nascem iguais (pending/reservado).
-- Não pagou → segue normal, paga na barbearia.
-- Pago → horário e itens não cancelam pelo painel; só pelo estorno (EF
-- payment-refund), que devolve o dinheiro no MP antes de cancelar.

-- ═══ Conta Mercado Pago da barbearia ════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.mp_accounts (
  barbershop_id     uuid PRIMARY KEY REFERENCES public.barbershops(id) ON DELETE CASCADE,
  mp_user_id        bigint NOT NULL,
  access_token_enc  text NOT NULL,
  refresh_token_enc text NOT NULL,
  public_key        text,
  expires_at        timestamptz NOT NULL,
  enabled           boolean NOT NULL DEFAULT true,   -- dono pode pausar sem desconectar
  connected_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  connected_at      timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mp_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mp_accounts FROM anon, authenticated;

-- ═══ Pagamento online ═══════════════════════════════════════════════════════
-- Um pagamento cobre o horário, o pedido da loja ou os dois juntos (corte +
-- "Leve junto" num checkout só). O id vai como external_reference no MP.
CREATE TABLE IF NOT EXISTS public.online_payments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id    uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  order_id         uuid,                                   -- itens de product_sales
  appointment_id   uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  status           text NOT NULL DEFAULT 'pendente'
                   CHECK (status IN ('pendente', 'pago', 'recusado', 'estornado')),
  amount           numeric(10,2) NOT NULL CHECK (amount > 0),
  platform_fee     numeric(10,2) NOT NULL CHECK (platform_fee >= 0),
  mp_preference_id text,
  mp_payment_id    text,
  method           text,             -- pix, credit_card, debit_card…
  paid_at          timestamptz,
  refunded_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT online_payments_target CHECK (order_id IS NOT NULL OR appointment_id IS NOT NULL)
);

-- Um pagamento por pedido e um por horário (tentar de novo reaproveita a linha)
CREATE UNIQUE INDEX IF NOT EXISTS online_payments_order_uq ON public.online_payments (order_id) WHERE order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS online_payments_appointment_uq ON public.online_payments (appointment_id) WHERE appointment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS online_payments_barbershop_idx ON public.online_payments (barbershop_id, created_at DESC);

ALTER TABLE public.online_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.online_payments FROM anon, authenticated;
GRANT SELECT ON public.online_payments TO authenticated;

DROP POLICY IF EXISTS "team reads online payments" ON public.online_payments;
CREATE POLICY "team reads online payments" ON public.online_payments
  FOR SELECT TO authenticated
  USING (barbershop_id IN (SELECT public.my_barbershop_ids()));

-- ═══ Painel: estado da conexão (só dono/admin) ══════════════════════════════
CREATE OR REPLACE FUNCTION public.my_mp_connection(p_barbershop_id uuid)
RETURNS TABLE (connected boolean, enabled boolean, mp_user_id bigint, connected_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT true, m.enabled, m.mp_user_id, m.connected_at
    FROM public.mp_accounts m
   WHERE m.barbershop_id = p_barbershop_id
     AND p_barbershop_id IN (SELECT public.my_admin_barbershop_ids());
$$;

REVOKE ALL ON FUNCTION public.my_mp_connection(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_mp_connection(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_mp_payment_enabled(p_barbershop_id uuid, p_enabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_barbershop_id NOT IN (SELECT public.my_admin_barbershop_ids()) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = 'insufficient_privilege';
  END IF;
  UPDATE public.mp_accounts SET enabled = p_enabled, updated_at = now()
   WHERE barbershop_id = p_barbershop_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conecte o Mercado Pago primeiro' USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_mp_payment_enabled(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_mp_payment_enabled(uuid, boolean) TO authenticated;

-- Desconectar apaga os tokens. Pagamentos já feitos continuam registrados,
-- mas estorno de pedido pago passa a ser feito direto no app do Mercado Pago.
CREATE OR REPLACE FUNCTION public.disconnect_mp(p_barbershop_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_barbershop_id NOT IN (SELECT public.my_admin_barbershop_ids()) THEN
    RAISE EXCEPTION 'Sem permissão' USING ERRCODE = 'insufficient_privilege';
  END IF;
  DELETE FROM public.mp_accounts WHERE barbershop_id = p_barbershop_id;
END;
$$;

REVOKE ALL ON FUNCTION public.disconnect_mp(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.disconnect_mp(uuid) TO authenticated;

-- ═══ Site do cliente ════════════════════════════════════════════════════════
-- A barbearia aceita pagamento online agora?
CREATE OR REPLACE FUNCTION public.public_store_pays_online(p_barbershop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mp_accounts m
      JOIN public.barbershops b ON b.id = m.barbershop_id
     WHERE m.barbershop_id = p_barbershop_id AND m.enabled AND b.active
  );
$$;

REVOKE ALL ON FUNCTION public.public_store_pays_online(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_store_pays_online(uuid) TO anon, authenticated;

-- Status do pagamento na volta do checkout. O id é um uuid aleatório que só
-- quem pagou tem; devolve só o status e o que foi pago, nada do cliente.
CREATE OR REPLACE FUNCTION public.public_payment_status(p_payment_id uuid)
RETURNS TABLE (status text, has_appointment boolean, has_order boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status, appointment_id IS NOT NULL, order_id IS NOT NULL
    FROM public.online_payments WHERE id = p_payment_id;
$$;

REVOKE ALL ON FUNCTION public.public_payment_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_payment_status(uuid) TO anon, authenticated;

-- ═══ Pedido pago não cancela pelo painel ════════════════════════════════════
-- Só o service role (EF payment-refund, depois de estornar no MP) cancela item
-- de pedido pago. O resto da regra de status continua a mesma.
CREATE OR REPLACE FUNCTION public.product_sale_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'cancelado' THEN
    RAISE EXCEPTION 'Pedido cancelado não volta' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.status = 'retirado' AND NEW.status <> 'cancelado' THEN
    RAISE EXCEPTION 'Mudança de status inválida' USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.status = 'cancelado'
     AND coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     AND EXISTS (SELECT 1 FROM public.online_payments op
                  WHERE op.order_id = OLD.order_id AND op.status = 'pago') THEN
    RAISE EXCEPTION 'Pedido pago online: use "Estornar" pra devolver o dinheiro'
      USING ERRCODE = 'check_violation', HINT = 'paid_order';
  END IF;
  IF NEW.status = 'cancelado' THEN
    UPDATE public.products SET stock = stock + OLD.quantity WHERE id = OLD.product_id;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.product_sale_status_change() FROM PUBLIC, anon, authenticated;

-- Agendamento cancelado não cancela produto JÁ PAGO: o cliente pagou e pode
-- retirar mesmo sem o corte (ou a barbearia estorna pelo painel).
-- "Faltou" (no_show, novo): igual ao cancelado pros produtos não pagos (voltam
-- pro estoque); o horário pago fica pago — a barbearia fica com o valor.
-- Não existe CHECK no status de appointments, então no_show já é aceito. Ele
-- continua ocupando o horário na trava de sobreposição, mas o painel só deixa
-- marcar depois que o horário começou (aí o espaço já passou).
CREATE OR REPLACE FUNCTION public.sync_order_with_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('cancelled', 'no_show') THEN
    UPDATE public.product_sales ps SET status = 'cancelado'
     WHERE ps.appointment_id = NEW.id AND ps.status = 'reservado'
       AND NOT EXISTS (SELECT 1 FROM public.online_payments op
                        WHERE op.order_id = ps.order_id AND op.status = 'pago');
  ELSIF NEW.status = 'done' THEN
    UPDATE public.product_sales SET status = 'retirado'
     WHERE appointment_id = NEW.id AND status = 'reservado';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_order_with_appointment() FROM PUBLIC, anon, authenticated;

-- ═══ Horário pago online não cancela pelo painel ════════════════════════════
-- Cancelar = estornar (EF payment-refund, service role). Concluir é livre.
CREATE OR REPLACE FUNCTION public.block_cancel_paid_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled'
     AND coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     AND EXISTS (SELECT 1 FROM public.online_payments op
                  WHERE op.appointment_id = OLD.id AND op.status = 'pago') THEN
    RAISE EXCEPTION 'Horário pago online: use "Estornar" pra devolver o dinheiro'
      USING ERRCODE = 'check_violation', HINT = 'paid_appointment';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.block_cancel_paid_appointment() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_block_cancel_paid_appointment ON public.appointments;
CREATE TRIGGER trg_block_cancel_paid_appointment
  BEFORE UPDATE OF status ON public.appointments
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled')
  EXECUTE FUNCTION public.block_cancel_paid_appointment();
