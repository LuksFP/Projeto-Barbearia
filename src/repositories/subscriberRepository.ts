// Assinantes do Clube VIP (cobranças). CRUD escopado por barbershop_id via RLS.
import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type SubscriberRow = Tables<'club_subscribers'>
export type SubscriberInsert = TablesInsert<'club_subscribers'>
export type SubscriberUpdate = TablesUpdate<'club_subscribers'>

export const subscriberRepository = {
  async listByBarbershop(barbershopId: string): Promise<SubscriberRow[]> {
    const { data, error } = await supabase
      .from('club_subscribers')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('created_at')
    if (error) throw error
    return data ?? []
  },

  async create(input: SubscriberInsert): Promise<SubscriberRow> {
    const { data, error } = await supabase
      .from('club_subscribers')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, input: SubscriberUpdate): Promise<SubscriberRow> {
    const { data, error } = await supabase
      .from('club_subscribers')
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('club_subscribers')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}
