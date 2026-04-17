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
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    })

    if (error) {
      if (error.status === 429) throw new Error('Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.')
      throw new Error('Email ou senha incorretos.')
    }
    if (!data.session) throw new Error('Login inválido')

    // Retorna imediatamente — onAuthStateChange no SaasAccountContext carrega a conta
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
