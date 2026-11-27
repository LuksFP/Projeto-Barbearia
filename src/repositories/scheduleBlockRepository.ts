// Folgas e bloqueios. Painel: lê, cria e apaga (o banco decide quem pode).
// Site (anon): só os períodos do dia, sem motivo. Demo (id não é uuid):
// localStorage compartilhado entre site e painel.
import { supabase } from '@/lib/supabase'
import { supabasePublic } from '@/lib/supabase-public'
import { isRealBarbershopId } from '@/lib/placeOrder'
import { blockRanges, type NewScheduleBlock, type ScheduleBlock } from '@/lib/blocks'
import { toMin, type BusyRange } from '@/lib/scheduling'
import type { Tables } from '@/types/database'

const demoKey = (bsId: string) => `barberos:bloqueios:${bsId}`
const demoLoad = (bsId: string): ScheduleBlock[] => {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(demoKey(bsId)) ?? '[]')
    return Array.isArray(raw) ? raw as ScheduleBlock[] : []
  } catch { return [] }
}
const demoSave = (bsId: string, list: ScheduleBlock[]) => {
  try { localStorage.setItem(demoKey(bsId), JSON.stringify(list)) } catch { /* ignora */ }
}

const fromRow = (r: Tables<'schedule_blocks'>): ScheduleBlock => ({
  id: r.id, barbershopId: r.barbershop_id, barberId: r.barber_id, weekdays: r.weekdays,
  dateFrom: r.date_from, dateTo: r.date_to, startTime: r.start_time, endTime: r.end_time, reason: r.reason,
})

export const scheduleBlockRepository = {
  async list(barbershopId: string): Promise<ScheduleBlock[]> {
    if (!isRealBarbershopId(barbershopId)) return demoLoad(barbershopId)
    const { data, error } = await supabase.from('schedule_blocks').select('*')
      .eq('barbershop_id', barbershopId).order('created_at')
    if (error) throw error
    return (data ?? []).map(fromRow)
  },

  async create(block: NewScheduleBlock): Promise<ScheduleBlock> {
    if (!isRealBarbershopId(block.barbershopId)) {
      const saved = { ...block, id: `blq-${crypto.randomUUID()}` }
      demoSave(block.barbershopId, [...demoLoad(block.barbershopId), saved])
      return saved
    }
    const { data, error } = await supabase.from('schedule_blocks').insert({
      barbershop_id: block.barbershopId, barber_id: block.barberId, weekdays: block.weekdays,
      date_from: block.dateFrom, date_to: block.dateTo, start_time: block.startTime, end_time: block.endTime,
      reason: block.reason,
    }).select().single()
    if (error) throw error
    return fromRow(data)
  },

  async remove(barbershopId: string, id: string): Promise<void> {
    if (!isRealBarbershopId(barbershopId)) {
      demoSave(barbershopId, demoLoad(barbershopId).filter(b => b.id !== id))
      return
    }
    // Sem permissão o RLS não dá erro, só não apaga: confere o que saiu.
    const { data, error } = await supabase.from('schedule_blocks').delete().eq('id', id).select('id')
    if (error) throw error
    if (!data?.length) throw new Error('Sem permissão pra remover esse bloqueio')
  },

  /** Site: períodos bloqueados do barbeiro no dia. */
  async publicDay(barbershopId: string, barberId: string | null, date: string): Promise<BusyRange[]> {
    if (!isRealBarbershopId(barbershopId)) return blockRanges(demoLoad(barbershopId), barberId, date)
    const { data, error } = await supabasePublic.rpc('public_schedule_blocks', {
      p_barbershop_id: barbershopId, p_barber_id: barberId, p_date: date,
    })
    if (error) throw error
    return (data ?? []).map(r => {
      const start = toMin(r.slot_time)
      return { start, end: start + r.slot_duration, blocked: true }
    })
  },
}
