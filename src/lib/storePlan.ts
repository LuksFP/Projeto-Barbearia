// Loja por plano — o mesmo que o banco faz em 20261109090000_store_settings.sql.
//   Básico  → "Leve junto no dia" com 1 produto
//   Pro     → "Leve junto no dia" com até 3 produtos
//   Premium → loja completa no site + "Leve junto" com os produtos marcados
// As chaves (loja ligada / leve junto ligado) ficam em Configurações.
import type { SaasPlan } from '@/types/saas'

/** Quantos produtos cabem no catálogo e no "Leve junto". null = sem limite. */
export function bumpLimit(plan: SaasPlan | null | undefined): number | null {
  if (plan === 'premium') return null
  if (plan === 'pro') return 3
  return 1
}

/** O plano permite loja completa no site. */
export const hasFullStore = (plan: SaasPlan | null | undefined): boolean => plan === 'premium'

/** Mesmos textos do gatilho products_plan_limit. */
export const STORE_LIMIT_MSG = {
  basic: 'No plano Básico cabe 1 produto, o do agendamento. A loja completa vem no Premium.',
  pro: 'No plano Pro cabem 3 produtos, os do agendamento. A loja completa vem no Premium.',
} as const

export function storeLimitMessage(plan: SaasPlan | null | undefined): string {
  return plan === 'pro' ? STORE_LIMIT_MSG.pro : STORE_LIMIT_MSG.basic
}
