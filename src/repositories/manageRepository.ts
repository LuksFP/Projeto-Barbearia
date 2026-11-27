// "Meu horário": o cliente cancela, remarca e avalia pelo link só dele.
// Demo: o token é o id do horário marcado no site demo.
import { supabasePublic } from '@/lib/supabase-public'
import { isRealBarbershopId } from '@/lib/placeOrder'
import { listDemoBookings, updateDemoBooking } from '@/lib/demoBookings'
import { featuresRepository } from './featuresRepository'
import { scheduleBlockRepository } from './scheduleBlockRepository'
import { toMin, type BusyRange } from '@/lib/scheduling'
import type { LockReason } from '@/lib/extras'

export interface ManagedAppointment {
  clientName: string; serviceName: string; barberId: string | null; barberName: string
  date: string; time: string; durationMin: number; status: string
  minHours: number | null; lockReason: LockReason | null; reschedulesLeft: number
  canReview: boolean; rating: number | null
}

const reviewKey = (id: string) => `barberos:avaliado:${id}`

export const manageRepository = {
  async get(bs: string, token: string): Promise<ManagedAppointment | null> {
    if (!isRealBarbershopId(bs)) {
      const a = listDemoBookings(bs).find(x => x.id === token)
      if (!a) return null
      const f = await featuresRepository.publicFeatures(bs)
      const startsIn = (new Date(`${a.date}T${a.time}:00`).getTime() - Date.now()) / 3_600_000
      const lockReason: LockReason | null =
        a.status !== 'pending' && a.status !== 'confirmed' ? 'encerrado' : startsIn <= 0 ? 'passou'
          : f.selfCancelHours === null ? 'desligado' : a.recurrenceId ? 'fixo' : startsIn < f.selfCancelHours ? 'prazo' : null
      const rating = Number(localStorage.getItem(reviewKey(a.id))) || null
      return {
        clientName: a.clientName.split(' ')[0], serviceName: a.serviceName, barberId: a.barberId || null, barberName: a.barberName,
        date: a.date, time: a.time, durationMin: a.durationMin, status: a.status, minHours: f.selfCancelHours,
        lockReason, reschedulesLeft: 3, canReview: f.reviewsEnabled && a.status === 'done' && !rating, rating,
      }
    }
    if (!/^[0-9a-f-]{36}$/i.test(token)) return null
    const { data, error } = await supabasePublic.rpc('public_manage_get', { p_token: token })
    if (error) throw error
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null
    const d = data as Record<string, unknown>
    if (d.barbershop_id !== bs) return null
    return {
      clientName: String(d.client_name ?? ''), serviceName: String(d.service_name ?? ''),
      barberId: (d.barber_id as string | null) ?? null, barberName: String(d.barber_name ?? ''),
      date: String(d.date), time: String(d.time), durationMin: Number(d.duration_min), status: String(d.status),
      minHours: (d.min_hours as number | null) ?? null, lockReason: (d.lock_reason as LockReason | null) ?? null,
      reschedulesLeft: Number(d.reschedules_left), canReview: d.can_review === true, rating: (d.rating as number | null) ?? null,
    }
  },

  /** Ocupados do dia pra remarcar, sem contar o próprio horário. */
  async busy(bs: string, mine: ManagedAppointment, date: string): Promise<BusyRange[]> {
    const own = { start: toMin(mine.time), end: toMin(mine.time) + mine.durationMin }
    let list: BusyRange[]
    if (!isRealBarbershopId(bs)) {
      list = listDemoBookings(bs)
        .filter(a => a.date === date && a.status !== 'cancelled' && (a.barberId || null) === mine.barberId)
        .map(a => ({ start: toMin(a.time), end: toMin(a.time) + a.durationMin }))
    } else {
      const { data, error } = await supabasePublic.rpc('public_barber_busy_slots', { p_barbershop_id: bs, p_barber_id: mine.barberId, p_date: date })
      if (error) throw error
      list = (data ?? []).map(r => ({ start: toMin(r.slot_time), end: toMin(r.slot_time) + (r.slot_duration || 30) }))
    }
    if (date === mine.date) {
      const i = list.findIndex(r => r.start === own.start && r.end === own.end)
      if (i >= 0) list.splice(i, 1)
    }
    return [...list, ...await scheduleBlockRepository.publicDay(bs, mine.barberId, date)]
  },

  async cancel(bs: string, token: string): Promise<void> {
    if (!isRealBarbershopId(bs)) { updateDemoBooking(bs, token, { status: 'cancelled', clientChange: 'Cancelado pelo cliente no link' }); return }
    const { error } = await supabasePublic.rpc('public_manage_cancel', { p_token: token })
    if (error) throw error
  },

  async reschedule(bs: string, token: string, date: string, time: string): Promise<void> {
    if (!isRealBarbershopId(bs)) {
      const a = listDemoBookings(bs).find(x => x.id === token)
      if (a) updateDemoBooking(bs, token, { date, time, clientChange: `Remarcado pelo cliente (era ${a.date.slice(8)}/${a.date.slice(5, 7)} às ${a.time})` })
      return
    }
    const { error } = await supabasePublic.rpc('public_manage_reschedule', { p_token: token, p_date: date, p_time: time })
    if (error) throw error
  },

  async review(bs: string, token: string, rating: number, text: string): Promise<void> {
    if (!isRealBarbershopId(bs)) { localStorage.setItem(reviewKey(token), String(rating)); return }
    const { error } = await supabasePublic.rpc('public_manage_review', { p_token: token, p_rating: rating, p_review: text.trim() || null })
    if (error) throw error
  },
}
