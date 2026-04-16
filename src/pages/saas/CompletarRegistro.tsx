// Página exibida após OAuth (Google) quando o usuário ainda não tem saas_account.
// O usuário já está autenticado — só precisamos do nome da barbearia e do plano.

import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Scissors } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { saasAccountRepository, slugify } from '@/repositories/saasAccountRepository'
import { useSaasAccount } from '@/contexts/SaasAccountContext'
import { SAAS_PLANS } from '@/types/saas'
import type { SaasPlan } from '@/types/saas'
import { motion } from 'framer-motion'

function generateEmbedKey(slug: string): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  const rand = Array.from(bytes, b => chars[b % chars.length]).join('')
  return `bos_${slug}_${rand}`
}

const CompletarRegistro = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const plano = (searchParams.get('plano') ?? 'pro') as SaasPlan
  const planConfig = SAAS_PLANS.find(p => p.id === plano) ?? SAAS_PLANS[1]

  const { refreshAccount } = useSaasAccount()

  const [barbershopName, setBarbershopName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!barbershopName.trim()) { setError('Informe o nome da barbearia.'); return }
    if (barbershopName.replace(/[^a-z0-9]/gi, '').length < 3) {
      setError('Nome muito curto. Use pelo menos 3 letras ou números.')
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada. Faça login novamente.')

      const slug = slugify(barbershopName)
      const embedKey = generateEmbedKey(slug)

      const { error: rpcError } = await supabase.rpc('create_saas_account' as never, {
        p_user_id:    session.user.id,
        p_owner_name: session.user.user_metadata?.full_name ?? session.user.email ?? '',
        p_barb_name:  barbershopName,
        p_barb_slug:  slug,
        p_embed_key:  embedKey,
      } as never)

      if (rpcError) {
        if (rpcError.message?.includes('barbershops_slug_format')) {
          throw new Error('Nome da barbearia inválido. Use pelo menos 3 letras.')
        }
        if (rpcError.code === '23505') {
          throw new Error('Já existe uma barbearia com esse nome. Tente outro.')
        }
        throw new Error(rpcError.message ?? 'Erro ao criar conta.')
      }

      await refreshAccount()
      navigate(`/pagamento?plano=${plano}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] mb-8">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
            <Scissors className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-amber-400 text-xs font-semibold font-body">Plano selecionado</p>
            <p className="text-white font-semibold font-body text-sm">{planConfig.name} — R$ {planConfig.price.toFixed(2).replace('.', ',')}/mês</p>
          </div>
        </div>

        <h1 className="font-heading text-3xl tracking-wide text-white mb-2">QUASE LÁ</h1>
        <p className="text-white/40 text-sm font-body mb-8">
          Só falta o nome da sua barbearia para criar sua conta.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/40 font-body tracking-wide uppercase">
              Nome da barbearia
            </label>
            <input
              type="text"
              autoFocus
              placeholder="Barbearia Corvo"
              value={barbershopName}
              onChange={e => { setBarbershopName(e.target.value); setError('') }}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/8 text-white placeholder:text-white/20 text-sm font-body focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          {error && <p className="text-red-400 text-sm font-body">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-amber-500 text-[#0a0a0a] font-semibold font-body text-sm tracking-wide hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Criando conta...' : 'Criar conta e ir para pagamento →'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}

export default CompletarRegistro
