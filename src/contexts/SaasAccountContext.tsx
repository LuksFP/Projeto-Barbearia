import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import type { SaasAccount, SaasLoginInput, SaasSignupInput } from '@/types/saas'
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
  login: (email: string, password: string) => Promise<boolean | 'blocked' | { status: 'payment_required'; plan: SaasAccount['plan'] }>
  logout: () => Promise<void>
  refreshAccount: () => Promise<void>
}

const SaasAccountContext = createContext<SaasAccountContextType | undefined>(undefined)

export const useSaasAccount = () => {
  const ctx = useContext(SaasAccountContext)
  if (!ctx) throw new Error('useSaasAccount must be inside SaasAccountProvider')
  return ctx
}

function mapRowToAccount(row: ReturnType<typeof saasAccountRepository.getByUserId> extends Promise<infer T> ? NonNullable<T> : never): SaasAccount {
  return {
    id: row.id,
    ownerName: row.owner_name,
    email: '',
    barbershopName: row.barbershop_name,
    barbershopSlug: row.barbershop_slug,
    plan: row.plan as SaasAccount['plan'],
    planStatus: row.plan_status as SaasAccount['planStatus'],
    planStartedAt: row.plan_started_at,
    trialEndsAt: row.trial_ends_at ?? null,
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

    // onAuthStateChange dispara INITIAL_SESSION no mount — elimina a necessidade
    // de chamar getSession() separadamente, evitando conflito de lock do Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) {
        setAccount(null)
        setAccessToken(null)
        setIsLoading(false)
        return
      }
      const row = await saasAccountRepository.getByUserId(session.user.id)
      if (row) {
        setAccount({ ...mapRowToAccount(row), email: session.user.email ?? '' })
        setAccessToken(session.access_token)
      }
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signup = async (data: SaasSignupInput): Promise<void> => {
    const session = await saasAccountRepository.signup(data)
    setAccount(session.account as unknown as SaasAccount)
    setAccessToken(session.accessToken)
  }

  const login = async (email: string, password: string): Promise<boolean | 'blocked' | { status: 'payment_required'; plan: SaasAccount['plan'] }> => {
    // Intercepta credenciais demo antes de chamar o Supabase
    const demoPlan = matchDemoCredentials(email, password)
    if (demoPlan) {
      setDemoSession(demoPlan)
      // Reload completo para que TenantContext releia a sessionStorage com os mocks
      window.location.replace('/dashboard')
      return true
    }

    const credentials: SaasLoginInput = { email, password }
    try {
      const session = await saasAccountRepository.login(credentials)
      setAccount(session.account as unknown as SaasAccount)
      setAccessToken(session.accessToken)
      if (session.account.planStatus !== 'active') {
        return { status: 'payment_required', plan: session.account.plan }
      }
      return true
    } catch (err: unknown) {
      // Diferencia bloqueio de rate limit de credencial errada
      if (err instanceof Error && err.message.includes('Muitas tentativas')) return 'blocked'
      return false
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
      setAccount(session.account as unknown as SaasAccount)
      setAccessToken(session.accessToken)
    }
  }

  const hasActivePlan = account?.planStatus === 'active'

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
