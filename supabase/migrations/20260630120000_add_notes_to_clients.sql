-- Campo livre de observações por cliente (preferências, alergias, tipo de corte, etc)
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS notes text;
