// Regras do link do cliente, fidelidade, pacotes e aniversários.
// Espelham o banco (loyalty_status, manage_lock_reason).
// Sem alias "@/": os testes rodam este arquivo direto.

export interface ShopFeatures {
  selfCancelHours: number | null // null = cliente não mexe pelo link
  reviewsEnabled: boolean
  loyaltyEnabled: boolean
  loyaltyGoal: number
  loyaltyReward: string
  loyaltySince: string | null
  packagesEnabled: boolean
  birthdaysEnabled: boolean
}

/** Programas pra o cliente voltar começam desligados. */
export const DEFAULT_FEATURES: ShopFeatures = {
  selfCancelHours: 2, reviewsEnabled: false, loyaltyEnabled: false, loyaltyGoal: 10,
  loyaltyReward: '1 corte grátis', loyaltySince: null, packagesEnabled: false, birthdaysEnabled: false,
}

export const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const cents = (v: number) => Math.round(v * 100) / 100
/** "12,50" ou "12.50" → 12.5; vazio ou lixo → 0. */
export const parseMoney = (t: string) => {
  const n = Number(t.trim().replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? cents(n) : 0
}

export interface LoyaltyCard { visits: number; goal: number; reward: string; available: number; progress: number }

/** `visits` = atendimentos concluídos que não foram o do prêmio; `used` = prêmios dados. */
export function loyaltyCard(visits: number, used: number, goal: number, reward: string): LoyaltyCard {
  return { visits, goal, reward, available: Math.max(0, Math.floor(visits / goal) - used), progress: Math.max(0, visits - used * goal) }
}

export interface Birthday { clientId: string; name: string; phone: string; day: number; month: number }

const DAYS_IN = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
export const isValidBirthday = (day: number, month: number) =>
  Number.isInteger(day) && Number.isInteger(month) && month >= 1 && month <= 12 && day >= 1 && day <= DAYS_IN[month - 1]

/** Aniversariantes do mês de `today`; quem ainda vai fazer vem primeiro. */
export function birthdaysOfMonth(list: Birthday[], today: Date): Birthday[] {
  const d = today.getDate()
  return list.filter(b => b.month === today.getMonth() + 1)
    .sort((a, b) => Number(a.day < d) - Number(b.day < d) || a.day - b.day || a.name.localeCompare(b.name))
}

export function buildBirthdayMessage(name: string, shopName: string, isToday: boolean): string {
  const first = name.trim().split(/\s+/)[0] || ''
  return `Oi${first ? `, ${first}` : ''}! ${isToday ? 'Feliz aniversário' : 'Passando pra desejar feliz aniversário'} 🎉 É a galera da ${shopName}. Se quiser dar um trato no visual pra comemorar, é só me chamar que eu separo um horário.`
}

export const manageUrl = (origin: string, slug: string, token: string) => `${origin.replace(/\/$/, '')}/b/${slug}/horario/${token}`

export type LockReason = 'encerrado' | 'passou' | 'desligado' | 'fixo' | 'pago' | 'prazo'

export function lockMessage(reason: LockReason, minHours: number | null): string {
  switch (reason) {
    case 'prazo': return `Pelo link dá pra mudar até ${minHours} ${minHours === 1 ? 'hora' : 'horas'} antes. Agora é com a barbearia.`
    case 'fixo': return 'Esse é o seu horário fixo. Pra mudar, fale com a barbearia.'
    case 'pago': return 'Esse horário já foi pago pelo site. Pra mudar ou pedir o dinheiro de volta, fale com a barbearia.'
    case 'desligado': return 'Pra cancelar ou remarcar, fale com a barbearia.'
    case 'passou': return 'Esse horário já passou.'
    default: return 'Esse horário já foi encerrado.'
  }
}
