// Folgas e bloqueios: dia da semana fechado, pausa que se repete e bloqueio por
// datas. Mesma regra do banco (schedule_block_hits). Sem alias "@/" em import de
// valor: o teste roda este arquivo direto.
import { toMin, type BusyRange } from './scheduling'
import type { BarbershopAppointment } from '../types/tenant'

export interface ScheduleBlock {
  id: string
  barbershopId: string
  barberId: string | null   // null = barbearia toda
  weekdays: number[] | null // 0 = domingo; preenchido = repete toda semana
  dateFrom: string | null   // 'YYYY-MM-DD'; usado quando não repete
  dateTo: string | null
  startTime: string | null  // null = dia inteiro
  endTime: string | null
  reason: string
}

export type NewScheduleBlock = Omit<ScheduleBlock, 'id'>

/** Fim usado no dia inteiro: cobre quem fecha depois da meia-noite. */
const FULL_DAY_END = 2880

const weekdayNumber = (date: string) => new Date(`${date}T12:00:00`).getDay()

export function blockApplies(b: ScheduleBlock, barberId: string | null | undefined, date: string): boolean {
  if (b.barberId && b.barberId !== barberId) return false
  if (b.weekdays) return b.weekdays.includes(weekdayNumber(date))
  return !!b.dateFrom && !!b.dateTo && date >= b.dateFrom && date <= b.dateTo
}

const rangeOf = (b: ScheduleBlock): BusyRange =>
  b.startTime && b.endTime
    ? { start: toMin(b.startTime.slice(0, 5)), end: toMin(b.endTime.slice(0, 5)), blocked: true }
    : { start: 0, end: FULL_DAY_END, blocked: true }

export const blockRanges = (blocks: ScheduleBlock[], barberId: string | null | undefined, date: string): BusyRange[] =>
  blocks.filter(b => blockApplies(b, barberId, date)).map(rangeOf)

export const fullDayBlock = (blocks: ScheduleBlock[], barberId: string | null | undefined, date: string) =>
  blocks.find(b => !b.startTime && blockApplies(b, barberId, date))

/** Horários já marcados que caem dentro do bloqueio (nada é cancelado sozinho). */
export function affectedBy(b: ScheduleBlock, appointments: BarbershopAppointment[], today: string): BarbershopAppointment[] {
  const r = rangeOf(b)
  return appointments
    .filter(a => {
      if (a.status !== 'pending' && a.status !== 'confirmed') return false
      if (a.date < today || !blockApplies(b, a.barberId, a.date)) return false
      const start = toMin(a.time)
      return start < r.end && r.start < start + (a.durationMin || 30)
    })
    .sort((x, y) => `${x.date} ${x.time}`.localeCompare(`${y.date} ${y.time}`))
}

export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`

/** "Seg a Sáb · 12:00 às 13:00" / "24/12 a 26/12 · dia inteiro" */
export function describeBlock(b: ScheduleBlock): string {
  let when = ''
  if (b.weekdays) {
    const d = [...b.weekdays].sort()
    const inRow = d.length > 2 && d[d.length - 1] - d[0] === d.length - 1
    when = d.length === 7 ? 'Todo dia' : inRow ? `${WEEKDAY_SHORT[d[0]]} a ${WEEKDAY_SHORT[d[d.length - 1]]}` : d.map(x => WEEKDAY_SHORT[x]).join(', ')
  } else if (b.dateFrom && b.dateTo) {
    when = b.dateFrom === b.dateTo ? ddmm(b.dateFrom) : `${ddmm(b.dateFrom)} a ${ddmm(b.dateTo)}`
  }
  const hours = b.startTime && b.endTime ? `${b.startTime.slice(0, 5)} às ${b.endTime.slice(0, 5)}` : 'dia inteiro'
  return `${when} · ${hours}`
}

/** Dia da semana fechado: barbearia toda, um dia só, sem hora. */
export const isClosedWeekday = (b: ScheduleBlock) => !b.barberId && !b.startTime && b.weekdays?.length === 1
