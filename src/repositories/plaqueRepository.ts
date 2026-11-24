// Placa BarberPro dos R$10 mil: barbearia que fatura R$10 mil num mês pede a
// placa com o endereço. Real: RPC claim_plaque (recalcula o mês no banco).
// Demo: localStorage.
import { supabase } from '@/lib/supabase'
import { isDemoMode } from '@/lib/demo'

export const PLAQUE_GOAL = 10_000

export type PlaqueStatus = 'pedida' | 'enviada' | 'entregue'

export interface PlaqueClaim {
  month: string
  revenue: number
  nameOnPlaque: string
  city: string
  state: string
  status: PlaqueStatus
  createdAt: string
}

export interface PlaqueInput {
  month: string
  nameOnPlaque: string
  recipient: string
  phone: string
  cep: string
  address: string
  city: string
  state: string
}

const demoKey = (bsId: string) => `barberos:placa:${bsId}`

const isClaim = (v: unknown): v is PlaqueClaim =>
  typeof v === 'object' && v !== null && typeof (v as PlaqueClaim).month === 'string' && typeof (v as PlaqueClaim).status === 'string'

interface ClaimRow {
  month: string
  revenue: number | string
  name_on_plaque: string
  city: string
  state: string
  status: PlaqueStatus
  created_at: string
}

const fromRow = (r: ClaimRow): PlaqueClaim => ({
  month: r.month,
  revenue: Number(r.revenue) || 0,
  nameOnPlaque: r.name_on_plaque,
  city: r.city,
  state: r.state,
  status: r.status,
  createdAt: r.created_at,
})

export const plaqueRepository = {
  async get(barbershopId: string): Promise<PlaqueClaim | null> {
    if (isDemoMode()) {
      try {
        const raw: unknown = JSON.parse(localStorage.getItem(demoKey(barbershopId)) ?? 'null')
        return isClaim(raw) ? raw : null
      } catch { return null }
    }
    const { data, error } = await supabase.from('plaque_claims').select('*').eq('barbershop_id', barbershopId).maybeSingle()
    if (error) throw error
    return data ? fromRow(data) : null
  },

  async claim(barbershopId: string, input: PlaqueInput, revenue: number): Promise<PlaqueClaim> {
    if (isDemoMode()) {
      const claim: PlaqueClaim = {
        month: input.month, revenue, nameOnPlaque: input.nameOnPlaque.trim(),
        city: input.city.trim(), state: input.state.trim().toUpperCase(), status: 'pedida', createdAt: new Date().toISOString(),
      }
      try { localStorage.setItem(demoKey(barbershopId), JSON.stringify(claim)) } catch { /* demo sem storage: vale só nesta tela */ }
      return claim
    }
    const { data, error } = await supabase.rpc('claim_plaque', {
      p_barbershop_id: barbershopId,
      p_month: input.month,
      p_name_on_plaque: input.nameOnPlaque,
      p_recipient: input.recipient,
      p_phone: input.phone,
      p_cep: input.cep,
      p_address: input.address,
      p_city: input.city,
      p_state: input.state,
    })
    if (error) throw error
    return fromRow(data)
  },
}
