// Substitui: readMemberships / writeMemberships do barbershop-storage.ts
import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'

export type MembershipRow = Tables<'memberships'>
export type MembershipInsert = TablesInsert<'memberships'>
export type ClientMembershipRow = Tables<'client_memberships'>

export const membershipRepository = {
  async listByBarbershop(barbershopId: string): Promise<MembershipRow[]> {
    const { data, error } = await supabase
      .from('memberships')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('active', true)
      .order('price')
    if (error) throw error
    return data ?? []
  },

  async create(input: MembershipInsert): Promise<MembershipRow> {
    const { data, error } = await supabase
      .from('memberships')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, input: TablesUpdate<'memberships'>): Promise<MembershipRow> {
    const { data, error } = await supabase
      .from('memberships')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async getActiveClientMembership(clientId: string): Promise<ClientMembershipRow | null> {
    const { data, error } = await supabase
      .from('client_memberships')
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'active')
      .maybeSingle()
    if (error) return null
    return data
  },

  async subscribeClient(input: TablesInsert<'client_memberships'>): Promise<ClientMembershipRow> {
    const { data, error } = await supabase
      .from('client_memberships')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async cancelClientMembership(id: string): Promise<void> {
    const { error } = await supabase
      .from('client_memberships')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },
}
