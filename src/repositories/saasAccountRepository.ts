// Auth delegado ao Supabase Auth — este repo só gerencia o perfil da conta SaaS
import { supabase } from '@/lib/supabase'
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
    const slug = slugify(input.barbershopName)
    const embedKey = generateEmbedKey(slug)

    // 1. EF faz createUser + RPC atomicamente (sem signInWithPassword)
    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-register`
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:          input.email,
        password:       input.password,
        ownerName:      input.ownerName,
        barbershopName: input.barbershopName,
        barbershopSlug: slug,
        embedKey,
      }),
    })

    const body = await res.json() as { error?: string; success?: boolean; account?: SaasAccountRow }
    if (!res.ok) throw new Error(body.error ?? 'Erro ao criar conta.')
    if (!body.account) throw new Error('Conta criada mas perfil não encontrado.')

    // 2. Login direto no Supabase (sem EF) — mais rápido
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    })
    if (signInError) throw signInError

    return {
      account: { ...mapAccount(body.account), email: input.email },
      accessToken: signInData.session?.access_token ?? null,
    }
  },

  async login(input: SaasLoginInput): Promise<SaasSession> {
    // Login direto no Supabase — sem EF intermediária para eliminar latência
    // O Supabase Auth já tem rate limiting nativo
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    })

    if (error) {
      if (error.status === 429) throw new Error('Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.')
      throw new Error('Email ou senha incorretos.')
    }
    if (!data.user) throw new Error('Login inválido.')

    const account = await saasAccountRepository.getByUserId(data.user.id)
    if (!account) throw new Error('Conta SaaS não encontrada')

    return {
      account: { ...mapAccount(account), email: data.user.email ?? input.email },
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

    return {
      account: { ...mapAccount(account), email: session.user.email ?? '' },
      accessToken: session.access_token,
    }
  },
}

function mapAccount(row: SaasAccountRow): SaasAccountRow {
  return row
}
