// Substitui: src/lib/barbershop-storage.ts (localStorage)
import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'
import type { Barbershop } from '@/types/tenant'
import { DEFAULT_OPEN, DEFAULT_CLOSE } from '@/lib/scheduling'

export type BarbershopRow = Tables<'barbershops'>
export type BarbershopInsert = TablesInsert<'barbershops'>
export type BarbershopUpdate = TablesUpdate<'barbershops'>

/**
 * Mapper ÚNICO row -> Barbershop. Use este em TODA superfície (dashboard e site
 * público). Antes existia uma cópia em cada lugar e elas divergiam em silêncio:
 * a do site público não copiava open_time/close_time, então toda barbearia
 * oferecia agendamento das 08:00 no lado do cliente.
 * Coluna nova em `barbershops` => adicionar AQUI, e só aqui.
 */
export function mapBarbershopRow(row: BarbershopRow, plan: Barbershop['plan']): Barbershop {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    phone: row.phone,
    whatsapp: row.whatsapp,
    address: row.address,
    city: row.city,
    state: row.state,
    instagram: row.instagram,
    primaryColor: row.primary_color,
    accentColor: row.accent_color,
    logoText: row.logo_text,
    coverImage: row.cover_image ?? undefined,
    plan,
    active: row.active,
    siteType: row.site_type as Barbershop['siteType'],
    customDomain: row.custom_domain ?? '',
    embedKey: row.embed_key,
    cancellationPolicy: (row.cancellation_policy as unknown as Barbershop['cancellationPolicy']) ?? null,
    clubPixKey: row.club_pix_key ?? '',
    openTime: row.open_time ?? DEFAULT_OPEN,
    closeTime: row.close_time ?? DEFAULT_CLOSE,
  }
}

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
