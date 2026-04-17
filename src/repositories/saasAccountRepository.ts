// Substitui: saasAccountService.ts (localStorage + in-memory)
// Auth delegado ao Supabase Auth - este repo so gerencia o perfil da conta SaaS
import { supabase } from '@/lib/supabase'
import { getAuthErrorMessage } from '@/lib/authErrors'
import type { Tables } from '@/types/database'
import type { SaasSignupInput, SaasLoginInput, SaasSession } from '@/types/saas'

export type SaasAccountRow = Tables<'saas_accounts'>

function generateEmbedKey(slug: string): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  const rand = Array.from(bytes, b => chars[b % chars.length]).join('')
  return `bos_${slug}_${rand}`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export const saasAccountRepository = {
  async signup(input: SaasSignupInput): Promise<SaasSession> {
    let authData: { user?: { id: string } | null; session: { access_token: string } | null } | null = null
    try {
      ({ data: authData } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
      }))
    } catch (error) {
      throw new Error(getAuthErrorMessage(error))
    }

    if (!authData?.user) throw new Error('Usuário não criado')

    const slug = slugify(input.barbershopName)
    const embedKey = generateEmbedKey(slug)

    let account: SaasAccountRow | null = null
    try {
      const { data } = await supabase.rpc('create_saas_account' as never, {
        p_user_id: authData.user.id,
        p_owner_name: input.ownerName,
        p_barb_name: input.barbershopName,
        p_barb_slug: slug,
        p_embed_key: embedKey,
      } as never)
      account = data as SaasAccountRow | null
    } catch (error) {
      throw new Error(getAuthErrorMessage(error))
    }

    if (!account) throw new Error('Erro ao criar conta.')

    let session = authData.session
    if (!session) {
      try {
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: input.email,
          password: input.password,
        })
        if (signInData.session) {
          session = signInData.session
        }
      } catch (error) {
        throw new Error(getAuthErrorMessage(error))
      }
    }

    return {
      account: mapAccount(account),
      accessToken: session?.access_token ?? null,
    }
  },

  async login(input: SaasLoginInput): Promise<SaasSession> {
    let data: { session: { access_token: string } | null } | null = null
    try {
      ({ data } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      }))
    } catch (error) {
      throw new Error(getAuthErrorMessage(error))
    }
    if (!data?.session) throw new Error('Login inválido')

    return {
      account: null as never,
      accessToken: data.session.access_token,
    }
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut()
  },

  async getByUserId(userId: string): Promise<SaasAccountRow | null> {
    const { data, error } = await supabase
      .from('saas_accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) return null
    return data
  },

  async getSession(): Promise<SaasSession | null> {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null

    const account = await saasAccountRepository.getByUserId(session.user.id)
    if (!account) return null

    return {
      account: { ...mapAccount(account), email: session.user.email ?? '' },
      accessToken: session.access_token,
    }
  },
}

function mapAccount(row: SaasAccountRow): SaasAccountRow {
  return row
}
