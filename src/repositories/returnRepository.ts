// Cartão fidelidade e pacotes pré-pagos. Real: as regras são do banco
// (use_package, redeem_loyalty). Demo: as mesmas no localStorage.
import { supabase } from '@/lib/supabase'
import { isRealBarbershopId } from '@/lib/placeOrder'
import { localISO } from '@/lib/month'
import { loyaltyCard, type LoyaltyCard, type ShopFeatures } from '@/lib/extras'
import { getDemoAppointments, getDemoPlan } from '@/lib/demo'
import { upsertDemoBooking } from '@/lib/demoBookings'
import { demoRead, demoWrite } from './demoStore'
import type { BarbershopAppointment, BarbershopClient } from '@/types/tenant'

export interface ClientPackage {
  id: string; clientPhone: string; name: string; totalUses: number; used: number; price: number
}
interface DemoUse { packageId: string; appointmentId: string; originalPrice: number | null }
interface DemoPrize { phone: string; appointmentId: string | null }

const digits = (s: string) => s.replace(/\D/g, '')
const NEEDS_DONE = 'Conclua o horário do cliente na Agenda antes de descontar'

const demo = {
  packs: (bs: string) => demoRead<ClientPackage[]>(`barberos:pacotes:${bs}`, []),
  savePacks: (bs: string, v: ClientPackage[]) => demoWrite(`barberos:pacotes:${bs}`, v),
  uses: (bs: string) => demoRead<DemoUse[]>(`barberos:pacote-usos:${bs}`, []),
  saveUses: (bs: string, v: DemoUse[]) => demoWrite(`barberos:pacote-usos:${bs}`, v),
  prizes: (bs: string) => demoRead<DemoPrize[]>(`barberos:premios:${bs}`, []),
  savePrizes: (bs: string, v: DemoPrize[]) => demoWrite(`barberos:premios:${bs}`, v),
  appointments: (): BarbershopAppointment[] => { const p = getDemoPlan(); return p ? getDemoAppointments(p) : [] },
  done: (phone: string) => demo.appointments().filter(a => a.status === 'done' && digits(a.clientPhone) === digits(phone))
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)),
  card(bs: string, phone: string, f: ShopFeatures, excludeId?: string): LoyaltyCard {
    const prizes = demo.prizes(bs).filter(p => p.phone === digits(phone))
    const prizeVisits = new Set(prizes.map(p => p.appointmentId))
    const visits = demo.done(phone).filter(a => a.id !== excludeId && !prizeVisits.has(a.id) && (!f.loyaltySince || a.date >= f.loyaltySince)).length
    return loyaltyCard(visits, prizes.length, f.loyaltyGoal, f.loyaltyReward)
  },
}

export const returnRepository = {
  async loyalty(bs: string, phone: string, features: ShopFeatures): Promise<LoyaltyCard | null> {
    if (!features.loyaltyEnabled || digits(phone).length < 10) return null
    if (!isRealBarbershopId(bs)) return demo.card(bs, phone, features)
    const { data, error } = await supabase.rpc('loyalty_status', { p_barbershop_id: bs, p_phone: phone })
    if (error) throw error
    const r = data?.[0]
    return r ? { visits: r.visits, goal: r.goal, reward: r.reward, available: r.rewards_available, progress: r.progress } : null
  },

  async redeem(bs: string, phone: string, features: ShopFeatures): Promise<void> {
    if (!isRealBarbershopId(bs)) {
      if (demo.card(bs, phone, features).available <= 0) throw new Error('Esse cliente ainda não completou o cartão')
      const taken = new Set(demo.prizes(bs).map(p => p.appointmentId))
      const today = demo.done(phone).find(a => a.date === localISO(new Date()) && !taken.has(a.id))
      const attach = today && demo.card(bs, phone, features, today.id).available > 0 ? today.id : null
      demo.savePrizes(bs, [...demo.prizes(bs), { phone: digits(phone), appointmentId: attach }])
      return
    }
    const { error } = await supabase.rpc('redeem_loyalty', { p_barbershop_id: bs, p_phone: phone })
    if (error) throw error
  },

  /** Pacotes ativos do cliente. */
  async packages(bs: string, client: BarbershopClient): Promise<ClientPackage[]> {
    if (!isRealBarbershopId(bs)) return demo.packs(bs).filter(p => digits(p.clientPhone) === digits(client.phone))
    const { data, error } = await supabase.from('client_packages').select('id, name, total_uses, price')
      .eq('client_id', client.id).is('cancelled_at', null).order('created_at')
    if (error) throw error
    if (!data?.length) return []
    const { data: uses, error: e2 } = await supabase.from('package_uses').select('package_id').in('package_id', data.map(p => p.id))
    if (e2) throw e2
    return data.map(p => ({
      id: p.id, clientPhone: client.phone, name: p.name, totalUses: p.total_uses, price: Number(p.price),
      used: (uses ?? []).filter(u => u.package_id === p.id).length,
    }))
  },

  async sell(bs: string, client: BarbershopClient, p: { name: string; totalUses: number; price: number }): Promise<void> {
    if (!isRealBarbershopId(bs)) {
      demo.savePacks(bs, [...demo.packs(bs), { ...p, id: `pct-${crypto.randomUUID()}`, clientPhone: digits(client.phone), used: 0 }])
      return
    }
    const { error } = await supabase.from('client_packages').insert({
      barbershop_id: bs, client_id: client.id, name: p.name, total_uses: p.totalUses, price: p.price,
    })
    if (error) throw error
  },

  /** Desconta 1 uso no atendimento concluído mais recente. Devolve o dia dele. */
  async use(bs: string, pack: ClientPackage): Promise<string> {
    if (!isRealBarbershopId(bs)) {
      const taken = new Set(demo.uses(bs).map(u => u.appointmentId))
      const weekAgo = localISO(new Date(Date.now() - 7 * 86_400_000))
      const today = localISO(new Date())
      const apt = demo.done(pack.clientPhone).find(a => a.date >= weekAgo && a.date <= today && !taken.has(a.id))
      if (!apt) throw new Error(NEEDS_DONE)
      demo.saveUses(bs, [...demo.uses(bs), { packageId: pack.id, appointmentId: apt.id, originalPrice: apt.price ?? null }])
      demo.savePacks(bs, demo.packs(bs).map(p => p.id === pack.id ? { ...p, used: p.used + 1 } : p))
      upsertDemoBooking({ ...apt, price: Math.round((pack.price / pack.totalUses) * 100) / 100 })
      return apt.date
    }
    const { data, error } = await supabase.rpc('use_package', { p_package_id: pack.id })
    if (error) throw error
    return data
  },

  async undoUse(bs: string, pack: ClientPackage): Promise<void> {
    if (!isRealBarbershopId(bs)) {
      const mine = demo.uses(bs).filter(u => u.packageId === pack.id)
      const last = mine[mine.length - 1]
      if (!last) return
      const apt = demo.appointments().find(a => a.id === last.appointmentId)
      if (apt) upsertDemoBooking({ ...apt, price: last.originalPrice ?? undefined })
      demo.saveUses(bs, demo.uses(bs).filter(u => u !== last && u.appointmentId !== last.appointmentId))
      demo.savePacks(bs, demo.packs(bs).map(p => p.id === pack.id ? { ...p, used: Math.max(0, p.used - 1) } : p))
      return
    }
    const { error } = await supabase.rpc('undo_package_use', { p_package_id: pack.id })
    if (error) throw error
  },
}
