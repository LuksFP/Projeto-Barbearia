// Substitui: readClients do barbershop-storage.ts
import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type ClientRow = Tables<'clients'>
export type ClientInsert = TablesInsert<'clients'>
export type ClientUpdate = TablesUpdate<'clients'>

export const clientRepository = {
  async listByBarbershop(barbershopId: string): Promise<ClientRow[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .order('name')
    if (error) throw error
    return data ?? []
  },

  async upsertByPhone(input: ClientInsert): Promise<ClientRow> {
    const { data, error } = await supabase
      .from('clients')
      .upsert(input, { onConflict: 'barbershop_id,phone' })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, input: ClientUpdate): Promise<ClientRow> {
    const { data, error } = await supabase
      .from('clients')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async incrementVisit(id: string): Promise<void> {
    const { error } = await supabase.rpc('increment_client_visits' as never, { client_id: id })
    if (error) {
      // fallback manual se a RPC não existir ainda
      const { data: client } = await supabase.from('clients').select('total_visits').eq('id', id).single()
      if (client) {
        await supabase
          .from('clients')
          .update({ total_visits: client.total_visits + 1, last_visit: new Date().toISOString().split('T')[0] })
          .eq('id', id)
      }
    }
  },
}
