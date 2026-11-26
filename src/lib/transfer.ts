// Transferir um horário marcado: outro dia, outra hora ou outro barbeiro.
import { barberHours, buildDaySlots, busyRanges, isTimeAvailable, toHHMM, toMin, DEFAULT_CLOSE, DEFAULT_OPEN, type Slot } from './scheduling'
import type { BarbershopAppointment } from '@/types/tenant'

interface Options {
  apt: BarbershopAppointment
  /** Horários do dia de destino (pode incluir o próprio). */
  appointments: BarbershopAppointment[]
  date: string
  barberId: string
  barber?: { workStart?: string; workEnd?: string } | null
  shop: { open?: string; close?: string }
  now?: Date
}

export function transferSlots({ apt, appointments, date, barberId, barber, shop, now = new Date() }: Options): Slot[] {
  const duration = apt.durationMin || 30
  const busy = busyRanges(appointments, barberId, date, apt.id)
  const hours = barberHours(shop.open, shop.close, barber)
  const slots = buildDaySlots({ step: Math.min(30, duration), duration, busy, open: hours.open, close: hours.close, now, date })

  // No mesmo dia, a hora atual continua na lista mesmo já tendo passado (ou fora
  // da grade): é o caso de trocar só o barbeiro.
  const time = apt.time.slice(0, 5)
  if (date !== apt.date || slots.some(s => s.time === time)) return slots
  const start = toMin(time)
  const open = toMin(hours.open || DEFAULT_OPEN)
  let close = toMin(hours.close || DEFAULT_CLOSE)
  if (close <= open) close += 1440
  if (start < open || start + duration > close || !isTimeAvailable(time, duration, busy)) return slots
  return [...slots, { time, end: toHHMM(start + duration), available: true }].sort((a, b) => toMin(a.time) - toMin(b.time))
}

/** Mensagem avisando o cliente do horário novo. */
export function buildTransferNotice(clientName: string, shopName: string, date: string, time: string, barberName: string): string {
  const first = clientName.trim().split(/\s+/)[0] || ''
  const day = new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })
  const withBarber = barberName && barberName !== 'A definir' ? ` com ${barberName}` : ''
  return `Olá${first ? `, ${first}` : ''}! Seu horário na ${shopName} mudou: agora é ${day} às ${time.slice(0, 5)}${withBarber}. Se não der pra você, é só responder aqui.`
}

/** "12/03 às 15:00 com Lucas" — o mesmo texto que o banco grava no registro do dia antigo. */
export function transferLabel(date: string, time: string, barberName: string): string {
  const [, m, d] = date.split('-')
  return `${d}/${m} às ${time.slice(0, 5)}${barberName && barberName !== 'A definir' ? ` com ${barberName}` : ''}`
}
