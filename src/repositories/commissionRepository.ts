// Fechamento semanal da comissão: quem já recebeu a comissão da semana.
// Real: tabela commission_payouts (só dono/admin). Demo: localStorage.
import { supabase } from '@/lib/supabase'
import { isRealBarbershopId } from '@/lib/placeOrder'

export interface Payout {
  barberId: string
  weekStart: string
  revenue: number
  amount: number
  paidAt: string
}

const demoKey = (bsId: string) => `barberos:comissao-paga:${bsId}`
const demoLoad = (bsId: string): Payout[] => {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(demoKey(bsId)) ?? '[]')
    return Array.isArray(raw) ? raw as Payout[] : []
  } catch { return [] }
}
const demoSave = (bsId: string, list: Payout[]) => {
  try { localStorage.setItem(demoKey(bsId), JSON.stringify(list)) } catch { /* ignora */ }
}

export const commissionRepository = {
  async listWeek(barbershopId: string, weekStart: string): Promise<Payout[]> {
    if (!isRealBarbershopId(barbershopId)) return demoLoad(barbershopId).filter(p => p.weekStart === weekStart)
    const { data, error } = await supabase
      .from('commission_payouts')
      .select('barber_id, week_start, revenue, amount, paid_at')
      .eq('barbershop_id', barbershopId)
      .eq('week_start', weekStart)
    if (error) throw error
    return (data ?? []).map(r => ({ barberId: r.barber_id, weekStart: r.week_start, revenue: Number(r.revenue), amount: Number(r.amount), paidAt: r.paid_at }))
  },

  async markPaid(barbershopId: string, p: Omit<Payout, 'paidAt'>): Promise<Payout> {
    const paid: Payout = { ...p, paidAt: new Date().toISOString() }
    if (!isRealBarbershopId(barbershopId)) {
      demoSave(barbershopId, [...demoLoad(barbershopId).filter(x => !(x.barberId === p.barberId && x.weekStart === p.weekStart)), paid])
      return paid
    }
    const { data, error } = await supabase
      .from('commission_payouts')
      .insert({ barbershop_id: barbershopId, barber_id: p.barberId, week_start: p.weekStart, revenue: p.revenue, amount: p.amount })
      .select('paid_at')
      .single()
    if (error) throw error
    return { ...paid, paidAt: data.paid_at }
  },

  async unmark(barbershopId: string, barberId: string, weekStart: string): Promise<void> {
    if (!isRealBarbershopId(barbershopId)) {
      demoSave(barbershopId, demoLoad(barbershopId).filter(x => !(x.barberId === barberId && x.weekStart === weekStart)))
      return
    }
    const { error } = await supabase.from('commission_payouts').delete()
      .eq('barbershop_id', barbershopId).eq('barber_id', barberId).eq('week_start', weekStart)
    if (error) throw error
  },
}
