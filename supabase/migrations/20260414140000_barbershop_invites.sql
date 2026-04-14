-- Tabela de convites para barbeiros
-- Usada pelo fluxo invite-barber / accept-invite

CREATE TABLE IF NOT EXISTS public.barbershop_invites (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  email         text NOT NULL,
  name          text NOT NULL,
  specialty     text NOT NULL DEFAULT '',
  bio           text NOT NULL DEFAULT '',
  role          text NOT NULL DEFAULT 'barber',
  token         uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at    timestamptz NOT NULL DEFAULT now() + interval '7 days',
  created_at    timestamptz NOT NULL DEFAULT now(),

  -- Evita duplicar convite pendente para mesmo email na mesma barbearia
  CONSTRAINT barbershop_invites_barbershop_email_key UNIQUE (barbershop_id, email)
);

-- Índice para busca por token (accept-invite)
CREATE INDEX IF NOT EXISTS barbershop_invites_token_idx ON public.barbershop_invites (token);

-- RLS
ALTER TABLE public.barbershop_invites ENABLE ROW LEVEL SECURITY;

-- Owner e admins da barbearia podem ver/criar convites
CREATE POLICY "owner can manage invites" ON public.barbershop_invites
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.barbershops b
      JOIN public.saas_accounts sa ON b.saas_account_id = sa.id
      WHERE b.id = barbershop_invites.barbershop_id
        AND sa.user_id = auth.uid()
    )
  );

-- Qualquer pessoa pode ler um convite pelo token (para a página de aceitação)
CREATE POLICY "public read invite by token" ON public.barbershop_invites
  FOR SELECT
  USING (true);
