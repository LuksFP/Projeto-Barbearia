-- A consulta por telefone/e-mail (página antiga /consulta-agendamento) devolvia
-- os agendamentos da pessoa em TODAS as barbearias pra quem soubesse o número.
-- A página saiu do app; a função sai junto.
DROP FUNCTION IF EXISTS public.search_appointments_by_contact(text, text);
