// Travas do plano Básico — o mesmo que o banco faz em 20261109074946_basic_plan_limits.sql.
// O que já existia antes da trava continua valendo (equipe maior, clube criado,
// aparelho com aviso, comissão mexida); só não entra coisa nova.
import type { SaasPlan } from '@/types/saas'

/** Só trava quando o plano é Básico de verdade. Sem conta carregada (barbeiro
 *  convidado, carregando) não esconde nada — o banco segura de qualquer jeito. */
export const isBasicPlan = (plan: SaasPlan | null | undefined): boolean => plan === 'basic'

/** Pessoas ativas na equipe que cabem no Básico. */
export const BASIC_TEAM_LIMIT = 2

export const DEFAULT_COMMISSION = 50

/** A barbearia já usava comissão (alguém fora dos 50% padrão). */
export const commissionInUse = (barbers: { commissionPercent: number }[]): boolean =>
  barbers.some(b => b.commissionPercent !== DEFAULT_COMMISSION)

export const PRO_MSG = {
  team: 'No plano Básico cabem 2 pessoas na equipe. Barbeiros ilimitados vêm no Pro.',
  club: 'O Clube VIP vem no plano Pro: planos de assinatura, controle de mensalidade e cobrança por PIX.',
  push: 'Aviso de agendamento com som e notificação no celular vem no plano Pro.',
  commission: 'Comissão por barbeiro vem no plano Pro.',
  csv: 'Exportar o financeiro em CSV vem no plano Pro.',
} as const
