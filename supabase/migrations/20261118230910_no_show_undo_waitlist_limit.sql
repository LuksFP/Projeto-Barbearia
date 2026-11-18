-- 1) "Desfazer falta" devolve os produtos que o "Faltou" cancelou.
--    O cancelamento por falta fica marcado (cancel_reason = 'no_show'); ao
--    voltar o horário pra pending/confirmed, esses itens voltam a "reservado"
--    e saem do estoque de novo — só se ainda houver estoque (senão ficam
--    cancelados e a equipe resolve). Qualquer outro cancelado continua sem volta.
ALTER TABLE public.product_sales ADD COLUMN IF NOT EXISTS cancel_reason text
  CHECK (cancel_reason IS NULL OR cancel_reason IN ('no_show'));

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
    -- Única volta permitida: a do "Desfazer falta", feita pelo próprio banco.
    IF NEW.status = 'reservado' AND OLD.cancel_reason = 'no_show'
       AND current_setting('app.undo_no_show', true) = 'on' THEN
      UPDATE public.products SET stock = stock - OLD.quantity
       WHERE id = OLD.product_id AND stock >= OLD.quantity;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Sem estoque pra reservar de novo' USING ERRCODE = 'check_violation';
      END IF;
      NEW.cancel_reason := NULL;
      NEW.updated_at := now();
      RETURN NEW;
    END IF;
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
    IF current_setting('app.cancel_no_show', true) IS DISTINCT FROM 'on' THEN
      NEW.cancel_reason := NULL;   -- a equipe não consegue forjar a marca
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.product_sale_status_change() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_order_with_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF NEW.status IN ('cancelled', 'no_show') THEN
    PERFORM set_config('app.cancel_no_show', CASE WHEN NEW.status = 'no_show' THEN 'on' ELSE 'off' END, true);
    UPDATE public.product_sales ps
       SET status = 'cancelado',
           cancel_reason = CASE WHEN NEW.status = 'no_show' THEN 'no_show' END
     WHERE ps.appointment_id = NEW.id AND ps.status = 'reservado'
       AND NOT EXISTS (SELECT 1 FROM public.online_payments op
                        WHERE op.order_id = ps.order_id AND op.status = 'pago');
    PERFORM set_config('app.cancel_no_show', 'off', true);
  ELSIF NEW.status = 'done' THEN
    UPDATE public.product_sales SET status = 'retirado'
     WHERE appointment_id = NEW.id AND status = 'reservado';
  ELSIF OLD.status = 'no_show' AND NEW.status IN ('pending', 'confirmed') THEN
    PERFORM set_config('app.undo_no_show', 'on', true);
    FOR r IN SELECT id FROM public.product_sales
              WHERE appointment_id = NEW.id AND status = 'cancelado' AND cancel_reason = 'no_show'
    LOOP
      BEGIN
        UPDATE public.product_sales SET status = 'reservado' WHERE id = r.id;
      EXCEPTION WHEN check_violation THEN
        NULL;   -- sem estoque: fica cancelado
      END;
    END LOOP;
    PERFORM set_config('app.undo_no_show', 'off', true);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_order_with_appointment() FROM PUBLIC, anon, authenticated;

-- 2) Lista de espera: freio por aparelho (IP) e por barbearia, além do limite
--    de 3 dias por telefone que já existia.
CREATE OR REPLACE FUNCTION public.public_join_waitlist(
  p_barbershop_id uuid,
  p_date          date,
  p_client_name   text,
  p_client_phone  text,
  p_period        text DEFAULT 'qualquer',
  p_barber_id     uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text := regexp_replace(coalesce(p_client_phone, ''), '\D', '', 'g');
  v_name  text := btrim(coalesce(p_client_name, ''));
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_open  int;
  v_id    uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.barbershops WHERE id = p_barbershop_id AND active) THEN
    RAISE EXCEPTION 'Barbearia indisponível' USING ERRCODE = 'check_violation';
  END IF;
  IF p_date IS NULL OR p_date < v_today OR p_date > v_today + 60 THEN
    RAISE EXCEPTION 'Escolha um dia entre hoje e os próximos 60 dias' USING ERRCODE = 'check_violation';
  END IF;
  IF char_length(v_name) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'Informe seu nome' USING ERRCODE = 'check_violation';
  END IF;
  IF v_phone !~ '^[0-9]{10,13}$' THEN
    RAISE EXCEPTION 'Telefone inválido' USING ERRCODE = 'check_violation';
  END IF;
  IF coalesce(p_period, '') NOT IN ('manha', 'tarde', 'noite', 'qualquer') THEN
    RAISE EXCEPTION 'Período inválido' USING ERRCODE = 'check_violation';
  END IF;
  IF p_barber_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.barbershop_members WHERE id = p_barber_id AND barbershop_id = p_barbershop_id
  ) THEN
    RAISE EXCEPTION 'Barbeiro inválido' USING ERRCODE = 'check_violation';
  END IF;

  IF NOT public.hit_rate_limit('waitlist:' || public.request_ip(), 8, 3600)
     OR NOT public.hit_rate_limit('waitlist-shop:' || p_barbershop_id::text, 60, 3600) THEN
    RAISE EXCEPTION 'Muitos pedidos seguidos. Tente de novo mais tarde.' USING ERRCODE = '54000';
  END IF;

  SELECT count(*) INTO v_open FROM public.waitlist
   WHERE barbershop_id = p_barbershop_id AND client_phone = v_phone
     AND status IN ('esperando', 'avisado') AND date >= v_today AND date <> p_date;
  IF v_open >= 3 THEN
    RAISE EXCEPTION 'Você já está na lista de espera de 3 dias. Aguarde o aviso.' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.waitlist (barbershop_id, barber_id, date, period, client_name, client_phone)
  VALUES (p_barbershop_id, p_barber_id, p_date, p_period, v_name, v_phone)
  ON CONFLICT (barbershop_id, date, client_phone) DO UPDATE
    SET period = EXCLUDED.period, barber_id = EXCLUDED.barber_id, client_name = EXCLUDED.client_name,
        status = 'esperando', notified_at = NULL, updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.public_join_waitlist(uuid, date, text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_join_waitlist(uuid, date, text, text, text, uuid) TO anon, authenticated;
