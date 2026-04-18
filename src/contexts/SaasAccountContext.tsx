import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import type { SaasAccount, SaasSignupInput } from '@/types/saas'
import { saasAccountRepository } from '@/repositories/saasAccountRepository'
import { supabase } from '@/lib/supabase'
import { isDemoMode, getDemoPlan, getDemoAccount, clearDemoSession, matchDemoCredentials, setDemoSession } from '@/lib/demo'

interface SaasAccountContextType {
  account: SaasAccount | null
  accessToken: string | null
  isLoggedIn: boolean
  hasActivePlan: boolean
  isLoading: boolean
  signup: (data: SaasSignupInput) => Promise<void>
  login: (email: string, password: string) => Promise<boolean | 'blocked' | { status: 'payment_required'; plan: SaasAccount['plan'] } | { status: 'error'; message: string }>
  logout: () => Promise<void>
  refreshAccount: () => Promise<void>
}

const SaasAccountContext = createContext<SaasAccountContextType | undefined>(undefined)

export const useSaasAccount = () => {
  const ctx = useContext(SaasAccountContext)
  if (!ctx) throw new Error('useSaasAccount must be inside SaasAccountProvider')
  return ctx
}

function mapRowToAccount(row: NonNullable<Awaited<ReturnType<typeof saasAccountRepository.getByUserId>>>, email: string): SaasAccount {
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
    cancelAt: row.cancel_at ?? null,
    createdAt: row.created_at,
  }
}

export const SaasAccountProvider = ({ children }: { children: ReactNode }) => {
  const [account, setAccount] = useState<SaasAccount | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Demo mode — injeta conta fake da sessionStorage sem tocar no Supabase
    if (isDemoMode()) {
      const plan = getDemoPlan()
      if (plan) setAccount(getDemoAccount(plan))
      setIsLoading(false)
      return
    }

    let initialized = false

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAccount(null)
        setAccessToken(null)
        if (!initialized) { initialized = true; setIsLoading(false) }
        return
      }
      // Seta o token imediatamente (síncrono) para components que dependem dele
      setAccessToken(session.access_token)
      // Fire-and-forget: não bloqueia o setSession() do Supabase (que awaita este callback)
      saasAccountRepository.getByUserId(session.user.id).then(row => {
        if (row) {
          setAccount(mapRowToAccount(row, session.user.email ?? ''))
        }
        if (!initialized) { initialized = true; setIsLoading(false) }
      })
    })

    return () => subscription.unsubscribe()
  }, [])

  const signup = async (data: SaasSignupInput): Promise<void> => {
    const session = await saasAccountRepository.signup(data)
    setAccount(session.account)
    setAccessToken(session.accessToken)
  }

  const login = async (email: string, password: string): Promise<boolean | 'blocked' | { status: 'payment_required'; plan: SaasAccount['plan'] } | { status: 'error'; message: string }> => {
    // Intercepta credenciais demo antes de chamar o Supabase
    const demoPlan = matchDemoCredentials(email, password)
    if (demoPlan) {
      setDemoSession(demoPlan)
      // Reload completo para que TenantContext releia a sessionStorage com os mocks
      window.location.replace('/dashboard')
      return true
    }

    const credentials = { email, password }
    try {
      const session = await saasAccountRepository.login(credentials)
      setAccessToken(session.accessToken)
      return true
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('Muitas tentativas')) return 'blocked'
      return {
        status: 'error',
        message: err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.',
      }
    }
  }

  const logout = async () => {
    if (isDemoMode()) {
      clearDemoSession()
      setAccount(null)
      return
    }
    await saasAccountRepository.logout()
    setAccount(null)
    setAccessToken(null)
  }

  const refreshAccount = async (): Promise<void> => {
    const session = await saasAccountRepository.getSession()
    if (session) {
      setAccount(session.account)
      setAccessToken(session.accessToken)
    }
  }

  // 'cancelling' = cancelamento agendado mas ainda com acesso até cancel_at
  const hasActivePlan = account?.planStatus === 'active'
    || account?.planStatus === 'trial'
    || (account?.planStatus === 'cancelling'
        && !!account?.cancelAt
        && new Date(account.cancelAt) > new Date())

  return (
    <SaasAccountContext.Provider value={{
      account,
      accessToken,
      isLoggedIn: !!account,
      hasActivePlan,
      isLoading,
      signup,
      login,
      logout,
      refreshAccount,
    }}>
      {children}
    </SaasAccountContext.Provider>
  )
}
