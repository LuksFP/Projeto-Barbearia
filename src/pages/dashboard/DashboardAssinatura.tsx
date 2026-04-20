import { useState, useEffect } from 'react'
import { useSaasAccount } from '@/contexts/SaasAccountContext'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SAAS_PLANS } from '@/types/saas'
import {
  CreditCard, Crown, CalendarDays, AlertTriangle,
  ExternalLink, ArrowUpRight, Loader2, CheckCircle2,
  Clock, XCircle, Zap,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { isDemoMode } from '@/lib/demo'

const STATUS_CONFIG = {
  pending:    { label: 'Aguardando pagamento',  color: 'text-amber-300',   bg: 'bg-amber-500/10 border-amber-500/20',   icon: Clock },
  active:     { label: 'Ativo',                 color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', icon: CheckCircle2 },
  trial:      { label: 'Trial',                 color: 'text-amber-400',   bg: 'bg-amber-400/10 border-amber-400/20',   icon: Clock },
  past_due:   { label: 'Pagamento pendente',    color: 'text-red-400',     bg: 'bg-red-400/10 border-red-400/20',       icon: AlertTriangle },
  cancelling: { label: 'Cancelamento agendado', color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20', icon: AlertTriangle },
  cancelled:  { label: 'Cancelado',             color: 'text-white/40',    bg: 'bg-white/5 border-white/10',            icon: XCircle },
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function trialDaysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null
  const diff = new Date(trialEndsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

const DashboardAssinatura = () => {
  const { account, accessToken, refreshAccount } = useSaasAccount()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [justUpgraded, setJustUpgraded] = useState(false)
  const [planChangedTo, setPlanChangedTo] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('upgrade') === 'success') {
      setJustUpgraded(true)
      refreshAccount().finally(() => {
        setSearchParams({}, { replace: true })
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [portalError, setPortalError] = useState('')
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null)
  const [upgradeError, setUpgradeError] = useState('')

  if (!account) return null

  const planConfig = SAAS_PLANS.find(p => p.id === account.plan)
  const statusCfg = STATUS_CONFIG[account.planStatus ?? 'cancelled']
  const StatusIcon = statusCfg.icon
  const daysLeft = trialDaysLeft(account.trialEndsAt)
  const isDemo = isDemoMode()

  const handleChangePlan = async (planId: string) => {
    if (isDemo) {
      setUpgradeError('Mudança de plano não disponível no modo demo.')
      return
    }
    if (!accessToken) {
      setUpgradeError('Sessão expirada. Faça login novamente.')
      return
    }
    setUpgradeError('')
    setUpgradeLoading(planId)

    const baseUrl = import.meta.env.VITE_SUPABASE_URL as string

    // Se já tem assinatura ativa, tenta update direto (up ou downgrade sem novo checkout)
    if (account.planStatus === 'active' || account.planStatus === 'cancelling') {
      try {
        const res = await fetch(`${baseUrl}/functions/v1/billing-update-subscription`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ plan: planId }),
        })
        const body = await res.json() as { success?: boolean; requiresCheckout?: boolean; error?: string }
        if (!res.ok) throw new Error(body.error ?? 'Erro ao trocar plano.')
        if (body.success) {
          await refreshAccount()
          setPlanChangedTo(planId)
          setUpgradeLoading(null)
          return
        }
        // requiresCheckout: true — cai no fluxo de checkout abaixo
      } catch (e) {
        setUpgradeError(e instanceof Error ? e.message : 'Erro ao trocar plano.')
        setUpgradeLoading(null)
        return
      }
    }

    // Sem assinatura ativa (trial, pending, cancelled) — checkout normal
    try {
      const res = await fetch(`${baseUrl}/functions/v1/billing-create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          plan: planId,
          successUrl: `${window.location.origin}/dashboard/assinatura?upgrade=success`,
          cancelUrl: `${window.location.origin}/dashboard/assinatura`,
        }),
      })
      const body = await res.json() as { url?: string; error?: string }
      if (!res.ok) throw new Error(body.error ?? 'Erro ao criar sessão de checkout.')
      window.location.href = body.url!
    } catch (e) {
      setUpgradeError(e instanceof Error ? e.message : 'Erro ao iniciar checkout.')
      setUpgradeLoading(null)
    }
  }

  const handleManageStripe = async () => {
    if (isDemo) {
      setPortalError('Portal de pagamento não disponível no modo demo.')
      return
    }
    setPortalError('')
    setLoading(true)
    try {
      if (!accessToken) throw new Error('Sessão expirada. Faça login novamente.')

      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/billing-create-portal`
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/dashboard/assinatura`,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string; message?: string }
        throw new Error(body.error ?? body.message ?? 'Erro ao acessar portal de pagamento.')
      }

      const { url } = await res.json() as { url: string }
      window.location.href = url
    } catch (e) {
      setPortalError(e instanceof Error ? e.message : 'Erro ao acessar portal.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <p className="text-white/30 text-sm font-body mb-1">Conta SaaS</p>
        <h1 className="font-heading text-3xl tracking-wide text-white">ASSINATURA</h1>
      </div>

      {justUpgraded && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-emerald-300 text-sm font-body">
            Pagamento confirmado! Seu plano foi atualizado. Se ainda aparecer o plano antigo, aguarde alguns segundos e recarregue a página.
          </p>
        </div>
      )}

      {planChangedTo && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-emerald-300 text-sm font-body">
            Plano alterado com sucesso! A diferença de valor foi calculada proporcionalmente e será aplicada na próxima fatura.
          </p>
        </div>
      )}

      {/* Card do plano atual */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-xl bg-[#141414] border border-[#252525] space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-white/40 text-xs font-body">Plano atual</p>
              <p className="text-white font-heading text-xl tracking-wide">
                {planConfig?.name ?? 'Sem plano'}
              </p>
            </div>
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-body font-medium ${statusCfg.bg} ${statusCfg.color}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {statusCfg.label}
          </div>
        </div>

        {account.planStatus === 'pending' && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/20">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-amber-300/90 text-sm font-body">
              Seu cadastro foi criado, mas o acesso so sera liberado apos a confirmacao do pagamento.
            </p>
          </div>
        )}

        {/* Trial warning */}
        {account.planStatus === 'trial' && daysLeft !== null && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/20">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-amber-300/90 text-sm font-body">
              {daysLeft === 0
                ? 'Seu período de trial encerra hoje. Assine para não perder o acesso.'
                : `Seu trial encerra em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}.`}
            </p>
          </div>
        )}

        {/* Cancelling warning */}
        {account.planStatus === 'cancelling' && account.cancelAt && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/[0.06] border border-orange-500/20">
            <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
            <p className="text-orange-300/90 text-sm font-body">
              Seu plano foi cancelado mas permanece ativo até <strong>{formatDate(account.cancelAt)}</strong>. Após essa data o acesso será bloqueado.
            </p>
          </div>
        )}

        {/* Past due warning */}
        {account.planStatus === 'past_due' && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/[0.06] border border-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-red-300/90 text-sm font-body">
              Pagamento pendente. Atualize seu cartão para manter o acesso.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f]">
            <p className="text-white/30 text-xs font-body mb-1 flex items-center gap-1.5">
              <CalendarDays className="w-3 h-3" />
              Início
            </p>
            <p className="text-white text-sm font-body">{formatDate(account.planStartedAt)}</p>
          </div>
          {account.planStatus === 'cancelling' && account.cancelAt && (
            <div className="p-4 rounded-xl bg-[#0f0f0f] border border-orange-500/20">
              <p className="text-white/30 text-xs font-body mb-1 flex items-center gap-1.5">
                <XCircle className="w-3 h-3 text-orange-400" />
                Acesso até
              </p>
              <p className="text-orange-300 text-sm font-body">{formatDate(account.cancelAt)}</p>
            </div>
          )}
          {account.planStatus === 'trial' && account.trialEndsAt && (
            <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f]">
              <p className="text-white/30 text-xs font-body mb-1 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Trial encerra
              </p>
              <p className="text-white text-sm font-body">{formatDate(account.trialEndsAt)}</p>
            </div>
          )}
          {planConfig && (
            <div className="p-4 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f]">
              <p className="text-white/30 text-xs font-body mb-1 flex items-center gap-1.5">
                <CreditCard className="w-3 h-3" />
                Valor
              </p>
              <p className="text-white text-sm font-body">
                R$ {planConfig.price.toFixed(2).replace('.', ',')} / {planConfig.period}
              </p>
            </div>
          )}
        </div>

        {/* Benefícios do plano */}
        {planConfig && (
          <div className="space-y-2">
            <p className="text-white/30 text-xs font-body uppercase tracking-wide">Incluso no plano</p>
            <ul className="space-y-1.5">
              {planConfig.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm font-body text-white/60">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-col gap-2 pt-2 border-t border-[#252525]">
          <button
            onClick={handleManageStripe}
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-amber-500 text-[#0a0a0a] font-semibold text-sm font-body hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Abrindo portal...</>
            ) : (
              <><ExternalLink className="w-4 h-4" /> Gerenciar no Stripe</>
            )}
          </button>

          {portalError && (
            <p className="text-red-400 text-xs font-body text-center">{portalError}</p>
          )}

          <p className="text-white/25 text-xs font-body text-center">
            Atualizar cartão, ver faturas, cancelar ou mudar plano diretamente no portal Stripe.
          </p>
        </div>
      </motion.div>

      {/* Mudar plano — aparece para todos, mostra planos diferentes do atual */}
      {SAAS_PLANS.filter(p => p.id !== account.plan).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-xl bg-[#141414] border border-[#252525] space-y-4"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h2 className="text-white font-semibold font-body">Mudar plano</h2>
          </div>
          <p className="text-white/45 text-sm font-body">
            Troque para qualquer plano. A diferença de valor é calculada proporcionalmente.
          </p>
          <div className="grid grid-cols-1 gap-3">
            {SAAS_PLANS.filter(p => p.id !== account.plan).map(plan => {
              const currentPlan = SAAS_PLANS.find(p => p.id === account.plan)
              const isDowngrade = currentPlan && plan.price < currentPlan.price
              return (
                <button
                  key={plan.id}
                  onClick={() => handleChangePlan(plan.id)}
                  disabled={upgradeLoading === plan.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-[#262626] bg-[#0f0f0f] hover:border-amber-500/30 hover:bg-amber-500/[0.03] transition-all group text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div>
                    <p className="text-white text-sm font-semibold font-body group-hover:text-amber-400 transition-colors">
                      {plan.name}
                      {plan.highlight && (
                        <span className="ml-2 text-xs text-amber-400 font-normal">{plan.highlight}</span>
                      )}
                      {isDowngrade && (
                        <span className="ml-2 text-xs text-white/30 font-normal">downgrade</span>
                      )}
                    </p>
                    <p className="text-white/40 text-xs font-body mt-0.5">
                      R$ {plan.price.toFixed(2).replace('.', ',')} / {plan.period}
                    </p>
                  </div>
                  {upgradeLoading === plan.id
                    ? <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
                    : <ArrowUpRight className="w-4 h-4 text-white/30 group-hover:text-amber-400 transition-colors" />
                  }
                </button>
              )
            })}
          </div>
          {upgradeError && (
            <p className="text-red-400 text-xs font-body text-center mt-2">{upgradeError}</p>
          )}
        </motion.div>
      )}
    </div>
  )
}

export default DashboardAssinatura
