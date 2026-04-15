import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useSearchParams, useNavigate } from 'react-router-dom'
import { useSaasAccount } from '@/contexts/SaasAccountContext'

const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS  = 30000

function trialDaysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null
  const diff = new Date(trialEndsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

const SaasGuard = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn, hasActivePlan, isLoading, account, refreshAccount } = useSaasAccount()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isCheckoutSuccess = searchParams.get('checkout') === 'success'

  const [pollTimedOut, setPollTimedOut] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Inicia polling apenas quando retorna do Stripe sem plano ainda ativo
  useEffect(() => {
    if (!isCheckoutSuccess || hasActivePlan || isLoading) return

    pollingRef.current = setInterval(async () => {
      await refreshAccount()
    }, POLL_INTERVAL_MS)

    timeoutRef.current = setTimeout(() => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      setPollTimedOut(true)
    }, POLL_TIMEOUT_MS)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [isCheckoutSuccess, hasActivePlan, isLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  // Quando plano ativa durante polling → remove ?checkout=success da URL
  useEffect(() => {
    if (isCheckoutSuccess && hasActivePlan) {
      if (pollingRef.current) clearInterval(pollingRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      navigate('/dashboard', { replace: true })
    }
  }, [hasActivePlan, isCheckoutSuccess, navigate])

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

  // Volta do Stripe: aguarda webhook ativar o plano antes de redirecionar
  if (isCheckoutSuccess && !hasActivePlan) {
    if (pollTimedOut) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-white font-heading text-xl tracking-wide">PAGAMENTO RECEBIDO</p>
          <p className="text-white/50 text-sm font-body max-w-sm">
            Estamos processando sua assinatura. Isso pode levar alguns instantes.
            Recarregue a página ou entre em contato se o problema persistir.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-5 py-2.5 rounded-lg bg-amber-500 text-[#0a0a0a] text-sm font-semibold font-body hover:bg-amber-400 transition-colors"
          >
            Recarregar
          </button>
        </div>
      )
    }
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
        <p className="text-white/50 text-sm font-body">Confirmando pagamento…</p>
      </div>
    )
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
