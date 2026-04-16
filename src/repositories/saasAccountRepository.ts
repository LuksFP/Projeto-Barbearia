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
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
    })
    if (authError) throw authError
    if (!authData.user) throw new Error('Usuário não criado')

    const slug = slugify(input.barbershopName)
    const embedKey = generateEmbedKey(slug)

    // Usa RPC atômica: cria saas_account + barbershop em uma transação.
    // Se falhar, não deixa auth user órfão (o Supabase Auth limpará via cron).
    const { data: account, error: rpcError } = await supabase.rpc('create_saas_account' as never, {
      p_user_id:    authData.user.id,
      p_owner_name: input.ownerName,
      p_barb_name:  input.barbershopName,
      p_barb_slug:  slug,
      p_embed_key:  embedKey,
    } as never)

    if (rpcError) {
      if (rpcError.code === '23505') throw new Error('Já existe uma conta com esse email.')
      throw new Error(rpcError.message ?? 'Erro ao criar conta.')
    }

    // signUp() retorna session null quando confirmação de email está ativa no projeto.
    // Fallback: faz login imediato para garantir que a sessão existe antes de ir ao checkout.
    let session = authData.session
    if (!session) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      })
      if (!signInError && signInData.session) {
        session = signInData.session
      }
    }

    return {
      account: mapAccount(account as SaasAccountRow),
      accessToken: session?.access_token ?? null,
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

    // Restaura a sessão no cliente Supabase para que auth.getSession() funcione
    const { data, error } = await supabase.auth.setSession({ access_token, refresh_token })
    if (error) throw error
    if (!data.user) throw new Error('Login inválido')

    const account = await saasAccountRepository.getByUserId(data.user.id)
    if (!account) throw new Error('Conta SaaS não encontrada')

    return {
      account: { ...mapAccount(account), email: data.user.email ?? '' },
      accessToken: data.session?.access_token ?? null,
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
