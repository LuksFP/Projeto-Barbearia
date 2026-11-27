// Recursos que cada barbearia liga ou desliga, e os aniversários dos clientes.
import { supabase } from '@/lib/supabase'
import { supabasePublic } from '@/lib/supabase-public'
import { isRealBarbershopId } from '@/lib/placeOrder'
import { localISO } from '@/lib/month'
import { DEFAULT_FEATURES, type Birthday, type ShopFeatures } from '@/lib/extras'
import { demoRead, demoWrite } from './demoStore'
import type { TablesUpdate } from '@/types/database'

const featuresKey = (bs: string) => `barberos:recursos:${bs}`
const birthdayKey = (bs: string) => `barberos:aniversarios:${bs}`

export const featuresRepository = {
  async get(bs: string): Promise<ShopFeatures> {
    if (!isRealBarbershopId(bs)) return { ...DEFAULT_FEATURES, ...demoRead<Partial<ShopFeatures>>(featuresKey(bs), {}) }
    const { data, error } = await supabase.from('barbershops')
      .select('self_cancel_hours, reviews_enabled, loyalty_enabled, loyalty_goal, loyalty_reward, loyalty_since, packages_enabled, birthdays_enabled')
      .eq('id', bs).single()
    if (error) throw error
    return {
      selfCancelHours: data.self_cancel_hours, reviewsEnabled: data.reviews_enabled,
      loyaltyEnabled: data.loyalty_enabled, loyaltyGoal: data.loyalty_goal, loyaltyReward: data.loyalty_reward,
      loyaltySince: data.loyalty_since, packagesEnabled: data.packages_enabled, birthdaysEnabled: data.birthdays_enabled,
    }
  },

  async save(bs: string, next: ShopFeatures): Promise<ShopFeatures> {
    // O cartão conta a partir do dia em que ligou pela primeira vez
    const saved = { ...next, loyaltySince: next.loyaltyEnabled ? next.loyaltySince ?? localISO(new Date()) : next.loyaltySince }
    if (!isRealBarbershopId(bs)) { demoWrite(featuresKey(bs), saved); return saved }
    const row: TablesUpdate<'barbershops'> = {
      self_cancel_hours: saved.selfCancelHours, reviews_enabled: saved.reviewsEnabled,
      loyalty_enabled: saved.loyaltyEnabled, loyalty_goal: saved.loyaltyGoal, loyalty_reward: saved.loyaltyReward,
      loyalty_since: saved.loyaltySince, packages_enabled: saved.packagesEnabled, birthdays_enabled: saved.birthdaysEnabled,
    }
    const { data, error } = await supabase.from('barbershops').update(row).eq('id', bs).select('id')
    if (error) throw error
    if (!data?.length) throw new Error('Só o dono ou admin muda isso')
    return saved
  },

  /** Site: o que o cliente pode fazer pelo link. Erro = não oferece. */
  async publicFeatures(bs: string): Promise<{ selfCancelHours: number | null; reviewsEnabled: boolean }> {
    if (!isRealBarbershopId(bs)) {
      const f = await this.get(bs)
      return { selfCancelHours: f.selfCancelHours, reviewsEnabled: f.reviewsEnabled }
    }
    const { data, error } = await supabasePublic.rpc('public_shop_features', { p_barbershop_id: bs })
    if (error) throw error
    const r = data?.[0]
    return { selfCancelHours: r?.self_cancel_hours ?? null, reviewsEnabled: r?.reviews_enabled ?? false }
  },

  async birthdays(bs: string): Promise<Birthday[]> {
    if (!isRealBarbershopId(bs)) return demoRead<Birthday[]>(birthdayKey(bs), [])
    const { data, error } = await supabase.from('clients').select('id, name, phone, birth_day, birth_month')
      .eq('barbershop_id', bs).not('birth_day', 'is', null)
    if (error) throw error
    return (data ?? []).map(r => ({ clientId: r.id, name: r.name, phone: r.phone, day: r.birth_day!, month: r.birth_month! }))
  },

  /** day/month null = apaga a data. */
  async setBirthday(bs: string, client: { id: string; name: string; phone: string }, day: number | null, month: number | null): Promise<void> {
    if (!isRealBarbershopId(bs)) {
      const rest = demoRead<Birthday[]>(birthdayKey(bs), []).filter(b => b.clientId !== client.id)
      demoWrite(birthdayKey(bs), day && month ? [...rest, { clientId: client.id, name: client.name, phone: client.phone, day, month }] : rest)
      return
    }
    const { error } = await supabase.from('clients').update({ birth_day: day, birth_month: month }).eq('id', client.id)
    if (error) throw error
  },
}
