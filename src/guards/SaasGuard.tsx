import { useEffect, useRef } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { useSaasAccount } from '@/contexts/SaasAccountContext'

const SaasGuard = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, hasActivePlan, isLoading, account, accessToken, refreshAccount } = useSaasAccount()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const isCheckoutSuccess = searchParams.get('checkout') === 'success'
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Quando vem do Stripe, ativa polling rápido até o webhook confirmar o plano
  useEffect(() => {
    if (!isCheckoutSuccess || hasActivePlan || isLoading) return

    refreshAccount()
    pollRef.current = setInterval(() => refreshAccount(), 500)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [isCheckoutSuccess, hasActivePlan, isLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (hasActivePlan && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [hasActivePlan])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
      </div>
    )
  }

  if (isCheckoutSuccess && accessToken && !account) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
        <p className="text-white/50 text-sm font-body">Restaurando sua conta…</p>
      </div>
    )
  }

  if (!isLoggedIn) {
    return <Navigate to="/entrar" state={{ from: location }} replace />
  }

  // Vindo do Stripe: pagamento já aprovado, entra direto no dashboard
  // O webhook ativa o plano no banco em segundos, polling atualiza o contexto
  if (isCheckoutSuccess) {
    return <>{children}</>
  }

  if (!hasActivePlan) {
    if (account?.planStatus === 'trial' || account?.planStatus === 'pending') {
      return <Navigate to={`/pagamento?plano=${account.plan ?? 'pro'}`} state={{ from: location }} replace />
    }
    return <Navigate to="/planos" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export default SaasGuard
