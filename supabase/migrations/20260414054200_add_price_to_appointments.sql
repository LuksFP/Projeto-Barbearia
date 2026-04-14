-- Adiciona colunas de financeiro à tabela appointments.
-- price: valor cobrado no momento do atendimento (denormalizado para preservar histórico
--        mesmo que o preço do serviço mude depois).
-- service_category: categoria do serviço (Corte, Barba, Combo, etc.) — também denormalizado
--                   para permitir agrupamento financeiro sem join com services.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS price           numeric(10,2),
  ADD COLUMN IF NOT EXISTS service_category text;

-- Índice para acelerar agregações mensais (filtro por barbershop + status + data)
CREATE INDEX IF NOT EXISTS idx_appointments_revenue
  ON appointments (barbershop_id, status, date)
  WHERE status = 'done' AND price IS NOT NULL;

COMMENT ON COLUMN appointments.price IS
  'Valor cobrado no atendimento. Denormalizado para preservar histórico financeiro.';
COMMENT ON COLUMN appointments.service_category IS
  'Categoria do serviço no momento do agendamento (Corte, Barba, Combo, Coloração…).';
