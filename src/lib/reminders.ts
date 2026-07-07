// Lembretes de agendamento (anti no-show). Sem API de WhatsApp — gera mensagem
// pronta pra enviar via wa.me, igual ao padrão das cobranças. Marca quem já foi lembrado.
import type { Barbershop, BarbershopAppointment, BarbershopBarber, BarbershopService } from '@/types/tenant'

export { buildWhatsappUrl } from '@/lib/clubBilling'

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

export function parseDate(d: string): Date {
  const [y, m, dd] = d.split('-').map(Number)
  return new Date(y, m - 1, dd)
}

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Quantos dias a data está à frente de hoje (0 = hoje, 1 = amanhã, negativo = passado). */
export function dayOffset(dateStr: string, now: Date = new Date()): number {
  const a = parseDate(dateStr).getTime()
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round((a - b) / 86_400_000)
}

export function dayLabel(dateStr: string, now: Date = new Date()): string {
  const off = dayOffset(dateStr, now)
  const d = parseDate(dateStr)
  const ddmm = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  if (off === 0) return `hoje (${ddmm})`
  if (off === 1) return `amanhã (${ddmm})`
  return `${WEEKDAYS[d.getDay()]} (${ddmm})`
}

export function buildReminderMessage(apt: BarbershopAppointment, barbershop: Barbershop): string {
  const first = apt.clientName.trim().split(/\s+/)[0]
  return [
    `Oi, ${first}! Tudo certo? 💈`,
    ``,
    `Passando pra confirmar seu horário na ${barbershop.name}:`,
    `🗓️ ${dayLabel(apt.date)} às ${apt.time}`,
    `✂️ ${apt.serviceName}${apt.barberName ? ` com ${apt.barberName}` : ''}`,
    ``,
    `Posso confirmar? Se precisar remarcar, é só me avisar por aqui. 👍`,
  ].join('\n')
}

// ─── "Já lembrei" (persistência local, ajuda visual) ──────────────────────────

const KEY = (barbershopId: string) => `barberos:reminded:${barbershopId}`

export function loadReminded(barbershopId: string): string[] {
  try {
    const raw = localStorage.getItem(KEY(barbershopId))
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function toggleReminded(barbershopId: string, aptId: string): string[] {
  const cur = loadReminded(barbershopId)
  const next = cur.includes(aptId) ? cur.filter(id => id !== aptId) : [...cur, aptId]
  try { localStorage.setItem(KEY(barbershopId), JSON.stringify(next)) } catch { /* ignore */ }
  return next
}

// ─── Gerador de dados demo (hoje + amanhã) ────────────────────────────────────

const DEMO_NAMES = [
  'Rafael Dias', 'Bruno Costa', 'Igor Menezes', 'Paulo Serra',
  'Wesley Amaral', 'Tiago Rocha', 'Léo Prado', 'Marcelo Vaz',
]

const DEMO_SLOTS: { off: number; time: string; status: BarbershopAppointment['status'] }[] = [
  { off: 0, time: '09:00', status: 'confirmed' },
  { off: 0, time: '10:30', status: 'pending' },
  { off: 0, time: '14:00', status: 'pending' },
  { off: 0, time: '16:30', status: 'confirmed' },
  { off: 1, time: '09:30', status: 'pending' },
  { off: 1, time: '11:00', status: 'pending' },
  { off: 1, time: '15:00', status: 'confirmed' },
  { off: 1, time: '18:00', status: 'pending' },
]

export function generateDemoUpcoming(
  barbershopId: string,
  barbers: BarbershopBarber[],
  services: BarbershopService[],
  now: Date = new Date(),
): BarbershopAppointment[] {
  const activeBarbers = barbers.filter(b => b.active)
  const svc = services.filter(s => s.active)
  if (activeBarbers.length === 0 || svc.length === 0) return []

  return DEMO_SLOTS.map((slot, i) => {
    const b = activeBarbers[i % activeBarbers.length]
    const service = svc[i % svc.length]
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + slot.off)
    return {
      id: `demo-apt-${barbershopId}-${i}`,
      barbershopId,
      clientName: DEMO_NAMES[i % DEMO_NAMES.length],
      clientPhone: `5511${String(980000000 + i * 1111111).slice(0, 9)}`,
      barberId: b.id,
      barberName: b.name,
      serviceId: service.id,
      serviceName: service.name,
      serviceCategory: service.category,
      date: ymd(d),
      time: slot.time,
      durationMin: service.durationMin,
      status: slot.status,
      price: service.price,
    }
  })
}
