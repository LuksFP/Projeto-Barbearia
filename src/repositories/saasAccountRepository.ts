// Auth delegado ao Supabase Auth — este repo só gerencia o perfil da conta SaaS
import { supabase } from '@/lib/supabase'
import { getAuthErrorMessage } from '@/lib/authErrors'
import type { Tables } from '@/types/database'
import type { SaasAccount, SaasSignupInput, SaasLoginInput, SaasSession } from '@/types/saas'

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

    // Usa Edge Function que cria o usuário com email_confirm: true (sem email de confirmação)
    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-register`
    let res: Response
    try {
      res = await fetch(fnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: input.email,
          password: input.password,
          ownerName: input.ownerName,
          barbershopName: input.barbershopName,
          barbershopSlug: slug,
          embedKey,
          plan: input.plan ?? 'pro',
        }),
      })
    } catch {
      throw new Error('Erro de conexão. Verifique sua internet.')
    }

    const data = await res.json() as { access_token?: string; refresh_token?: string; error?: string }
    if (!res.ok) throw new Error(data.error ?? 'Erro ao criar conta.')
    if (!data.access_token || !data.refresh_token) {
      throw new Error('Conta criada mas não foi possível iniciar sessão. Faça login.')
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    })
    if (sessionError || !sessionData.session) throw new Error('Erro ao iniciar sessão.')

    const row = await saasAccountRepository.getByUserId(sessionData.session.user.id)
    if (!row) throw new Error('Conta criada mas não encontrada.')

    return {
      account: mapAccount(row, input.email),
      accessToken: data.access_token,
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
      account: mapAccount(account, session.user.email ?? ''),
      accessToken: session.access_token,
    }
  },
}

function mapAccount(row: SaasAccountRow, email: string): SaasAccount {
  return {
    id: row.id,
    userId: row.user_id,
    ownerName: row.owner_name,
    email,
    barbershopName: row.barbershop_name,
    barbershopSlug: row.barbershop_slug,
    barbershopId: row.barbershop_id ?? null,
    plan: row.plan as SaasAccount['plan'],
    planStatus: row.plan_status as SaasAccount['planStatus'],
    planStartedAt: row.plan_started_at,
    trialEndsAt: row.trial_ends_at ?? null,
    createdAt: row.created_at,
  }
}
