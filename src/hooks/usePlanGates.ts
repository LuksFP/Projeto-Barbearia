// O que o plano libera no painel, numa conta só (Equipe, Clube, Financeiro e
// menu liam o plano e repetiam as mesmas condições). Regras em planFeatures.ts;
// o banco faz a mesma conta em 20261109074946_basic_plan_limits.sql.
import { useSaasAccount } from '@/contexts/SaasAccountContext'
import { useTenant } from '@/contexts/TenantContext'
import { BASIC_TEAM_LIMIT, commissionInUse, isBasicPlan } from '@/lib/planFeatures'

export interface PlanGates {
  basic: boolean
  /** Equipe no limite do Básico: não entra mais ninguém. */
  teamFull: boolean
  /** Comissão visível e editável (Pro, ou Básico que já usava). */
  commission: boolean
  /** Clube VIP liberado (Pro, ou Básico que já tinha clube). */
  club: boolean
  csv: boolean
  /** Avisos no celular travados (o aparelho que já tinha ligado continua). */
  alertsLocked: boolean
}

export function usePlanGates(): PlanGates {
  const { account } = useSaasAccount()
  const { barbers, memberships } = useTenant()
  const basic = isBasicPlan(account?.plan)
  return {
    basic,
    teamFull: basic && barbers.length >= BASIC_TEAM_LIMIT,
    commission: !basic || commissionInUse(barbers),
    club: !basic || memberships.length > 0,
    csv: !basic,
    alertsLocked: basic,
  }
}
