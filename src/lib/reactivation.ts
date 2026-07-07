// Reativação de clientes "sumidos": usa a última visita pra achar quem não
// aparece há um tempo e gera um convite de volta pra mandar no WhatsApp.
import type { Barbershop, BarbershopClient } from '@/types/tenant'

export { buildWhatsappUrl } from '@/lib/clubBilling'

/** Dias desde uma data 'YYYY-MM-DD' (null se vazia/inválida). */
export function daysSince(dateStr: string, now: Date = new Date()): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T12:00:00')
  if (isNaN(d.getTime())) return null
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return Math.max(0, Math.round((a - b) / 86_400_000))
}

export function humanizeDays(days: number): string {
  if (days < 30) return `há ${days} ${days === 1 ? 'dia' : 'dias'}`
  if (days < 365) {
    const m = Math.floor(days / 30)
    return `há ${m} ${m === 1 ? 'mês' : 'meses'}`
  }
  const y = Math.floor(days / 365)
  return `há ${y} ${y === 1 ? 'ano' : 'anos'}`
}

export function buildReactivationMessage(client: BarbershopClient, barbershop: Barbershop): string {
  const first = client.name.trim().split(/\s+/)[0]
  return [
    `Fala, ${first}! Aqui é da ${barbershop.name}. 💈`,
    ``,
    `Faz um tempo que você não passa aqui e a cadeira tá sentindo sua falta! 😄`,
    `Bora marcar um horário pra deixar o visual em dia?`,
    ``,
    `É só responder por aqui que eu já encaixo você. 👊`,
  ].join('\n')
}

// ─── "Já contatei" (persistência local, ajuda visual) ─────────────────────────

const KEY = (barbershopId: string) => `barberos:reactivated:${barbershopId}`

export function loadContacted(barbershopId: string): string[] {
  try {
    const raw = localStorage.getItem(KEY(barbershopId))
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function toggleContacted(barbershopId: string, clientId: string): string[] {
  const cur = loadContacted(barbershopId)
  const next = cur.includes(clientId) ? cur.filter(id => id !== clientId) : [...cur, clientId]
  try { localStorage.setItem(KEY(barbershopId), JSON.stringify(next)) } catch { /* ignore */ }
  return next
}
