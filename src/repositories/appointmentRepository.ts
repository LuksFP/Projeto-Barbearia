// Substitui: src/services/appointmentService.ts (in-memory array)
import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'
import type { MonthRevenue } from '@/types/tenant'

export type AppointmentRow = Tables<'appointments'>
export type AppointmentInsert = TablesInsert<'appointments'>

interface RevenueRow {
  date: string
  price: number | null
  service_category: string | null
  barber_id: string | null
  barber_name: string | null
}

/**
 * Horários que viram receita: concluídos + "faltou" que o cliente já tinha
 * pagado online (a barbearia ficou com o valor). Falta sem pagamento não entra.
 */
async function revenueRows(barbershopId: string, fromDate: string, toDate?: string): Promise<RevenueRow[]> {
  const cols = 'id, date, price, service_category, barber_id, barber_name'
  const [done, noShow] = await Promise.all([
    supabase.from('appointments').select(cols)
      .eq('barbershop_id', barbershopId).eq('status', 'done')
      .gte('date', fromDate).lte('date', toDate ?? '9999-12-31').not('price', 'is', null),
    supabase.from('appointments').select(cols)
      .eq('barbershop_id', barbershopId).eq('status', 'no_show')
      .gte('date', fromDate).lte('date', toDate ?? '9999-12-31').not('price', 'is', null),
  ])
  if (done.error) throw done.error
  if (noShow.error) throw noShow.error

  let paidNoShow: RevenueRow[] = []
  const ids = (noShow.data ?? []).map(r => r.id)
  if (ids.length) {
    const { data: paid, error } = await supabase
      .from('online_payments').select('appointment_id')
      .eq('status', 'pago').in('appointment_id', ids)
    if (error) throw error
    const paidIds = new Set((paid ?? []).map(p => p.appointment_id))
    paidNoShow = (noShow.data ?? []).filter(r => paidIds.has(r.id))
  }
  return [...(done.data ?? []), ...paidNoShow]
}

export const appointmentRepository = {
  async listByBarbershop(barbershopId: string, date?: string): Promise<AppointmentRow[]> {
    let query = supabase
      .from('appointments')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('date')
      .order('time')

    if (date) query = query.eq('date', date)

    const { data, error } = await query
    if (error) throw error
    return data ?? []
  },

  async listByUser(userId: string): Promise<AppointmentRow[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async listByContact(barbershopId: string, email?: string, phone?: string): Promise<AppointmentRow[]> {
    let query = supabase
      .from('appointments')
      .select('*')
      .eq('barbershop_id', barbershopId)

    if (email && phone) {
      query = query.or(`client_email.ilike.${email},client_phone.eq.${phone}`)
    } else if (email) {
      query = query.ilike('client_email', email)
    } else if (phone) {
      query = query.eq('client_phone', phone)
    }

    const { data, error } = await query.order('date', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async create(input: AppointmentInsert): Promise<AppointmentRow> {
    const { data, error } = await supabase
      .from('appointments')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateStatus(id: string, status: AppointmentRow['status']): Promise<AppointmentRow> {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status } as TablesUpdate<'appointments'>)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /** Apaga de vez. Devolve quantos saíram: RLS só deixa dono/admin, e pra
   *  quem não pode o Supabase não dá erro — só apaga 0. */
  async remove(ids: string[]): Promise<number> {
    if (!ids.length) return 0
    const { data, error } = await supabase
      .from('appointments')
      .delete()
      .in('id', ids)
      .select('id')
    if (error) throw error
    return data?.length ?? 0
  },

  /** Marca que a equipe pediu avaliação no Google pra esse atendimento. */
  async setReviewRequested(id: string): Promise<AppointmentRow> {
    const { data, error } = await supabase
      .from('appointments')
      .update({ review_requested_at: new Date().toISOString() } as TablesUpdate<'appointments'>)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /**
   * Cliente fixo: cria as próximas datas copiando o horário base. Cada data
   * entra sozinha — se uma bater com outro horário (ou cair fora do
   * expediente), pula e segue. O horário base entra na série também.
   */
  async createSeries(baseId: string, dates: string[], everyDays: number): Promise<{ created: AppointmentRow[]; skipped: { date: string; reason: string }[] }> {
    const { data: base, error: readErr } = await supabase.from('appointments').select('*').eq('id', baseId).single()
    if (readErr) throw readErr
    const recurrenceId = crypto.randomUUID()
    const { error: baseErr } = await supabase
      .from('appointments')
      .update({ recurrence_id: recurrenceId, recurrence_every_days: everyDays } as TablesUpdate<'appointments'>)
      .eq('id', base.id)
    if (baseErr) throw baseErr
    const created: AppointmentRow[] = []
    const skipped: { date: string; reason: string }[] = []
    for (const date of dates) {
      const { data, error } = await supabase.from('appointments').insert({
        barbershop_id: base.barbershop_id,
        client_name: base.client_name,
        client_phone: base.client_phone,
        client_email: base.client_email,
        service_id: base.service_id,
        service_ids: base.service_ids,
        service_name: base.service_name,
        service_category: base.service_category,
        barber_id: base.barber_id,
        barber_name: base.barber_name,
        date,
        time: base.time,
        duration_min: base.duration_min,
        price: base.price,
        notes: base.notes,
        status: 'confirmed',
        recurrence_id: recurrenceId,
        recurrence_every_days: everyDays,
      }).select().single()
      if (error) {
        const msg = `${error.code ?? ''} ${error.message ?? ''}`
        skipped.push({ date, reason: /23P01|no_overlap/.test(msg) ? 'horário ocupado' : /expediente|fechamento/i.test(msg) ? 'fora do expediente' : 'não deu pra marcar' })
      } else if (data) created.push(data)
    }
    return { created, skipped }
  },

  /** Para a série: cancela os horários futuros (depois de `afterDate`) ainda abertos. */
  async stopSeries(recurrenceId: string, afterDate: string): Promise<number> {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' } as TablesUpdate<'appointments'>)
      .eq('recurrence_id', recurrenceId)
      .gt('date', afterDate)
      .in('status', ['pending', 'confirmed'])
      .select('id')
    if (error) throw error
    return data?.length ?? 0
  },

  async setReminded(id: string, reminded: boolean): Promise<AppointmentRow> {
    const { data, error } = await supabase
      .from('appointments')
      .update({ reminded_at: reminded ? new Date().toISOString() : null } as TablesUpdate<'appointments'>)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async addRating(id: string, rating: number, review?: string): Promise<AppointmentRow> {
    const { data, error } = await supabase
      .from('appointments')
      .update({ rating, review: review ?? null } as TablesUpdate<'appointments'>)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('appointments').delete().eq('id', id)
    if (error) throw error
  },

  async getFinancials(barbershopId: string, months = 6): Promise<{
    byMonth: MonthRevenue[]
    byBarber: { barberId: string; barberName: string; total: number; count: number }[]
    /** Receita por mês e por barbeiro ('YYYY-MM' → barberId → R$), pra comissão mês a mês */
    byMonthBarber: Record<string, Record<string, number>>
    totalRevenue: number
    totalCount: number
    avgTicket: number
  }> {
    const from = new Date()
    from.setMonth(from.getMonth() - months)
    from.setDate(1)

    const rows = await revenueRows(barbershopId, from.toISOString().split('T')[0])

    const PT_MONTHS = [
      'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
      'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
    ]

    const byMonthMap = new Map<string, { total: number; count: number; byCategory: Record<string, number> }>()
    const byBarberMap = new Map<string, { barberName: string; total: number; count: number }>()
    const byMonthBarber: Record<string, Record<string, number>> = {}

    for (const row of rows) {
      const price = Number(row.price) || 0
      const month = row.date.slice(0, 7)

      // por mês
      if (!byMonthMap.has(month)) byMonthMap.set(month, { total: 0, count: 0, byCategory: {} })
      const m = byMonthMap.get(month)!
      m.total += price
      m.count += 1
      const cat = row.service_category ?? 'Outros'
      m.byCategory[cat] = (m.byCategory[cat] ?? 0) + price

      // por barbeiro
      const bid = row.barber_id ?? 'unknown'
      if (!byBarberMap.has(bid)) byBarberMap.set(bid, { barberName: row.barber_name ?? 'A definir', total: 0, count: 0 })
      const b = byBarberMap.get(bid)!
      b.total += price
      b.count += 1
      byMonthBarber[month] ??= {}
      byMonthBarber[month][bid] = (byMonthBarber[month][bid] ?? 0) + price
    }

    const byMonth = Array.from(byMonthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => {
        const mm = parseInt(month.slice(5, 7), 10)
        return {
          month,
          label: PT_MONTHS[mm - 1],
          total: Math.round(d.total * 100) / 100,
          byCategory: Object.fromEntries(
            Object.entries(d.byCategory).map(([k, v]) => [k, Math.round(v * 100) / 100])
          ),
        }
      })

    const byBarber = Array.from(byBarberMap.entries())
      .map(([barberId, d]) => ({ barberId, barberName: d.barberName, total: Math.round(d.total * 100) / 100, count: d.count }))
      .sort((a, b) => b.total - a.total)

    const totalRevenue = byMonth.reduce((s, m) => s + m.total, 0)
    const totalCount = rows.length
    const avgTicket = totalCount > 0 ? Math.round((totalRevenue / totalCount) * 100) / 100 : 0

    return { byMonth, byBarber, byMonthBarber, totalRevenue, totalCount, avgTicket }
  },

  /** Receita e atendimentos por barbeiro entre duas datas (inclusive) — fechamento da semana. */
  async revenueByBarber(barbershopId: string, from: string, to: string): Promise<Record<string, { revenue: number; count: number }>> {
    const rows = await revenueRows(barbershopId, from, to)
    const out: Record<string, { revenue: number; count: number }> = {}
    for (const r of rows) {
      const id = r.barber_id ?? 'unknown'
      out[id] ??= { revenue: 0, count: 0 }
      out[id].revenue += Number(r.price) || 0
      out[id].count += 1
    }
    return out
  },

  async getMonthlyRevenue(barbershopId: string): Promise<MonthRevenue[]> {
    // Busca agendamentos concluídos dos últimos 3 meses com price preenchido
    const from = new Date()
    from.setMonth(from.getMonth() - 3)
    from.setDate(1)

    const data = await revenueRows(barbershopId, from.toISOString().split('T')[0])

    const PT_MONTHS = [
      'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
      'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
    ]

    // Agrega por mês em TypeScript (evita RPC)
    const byMonth = new Map<string, { total: number; byCategory: Record<string, number> }>()

    for (const row of data) {
      const month = row.date.slice(0, 7) // 'YYYY-MM'
      if (!byMonth.has(month)) byMonth.set(month, { total: 0, byCategory: {} })
      const entry = byMonth.get(month)!
      const price = Number(row.price) || 0
      entry.total += price
      const cat = row.service_category ?? 'Outros'
      entry.byCategory[cat] = (entry.byCategory[cat] ?? 0) + price
    }

    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, d]) => {
        const mm = parseInt(month.slice(5, 7), 10)
        return {
          month,
          label: PT_MONTHS[mm - 1],
          total: Math.round(d.total * 100) / 100,
          byCategory: Object.fromEntries(
            Object.entries(d.byCategory).map(([k, v]) => [k, Math.round(v * 100) / 100])
          ),
        }
      })
  },
}
