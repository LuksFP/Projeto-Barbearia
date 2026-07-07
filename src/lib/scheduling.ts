// Motor de horários da agenda. Gera slots com granularidade = tempo de corte do
// barbeiro e bloqueia os ranges já ocupados (um atendimento de 15 min às 15:00
// trava 15:00–15:15 pra aquele barbeiro).
import type { BarbershopAppointment } from '@/types/tenant'

export const DEFAULT_OPEN = '09:00'
export const DEFAULT_CLOSE = '24:00'   // meia-noite

export interface Slot {
  time: string        // início 'HH:MM'
  end: string         // término 'HH:MM' (início + duração)
  available: boolean
}

export interface BusyRange {
  start: number       // minutos desde 00:00
  end: number
}

export function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function toHHMM(min: number): string {
  const wrapped = ((min % 1440) + 1440) % 1440   // 1440 (24:00) → 00:00
  const h = Math.floor(wrapped / 60)
  const m = wrapped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd
}

/**
 * Ranges ocupados por um barbeiro numa data. Ignora cancelados. A duração de
 * cada atendimento vem de `durationMin` (fallback 30 min).
 * Opcionalmente ignora um agendamento (ex: ao editar o próprio).
 */
export function busyRanges(
  appointments: BarbershopAppointment[],
  barberId: string,
  date: string,
  ignoreId?: string,
): BusyRange[] {
  return appointments
    .filter(a =>
      a.date === date &&
      a.barberId === barberId &&
      a.status !== 'cancelled' &&
      a.id !== ignoreId,
    )
    .map(a => {
      const start = toMin(a.time)
      return { start, end: start + (a.durationMin || 30) }
    })
}

export interface BuildSlotsOptions {
  step: number             // granularidade dos slots (min) = tempo de corte
  duration: number         // quanto o novo atendimento ocupa (min)
  busy: BusyRange[]
  open?: string
  close?: string
  now?: Date               // se a data for hoje, corta horários já passados
  date?: string            // 'YYYY-MM-DD' do slot sendo gerado
}

/**
 * Gera os slots do dia. Um slot fica indisponível se o novo atendimento
 * [slot, slot+duration) sobrepõe algum range ocupado, ou se estoura o fechamento,
 * ou se já passou (quando a data é hoje).
 */
export function buildDaySlots(opts: BuildSlotsOptions): Slot[] {
  const open = toMin(opts.open ?? DEFAULT_OPEN)
  const close = toMin(opts.close ?? DEFAULT_CLOSE)
  const step = Math.max(5, Math.round(opts.step))
  const duration = Math.max(5, Math.round(opts.duration))

  let minNow = -1
  if (opts.now && opts.date) {
    const todayStr = `${opts.now.getFullYear()}-${String(opts.now.getMonth() + 1).padStart(2, '0')}-${String(opts.now.getDate()).padStart(2, '0')}`
    if (todayStr === opts.date) minNow = opts.now.getHours() * 60 + opts.now.getMinutes()
  }

  const slots: Slot[] = []
  for (let t = open; t + duration <= close; t += step) {
    if (t < minNow) continue
    const end = t + duration
    const available = !opts.busy.some(b => overlaps(t, end, b.start, b.end))
    slots.push({ time: toHHMM(t), end: toHHMM(end), available })
  }
  return slots
}

/** Checa se um horário específico está livre (usado como guarda no submit). */
export function isTimeAvailable(
  time: string,
  duration: number,
  busy: BusyRange[],
): boolean {
  const start = toMin(time)
  const end = start + Math.max(5, duration)
  return !busy.some(b => overlaps(start, end, b.start, b.end))
}
