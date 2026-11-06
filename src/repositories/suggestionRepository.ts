// Caixa de sugestões do app (tabela app_suggestions). Equipe da barbearia lê e
// escreve as da própria barbearia via RLS; status/resposta são da equipe BarberOS.
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export const SUGGESTION_AREAS = ['agenda', 'clientes', 'financeiro', 'site', 'equipe', 'outro'] as const
export type SuggestionArea = (typeof SUGGESTION_AREAS)[number]

export const SUGGESTION_STATUSES = ['recebida', 'analisando', 'vai_entrar', 'no_ar', 'nao_agora'] as const
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number]

export interface Suggestion {
  id: string
  barbershopId: string
  userId: string
  authorName: string
  area: SuggestionArea
  body: string
  status: SuggestionStatus
  reply: string | null
  createdAt: string
}

export interface NewSuggestion {
  barbershopId: string
  authorName: string
  area: SuggestionArea
  body: string
}

type SuggestionRow = Tables<'app_suggestions'>

const isArea = (v: string): v is SuggestionArea => (SUGGESTION_AREAS as readonly string[]).includes(v)
const isStatus = (v: string): v is SuggestionStatus => (SUGGESTION_STATUSES as readonly string[]).includes(v)

const mapRow = (r: SuggestionRow): Suggestion => ({
  id: r.id,
  barbershopId: r.barbershop_id,
  userId: r.user_id,
  authorName: r.author_name,
  area: isArea(r.area) ? r.area : 'outro',
  body: r.body,
  status: isStatus(r.status) ? r.status : 'recebida',
  reply: r.reply,
  createdAt: r.created_at,
})

const table = () => supabase.from('app_suggestions')

export const suggestionRepository = {
  async listByBarbershop(barbershopId: string): Promise<Suggestion[]> {
    const { data, error } = await table()
      .select()
      .eq('barbershop_id', barbershopId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(mapRow)
  },

  async create(input: NewSuggestion): Promise<Suggestion> {
    const { data, error } = await table()
      .insert({
        barbershop_id: input.barbershopId,
        author_name: input.authorName,
        area: input.area,
        body: input.body,
      })
      .select()
      .single()
    if (error) throw error
    return mapRow(data)
  },

  async remove(id: string): Promise<void> {
    const { error } = await table().delete().eq('id', id)
    if (error) throw error
  },
}
