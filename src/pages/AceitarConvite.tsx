// PÃ¡gina de aceitaÃ§Ã£o de convite de barbeiro
// Acessada via link no email: /aceitar-convite?token=xxx&email=yyy&name=zzz&barbershop=www

import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Scissors, Eye, EyeOff, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getAuthErrorMessage } from '@/lib/authErrors'
import { motion } from 'framer-motion'

type Step = 'form' | 'loading' | 'success' | 'error'

const inputCls = 'w-full bg-[#161616] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm font-body placeholder:text-white/20 focus:outline-none focus:border-amber-500/50 transition-colors'

const AceitarConvite = () => {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const token = params.get('token') ?? ''
  const emailParam = params.get('email') ?? ''
  const nameParam = params.get('name') ?? ''
  const barbershop = params.get('barbershop') ?? 'sua barbearia'

  const [step, setStep] = useState<Step>('form')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  if (!token || !emailParam) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h1 className="text-white font-heading text-xl mb-2">Link inválido</h1>
          <p className="text-white/45 text-sm font-body">
            Este link de convite está incompleto ou corrompido. Solicite um novo convite ao dono da barbearia.
          </p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }

    setStep('loading')
    setError('')

    try {
      const { data: authData } = await supabase.auth.signUp({
        email: emailParam,
        password,
      })

      if (!authData.session) {
        throw new Error('Confirme seu email antes de continuar.')
      }

      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-invite`
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authData.session.access_token}`,
        },
        body: JSON.stringify({ token }),
      })

      if (!res.ok) {
        const body = await res.json() as { error?: string }
        throw new Error(body.error ?? 'Erro ao aceitar convite.')
      }

      setStep('success')
    } catch (err) {
      setError(getAuthErrorMessage(err))
      setStep('form')
    }
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-white font-heading text-2xl tracking-wide mb-3">TUDO CERTO!</h1>
          <p className="text-white/50 text-sm font-body mb-8">
            Sua conta foi criada e você já está na equipe de{' '}
            <span className="text-white">{barbershop}</span>.
          </p>
          <button
            onClick={() => navigate('/entrar')}
            className="px-6 py-3 rounded-xl bg-amber-500 text-[#0a0a0a] font-semibold text-sm font-body hover:bg-amber-400 transition-colors"
          >
            Entrar no painel →
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Scissors className="w-4 h-4 text-amber-400" />
          </div>
          <span className="font-heading text-xl text-amber-400 tracking-wider">BARBEROS</span>
        </div>

        <div className="mb-8">
          <h1 className="font-heading text-2xl tracking-wide text-white mb-2">
            Aceitar convite
          </h1>
          <p className="text-white/45 text-sm font-body">
            Você foi convidado para a equipe de{' '}
            <span className="text-white font-medium">{barbershop}</span>.
            Crie sua senha para ativar o acesso.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/40 text-xs font-body mb-1.5 uppercase tracking-wide">
              Nome
            </label>
            <input
              type="text"
              value={decodeURIComponent(nameParam)}
              disabled
              className={`${inputCls} opacity-50 cursor-not-allowed`}
            />
          </div>

          <div>
            <label className="block text-white/40 text-xs font-body mb-1.5 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={emailParam}
              disabled
              className={`${inputCls} opacity-50 cursor-not-allowed`}
            />
          </div>

          <div>
            <label className="block text-white/40 text-xs font-body mb-1.5 uppercase tracking-wide">
              Criar senha *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoFocus
                className={`${inputCls} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/[0.06] border border-red-500/20">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-300/90 text-xs font-body">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={step === 'loading' || password.length < 8}
            className="w-full py-3.5 rounded-xl bg-amber-500 text-[#0a0a0a] font-bold text-sm font-body hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {step === 'loading'
              ? <><Loader2 className="w-4 h-4 animate-spin" />Criando conta…</>
              : 'Criar conta e entrar na equipe'
            }
          </button>
        </form>

        <p className="text-white/20 text-xs font-body text-center mt-6">
          Ao criar sua conta, você concorda com os termos de uso do BarberOS.
        </p>
      </motion.div>
    </div>
  )
}

export default AceitarConvite
