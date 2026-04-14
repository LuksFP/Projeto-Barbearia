import { Navigate, useLocation } from 'react-router-dom'
import { useSaasAccount } from '@/contexts/SaasAccountContext'

function trialDaysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null
  const diff = new Date(trialEndsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

const SaasGuard = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, hasActivePlan, isLoading, account } = useSaasAccount()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
      </div>
    )
  }

  if (!isLoggedIn) {
    return <Navigate to="/entrar" state={{ from: location }} replace />
  }

  // Trial expirado → redireciona para planos
  if (account?.planStatus === 'trial' && account.trialEndsAt) {
    const daysLeft = trialDaysLeft(account.trialEndsAt)
    if (daysLeft !== null && daysLeft <= 0) {
      return <Navigate to="/planos?trial=expired" replace />
    }
  }

  if (!hasActivePlan) {
    return <Navigate to="/planos" state={{ from: location }} replace />
  }

  // Banner de aviso de trial próximo do vencimento
  const daysLeft = account?.planStatus === 'trial'
    ? trialDaysLeft(account.trialEndsAt ?? null)
    : null

  return (
    <>
      {daysLeft !== null && daysLeft <= 3 && daysLeft > 0 && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-[#0a0a0a] text-center text-xs font-semibold font-body py-1.5 px-4">
          Seu trial expira em {daysLeft} dia{daysLeft !== 1 ? 's' : ''}.{' '}
          <a href="/planos" className="underline hover:no-underline">
            Assinar agora →
          </a>
        </div>
      )}
      {children}
    </>
  )
}

export default SaasGuard
