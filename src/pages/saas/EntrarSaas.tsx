import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useSaasAccount } from '@/contexts/SaasAccountContext'
import { motion } from 'framer-motion'

const EntrarSaas = () => {
  const navigate = useNavigate()
  const { login, isLoggedIn, hasActivePlan, account } = useSaasAccount()
  const [searchParams] = useSearchParams()
  const senhaAlterada = searchParams.get('senha') === 'alterada'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (isLoggedIn && hasActivePlan) {
    navigate('/dashboard', { replace: true })
    return null
  }

  if (isLoggedIn && !hasActivePlan) {
    navigate(`/pagamento?plano=${account?.plan ?? 'pro'}`, { replace: true })
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Preencha email e senha.'); return }
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (result === true) {
      navigate('/dashboard')
    } else if (typeof result === 'object' && result.status === 'payment_required') {
      navigate(`/pagamento?plano=${result.plan ?? 'pro'}`)
    } else if (result === 'blocked') {
      setError('Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.')
    } else {
      setError('Email ou senha incorretos.')
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <div className="border-b border-white/5 shrink-0">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/40 hover:text-white text-sm font-body transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Início
          </button>
          <span className="font-heading text-lg text-amber-400 tracking-wider">BARBEROS</span>
          <Link to="/planos" className="text-white/40 hover:text-white text-sm font-body transition-colors">
            Ver planos
          </Link>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          {senhaAlterada && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-emerald-400 text-sm font-body">Senha alterada com sucesso! Entre com a nova senha.</p>
            </div>
          )}
          <h1 className="font-heading text-3xl tracking-wide text-white mb-2">ENTRAR</h1>
          <p className="text-white/40 text-sm font-body mb-8">Acesse o painel da sua barbearia.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/40 font-body tracking-wide uppercase">Email</label>
              <input
                type="email"
                autoComplete="email"
                placeholder="rafael@barbearia.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/8 text-white placeholder:text-white/20 text-sm font-body focus:outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/40 font-body tracking-wide uppercase">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-white/[0.03] border border-white/8 text-white placeholder:text-white/20 text-sm font-body focus:outline-none focus:border-amber-500/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm font-body">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-amber-500 text-[#0a0a0a] font-semibold font-body text-sm tracking-wide hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando…' : 'Entrar no painel'}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-white/20 text-xs font-body">
              Não tem conta?{' '}
              <Link to="/planos" className="text-amber-400/70 hover:text-amber-400 transition-colors">
                Assinar BarberOS
              </Link>
            </p>
            <Link to="/esqueci-senha" className="text-white/25 hover:text-white/50 text-xs font-body transition-colors">
              Esqueci a senha
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default EntrarSaas
