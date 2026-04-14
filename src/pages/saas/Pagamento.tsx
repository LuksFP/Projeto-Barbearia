// SEGURANÇA: dados de cartão NUNCA passam por este código.
// O pagamento é processado 100% pelo Stripe Checkout (redirect).
// Este componente apenas inicia a sessão de checkout via backend.

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Lock, ExternalLink } from 'lucide-react'
import { useSaasAccount } from '@/contexts/SaasAccountContext'
import { SAAS_PLANS } from '@/types/saas'
import type { SaasPlan } from '@/types/saas'
import { motion } from 'framer-motion'

const Pagamento = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const plano = (searchParams.get('plano') ?? 'pro') as SaasPlan
  const planConfig = SAAS_PLANS.find(p => p.id === plano) ?? SAAS_PLANS[1]

  const { account, accessToken } = useSaasAccount()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!account) navigate('/registrar', { replace: true })
  }, [account, navigate])

  if (!account) return null

  const handleCheckout = async () => {
    setError('')
    setLoading(true)
    try {
      if (!accessToken) throw new Error('Sessão expirada. Faça login novamente.')

      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/billing-create-checkout`
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          plan: plano,
          successUrl: `${window.location.origin}/dashboard?checkout=success`,
          cancelUrl: `${window.location.origin}/pagamento?plano=${plano}`,
        }),
      })

      if (!res.ok) {
        const body = await res.json() as { error?: string }
        throw new Error(body.error ?? 'Erro ao criar sessão de checkout.')
      }

      const { url } = await res.json() as { url: string }
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar checkout.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-16 flex flex-col">
      {/* Header */}
      <div className="border-b border-white/5 shrink-0">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(`/registrar?plano=${plano}`)}
            className="flex items-center gap-2 text-white/40 hover:text-white text-sm font-body transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Cadastro
          </button>
          <span className="font-heading text-lg text-amber-400 tracking-wider">BARBEROS</span>
          <div className="flex items-center gap-1.5 text-white/20 text-xs font-body">
            <Lock className="w-3 h-3" />
            Pagamento seguro
          </div>
        </div>
      </div>

      {/* Progresso */}
      <div className="shrink-0 border-b border-white/5">
        <div className="max-w-xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            {['Plano', 'Cadastro', 'Pagamento'].map((s, i) => (
              <div key={s} className="flex items-center gap-3 flex-1">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-heading ${
                    i < 2 ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-500 text-[#0a0a0a]'
                  }`}>
                    {i < 2 ? '✓' : '3'}
                  </div>
                  <span className={`text-xs font-body ${i === 2 ? 'text-white' : 'text-amber-400'}`}>{s}</span>
                </div>
                {i < 2 && <div className="flex-1 h-px bg-amber-500/30" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Resumo do plano */}
          <div className="p-5 rounded-xl border border-amber-500/20 bg-amber-500/[0.03] mb-8">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white/40 text-xs font-body">Você está assinando</p>
                <p className="text-white font-semibold font-body">BarberOS {planConfig.name}</p>
              </div>
              <div className="text-right">
                <p className="font-heading text-2xl text-amber-400">R$ {planConfig.price.toFixed(2).replace('.', ',')}</p>
                <p className="text-white/30 text-xs font-body">/mês</p>
              </div>
            </div>
            <div className="pt-3 border-t border-white/5 text-white/30 text-xs font-body">
              Cobrado mensalmente · Cancele quando quiser
            </div>
          </div>

          <h1 className="font-heading text-3xl tracking-wide text-white mb-3">PAGAMENTO</h1>
          <p className="text-white/40 text-sm font-body mb-8">
            Você será redirecionado para o Stripe para finalizar com segurança.
            Nenhum dado de cartão trafega pelo nosso servidor.
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-sm font-body">{error}</p>
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-amber-500 text-[#0a0a0a] font-semibold font-body text-sm tracking-wide hover:bg-amber-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 rounded-full border-2 border-[#0a0a0a]/30 border-t-[#0a0a0a] animate-spin" />
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Ir para o Stripe — R$ {planConfig.price.toFixed(2).replace('.', ',')}/mês
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </>
            )}
          </button>

          <p className="text-white/15 text-xs font-body text-center mt-5">
            Processado pelo Stripe. Criptografia SSL. Não armazenamos dados de cartão.
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default Pagamento
