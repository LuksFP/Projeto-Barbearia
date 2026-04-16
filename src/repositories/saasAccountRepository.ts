// Substitui: saasAccountService.ts (localStorage + in-memory)
// Auth delegado ao Supabase Auth — este repo só gerencia o perfil da conta SaaS
import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'
import type { SaasSignupInput, SaasLoginInput, SaasSession, SaasPlan } from '@/types/saas'

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
    const slug = slugify(input.barbershopName)
    const embedKey = generateEmbedKey(slug)

    // Delega para Edge Function auth-register que faz o signup de forma atômica:
    // se o RPC falhar, ela deleta o auth user para não deixar órfãos.
    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-register`
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:           input.email,
        password:        input.password,
        ownerName:       input.ownerName,
        barbershopName:  input.barbershopName,
        barbershopSlug:  slug,
        embedKey,
      }),
    })

    const body = await res.json() as { error?: string; access_token?: string | null; refresh_token?: string | null; account?: SaasAccountRow }

    if (!res.ok) {
      throw new Error(body.error ?? 'Erro ao criar conta.')
    }

    if (!body.account) throw new Error('Conta criada mas perfil não encontrado.')

    // Dispara setSession em background — não bloqueia a navegação
    if (body.access_token && body.refresh_token) {
      supabase.auth.setSession({
        access_token:  body.access_token,
        refresh_token: body.refresh_token,
      })
    }

    return {
      account: { ...mapAccount(body.account), email: input.email },
      accessToken: body.access_token ?? null,
    }
  },

  async login(input: SaasLoginInput): Promise<SaasSession> {
    // Login via Edge Function para rate limiting (5 falhas/email, 10/IP em 15 min)
    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-login`
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: input.email, password: input.password }),
    })

    if (res.status === 429) {
      const body = await res.json() as { error: string }
      throw new Error(body.error)
    }
    if (!res.ok) {
      const body = await res.json() as { error: string }
      throw new Error(body.error ?? 'Erro ao fazer login.')
    }

    const { access_token, refresh_token } = await res.json() as {
      access_token: string
      refresh_token: string
    }

    // Decodifica o JWT para obter user_id sem aguardar setSession
    const payload = JSON.parse(atob(access_token.split('.')[1])) as { sub: string; email: string }

    // Dispara setSession em background — não bloqueia o login
    supabase.auth.setSession({ access_token, refresh_token })

    const account = await saasAccountRepository.getByUserId(payload.sub)
    if (!account) throw new Error('Conta SaaS não encontrada')

    return {
      account: { ...mapAccount(account), email: payload.email ?? input.email },
      accessToken: access_token,
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

    // email vive em auth.users — injetado aqui para não desnormalizar o schema
    return {
      account: { ...mapAccount(account), email: session.user.email ?? '' },
      accessToken: session.access_token,
    }
  },

}

function mapAccount(row: SaasAccountRow): SaasAccountRow {
  return row
}
