// Substitui: readBarbers / writeBarbers do barbershop-storage.ts
import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type MemberRow = Tables<'barbershop_members'>
export type MemberInsert = TablesInsert<'barbershop_members'>
export type MemberUpdate = TablesUpdate<'barbershop_members'>

export const teamRepository = {
  async listByBarbershop(barbershopId: string): Promise<MemberRow[]> {
    const { data, error } = await supabase
      .from('barbershop_members')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('active', true)
      .order('joined_at')
    if (error) throw error
    return data ?? []
  },

  async create(input: MemberInsert): Promise<MemberRow> {
    const { data, error } = await supabase
      .from('barbershop_members')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, input: MemberUpdate): Promise<MemberRow> {
    const { data, error } = await supabase
      .from('barbershop_members')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getByUserAndBarbershop(userId: string, barbershopId: string): Promise<MemberRow | null> {
    const { data, error } = await supabase
      .from('barbershop_members')
      .select('*')
      .eq('user_id', userId)
      .eq('barbershop_id', barbershopId)
      .maybeSingle()
    if (error) return null
    return data
  },

  async deactivate(id: string): Promise<void> {
    const { error } = await supabase
      .from('barbershop_members')
      .update({ active: false })
      .eq('id', id)
    if (error) throw error
  },
}
