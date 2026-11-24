// Tela "Clientes fixos": junta os horários da mesma série (recurrence_id) num
// cliente só, com o próximo horário, quantos ainda faltam e quando acaba.
import type { BarbershopAppointment } from '@/types/tenant'
import { addDemoBooking } from '@/lib/demoBookings'

export interface FixedSeries {
  id: string
  clientName: string
  clientPhone: string
  barberId: string
  barberName: string
  serviceName: string
  time: string
  everyDays: number
  /** Horários de hoje pra frente ainda marcados (pendente/confirmado). */
  upcoming: BarbershopAppointment[]
  /** Última data da série (qualquer status): estender continua dela. */
  lastDate: string
  doneCount: number
  noShowCount: number
  /** Horário reservado: o site não deixa ninguém marcar por cima, até "Parar". */
  reserved: boolean
}

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

export const weekdayOf = (date: string) => WEEKDAYS[new Date(`${date}T12:00:00`).getDay()]

export const shortDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '')

/** `reservedIds` = reservas ativas no banco; sem ela (demo), vale ter horário marcado pra frente. */
export function groupSeries(apts: BarbershopAppointment[], today: string, reservedIds?: Set<string>): FixedSeries[] {
  const map = new Map<string, BarbershopAppointment[]>()
  for (const a of apts) {
    if (!a.recurrenceId) continue
    const list = map.get(a.recurrenceId)
    if (list) list.push(a)
    else map.set(a.recurrenceId, [a])
  }
  const out: FixedSeries[] = []
  for (const [id, list] of map) {
    const sorted = [...list].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    const upcoming = sorted.filter(a => a.date >= today && (a.status === 'pending' || a.status === 'confirmed'))
    // Os dados do cliente vêm do horário mais recente (pode ter trocado de barbeiro/serviço)
    const ref = upcoming[0] ?? sorted[sorted.length - 1]
    out.push({
      id,
      clientName: ref.clientName,
      clientPhone: ref.clientPhone,
      barberId: ref.barberId,
      barberName: ref.barberName,
      serviceName: ref.serviceName,
      time: ref.time.slice(0, 5),
      everyDays: ref.recurrenceEveryDays ?? 7,
      upcoming,
      lastDate: sorted[sorted.length - 1].date,
      doneCount: sorted.filter(a => a.status === 'done').length,
      noShowCount: sorted.filter(a => a.status === 'no_show').length,
      reserved: reservedIds ? reservedIds.has(id) : upcoming.length > 0,
    })
  }
  return out.sort((a, b) => a.time.localeCompare(b.time) || b.lastDate.localeCompare(a.lastDate))
}

/** Próxima data do ritmo da série a partir de hoje (pra agrupar por dia mesmo sem horário criado). */
export function nextOnRhythm(s: FixedSeries, today: string): string {
  if (s.upcoming[0]) return s.upcoming[0].date
  const d = new Date(`${s.lastDate}T12:00:00`)
  while (d.toLocaleDateString('sv-SE') < today) d.setDate(d.getDate() + s.everyDays)
  return d.toLocaleDateString('sv-SE')
}

/** Reserva projetada que cai em `date` (site demo): série reservada, data no ritmo, sem horário dela nesse dia. */
export function reservedOn(series: FixedSeries[], all: BarbershopAppointment[], date: string, barberId?: string): { start: string; duration: number }[] {
  return series
    .filter(s => s.reserved && (!barberId || s.barberId === barberId) && date > s.lastDate)
    .filter(s => Math.round((new Date(`${date}T12:00:00`).getTime() - new Date(`${s.lastDate}T12:00:00`).getTime()) / 86_400_000) % s.everyDays === 0)
    .filter(s => !all.some(a => a.recurrenceId === s.id && a.date === date))
    .map(s => ({ start: s.time, duration: all.find(a => a.recurrenceId === s.id)?.durationMin ?? 30 }))
}

/** Demo: o mesmo que ensure_fixed_appointments faz no banco (cria o que falta nas próximas semanas). */
export function topUpDemoFixed(all: BarbershopAppointment[], today: string, days = 35): number {
  const end = new Date(`${today}T12:00:00`)
  end.setDate(end.getDate() + days)
  const endIso = end.toLocaleDateString('sv-SE')
  let n = 0
  for (const s of groupSeries(all, today).filter(x => x.reserved)) {
    const ref = s.upcoming[s.upcoming.length - 1]
    if (!ref) continue
    const d = new Date(`${s.lastDate}T12:00:00`)
    for (d.setDate(d.getDate() + s.everyDays); d.toLocaleDateString('sv-SE') <= endIso; d.setDate(d.getDate() + s.everyDays)) {
      const date = d.toLocaleDateString('sv-SE')
      if (date < today || all.some(a => a.recurrenceId === s.id && a.date === date)) continue
      addDemoBooking({ ...ref, id: `${s.id}-auto-${date}`, date, status: 'confirmed', remindedAt: undefined, reviewRequestedAt: undefined })
      n++
    }
  }
  return n
}
