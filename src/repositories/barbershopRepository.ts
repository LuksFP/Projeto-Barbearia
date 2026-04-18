// Substitui: src/lib/barbershop-storage.ts (localStorage)
import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type BarbershopRow = Tables<'barbershops'>
export type BarbershopInsert = TablesInsert<'barbershops'>
export type BarbershopUpdate = TablesUpdate<'barbershops'>

export const barbershopRepository = {
  async getById(id: string): Promise<BarbershopRow | null> {
    const { data, error } = await supabase
      .from('barbershops')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return null
    return data
  },

  async getBySlug(slug: string): Promise<BarbershopRow | null> {
    const { data, error } = await supabase
      .from('barbershops')
      .select('*')
      .eq('slug', slug)
      .single()
    if (error) return null
    return data
  },

  async getBySaasAccount(saasAccountId: string): Promise<BarbershopRow[]> {
    const { data, error } = await supabase
      .from('barbershops')
      .select('*')
      .eq('saas_account_id', saasAccountId)
      .order('created_at')
    if (error) throw error
    return data ?? []
  },

  async create(input: BarbershopInsert): Promise<BarbershopRow> {
    const { data, error } = await supabase
      .from('barbershops')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, input: BarbershopUpdate): Promise<BarbershopRow> {
    const { data, error } = await supabase
      .from('barbershops')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
}
