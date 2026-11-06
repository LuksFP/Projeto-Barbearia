-- Caixa de sugestões: barbeiro/dono pede o que quer ver no BarberOS.
--
-- Qualquer pessoa da equipe (dono ou membro ativo) escreve e vê as sugestões
-- da própria barbearia. O status é só nosso (equipe BarberOS): muda pelo
-- painel do Supabase / service_role, o usuário não tem UPDATE.

CREATE TABLE IF NOT EXISTS public.app_suggestions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name   text NOT NULL CHECK (char_length(author_name) BETWEEN 1 AND 80),
  area          text NOT NULL CHECK (area IN ('agenda', 'clientes', 'financeiro', 'site', 'equipe', 'outro')),
  body          text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 5 AND 1000),
  status        text NOT NULL DEFAULT 'recebida'
                CHECK (status IN ('recebida', 'analisando', 'vai_entrar', 'no_ar', 'nao_agora')),
  reply         text CHECK (reply IS NULL OR char_length(reply) <= 1000),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_suggestions_barbershop_idx
  ON public.app_suggestions (barbershop_id, created_at DESC);

ALTER TABLE public.app_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team reads suggestions" ON public.app_suggestions;
CREATE POLICY "team reads suggestions" ON public.app_suggestions
  FOR SELECT TO authenticated
  USING (barbershop_id IN (SELECT public.my_barbershop_ids()));

-- Entra sempre como 'recebida' e sem resposta: status/resposta são nossos.
DROP POLICY IF EXISTS "team writes suggestion" ON public.app_suggestions;
CREATE POLICY "team writes suggestion" ON public.app_suggestions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND barbershop_id IN (SELECT public.my_barbershop_ids())
    AND status = 'recebida'
    AND reply IS NULL
  );

-- Quem escreveu pode apagar enquanto ninguém mexeu nela.
DROP POLICY IF EXISTS "author deletes fresh suggestion" ON public.app_suggestions;
CREATE POLICY "author deletes fresh suggestion" ON public.app_suggestions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND status = 'recebida');

REVOKE ALL ON public.app_suggestions FROM anon;
GRANT SELECT, INSERT, DELETE ON public.app_suggestions TO authenticated;

-- Freio: no máximo 15 sugestões por pessoa em 24h.
CREATE OR REPLACE FUNCTION public.enforce_suggestion_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    SELECT count(*) FROM public.app_suggestions
    WHERE user_id = NEW.user_id AND created_at > now() - interval '24 hours'
  ) >= 15 THEN
    RAISE EXCEPTION 'limite de sugestões por dia atingido' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_suggestion_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_suggestion_limit ON public.app_suggestions;
CREATE TRIGGER trg_suggestion_limit
  BEFORE INSERT ON public.app_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_suggestion_limit();

-- updated_at acompanha a mudança de status/resposta feita por nós.
CREATE OR REPLACE FUNCTION public.touch_app_suggestion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_app_suggestion ON public.app_suggestions;
CREATE TRIGGER trg_touch_app_suggestion
  BEFORE UPDATE ON public.app_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.touch_app_suggestion();
