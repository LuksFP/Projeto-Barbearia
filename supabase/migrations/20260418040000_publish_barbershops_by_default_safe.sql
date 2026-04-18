-- Garante que novas barbearias fiquem publicadas por padrão sem mexer na
-- função create_saas_account, que já teve versões mais novas aplicadas.

ALTER TABLE public.barbershops
  ALTER COLUMN active SET DEFAULT true;

UPDATE public.barbershops
SET active = true
WHERE active IS DISTINCT FROM true;
