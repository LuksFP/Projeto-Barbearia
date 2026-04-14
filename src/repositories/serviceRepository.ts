// Substitui: readServices / writeServices do barbershop-storage.ts
import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type ServiceRow = Tables<'services'>
export type ServiceInsert = TablesInsert<'services'>
export type ServiceUpdate = TablesUpdate<'services'>

export const serviceRepository = {
  async listByBarbershop(barbershopId: string): Promise<ServiceRow[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('active', true)
      .order('category')
      .order('name')
    if (error) throw error
    return data ?? []
  },

  async create(input: ServiceInsert): Promise<ServiceRow> {
    const { data, error } = await supabase
      .from('services')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, input: ServiceUpdate): Promise<ServiceRow> {
    const { data, error } = await supabase
      .from('services')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deactivate(id: string): Promise<void> {
    const { error } = await supabase
      .from('services')
      .update({ active: false })
      .eq('id', id)
    if (error) throw error
  },
}
