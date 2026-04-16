import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft, Scissors, Check, X as XIcon } from 'lucide-react'
import { useSaasAccount } from '@/contexts/SaasAccountContext'
import { SAAS_PLANS } from '@/types/saas'
import type { SaasPlan } from '@/types/saas'
import { motion } from 'framer-motion'

const Registrar = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const plano = (searchParams.get('plano') ?? 'pro') as SaasPlan
  const planConfig = SAAS_PLANS.find(p => p.id === plano) ?? SAAS_PLANS[1]

  const { signup, isLoggedIn, hasActivePlan, account } = useSaasAccount()

  const [form, setForm] = useState({
    ownerName: '',
    barbershopName: '',
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const passwordRules = useMemo(() => [
    { label: 'Mínimo 8 caracteres', ok: form.password.length >= 8 },
    { label: 'Uma letra maiúscula', ok: /[A-Z]/.test(form.password) },
    { label: 'Um número', ok: /[0-9]/.test(form.password) },
    { label: 'Um caractere especial (!@#$...)', ok: /[^A-Za-z0-9]/.test(form.password) },
  ], [form.password])

  const isPasswordStrong = passwordRules.every(r => r.ok)

  if (isLoggedIn && hasActivePlan && account?.plan) {
    navigate('/dashboard', { replace: true })
    return null
  }

  if (isLoggedIn && !hasActivePlan) {
    navigate(`/pagamento?plano=${account?.plan ?? plano}`, { replace: true })
    return null
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.ownerName || !form.barbershopName || !form.email || !form.password) {
      setError('Preencha todos os campos.')
      return
    }
    if (form.barbershopName.replace(/[^a-z0-9]/gi, '').length < 3) {
      setError('Nome da barbearia muito curto. Use pelo menos 3 letras ou números.')
      return
    }
    if (!isPasswordStrong) {
      setError('Senha não atende aos requisitos de segurança.')
      return
    }
    setLoading(true)
    try {
      await signup({ ...form, plan: plano })
      navigate(`/pagamento?plano=${plano}`)
    } catch (signupError) {
      setError(
        signupError instanceof Error
          ? signupError.message
          : 'Erro ao criar conta. Tente novamente.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-16 flex flex-col">
      {/* Header */}
      <div className="border-b border-white/5 shrink-0">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/planos')}
            className="flex items-center gap-2 text-white/40 hover:text-white text-sm font-body transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Planos
          </button>
          <span className="font-heading text-lg text-amber-400 tracking-wider">BARBEROS</span>
          <Link to="/entrar" className="text-white/40 hover:text-white text-sm font-body transition-colors">
            Já tenho conta
          </Link>
        </div>
      </div>

      {/* Progresso */}
      <div className="shrink-0 border-b border-white/5">
        <div className="max-w-xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            {['Plano', 'Cadastro', 'Pagamento'].map((step, i) => (
              <div key={step} className="flex items-center gap-3 flex-1">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-heading ${
                    i === 1
                      ? 'bg-amber-500 text-[#0a0a0a]'
                      : i === 0
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-white/5 text-white/20'
                  }`}>
                    {i === 0 ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs font-body ${i === 1 ? 'text-white' : i === 0 ? 'text-amber-400' : 'text-white/20'}`}>
                    {step}
                  </span>
                </div>
                {i < 2 && <div className={`flex-1 h-px ${i === 0 ? 'bg-amber-500/30' : 'bg-white/5'}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Plano selecionado */}
            <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] mb-8">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                <Scissors className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-amber-400 text-xs font-semibold font-body">Plano selecionado</p>
                <p className="text-white font-semibold font-body">{planConfig.name} — R$ {planConfig.price.toFixed(2).replace('.', ',')}/mês</p>
              </div>
              <button
                onClick={() => navigate('/planos')}
                className="text-white/30 hover:text-white/60 text-xs font-body transition-colors"
              >
                Trocar
              </button>
            </div>

            <h1 className="font-heading text-3xl tracking-wide text-white mb-2">CRIAR CONTA</h1>
            <p className="text-white/40 text-sm font-body mb-8">
              Sua conta fica pendente ate a confirmacao do pagamento no proximo passo.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/40 font-body tracking-wide uppercase">
                  Seu nome
                </label>
                <input
                  name="ownerName"
                  type="text"
                  autoComplete="name"
                  placeholder="Rafael Moura"
                  value={form.ownerName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/8 text-white placeholder:text-white/20 text-sm font-body focus:outline-none focus:border-amber-500/50 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/40 font-body tracking-wide uppercase">
                  Nome da barbearia
                </label>
                <input
                  name="barbershopName"
                  type="text"
                  autoComplete="organization"
                  placeholder="Barbearia Corvo"
                  value={form.barbershopName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/8 text-white placeholder:text-white/20 text-sm font-body focus:outline-none focus:border-amber-500/50 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/40 font-body tracking-wide uppercase">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="rafael@barbearia.com"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/8 text-white placeholder:text-white/20 text-sm font-body focus:outline-none focus:border-amber-500/50 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/40 font-body tracking-wide uppercase">
                  Senha
                </label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
                    value={form.password}
                    onChange={handleChange}
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
                {form.password.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex gap-1">
                      {passwordRules.map((rule, i) => (
                        <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${rule.ok ? 'bg-emerald-500' : 'bg-white/10'}`} />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                      {passwordRules.map((rule) => (
                        <div key={rule.label} className={`flex items-center gap-1.5 text-xs font-body transition-colors ${rule.ok ? 'text-emerald-400' : 'text-white/30'}`}>
                          {rule.ok
                            ? <Check className="w-3 h-3 shrink-0" />
                            : <XIcon className="w-3 h-3 shrink-0" />
                          }
                          {rule.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <p className="text-red-400 text-sm font-body">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-amber-500 text-[#0a0a0a] font-semibold font-body text-sm tracking-wide hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? 'Criando conta...' : 'Criar conta e ir para pagamento →'}
              </button>
            </form>

            <p className="text-white/20 text-xs font-body text-center mt-6">
              Ao continuar você concorda com os{' '}
              <span className="text-white/40 hover:text-white/60 cursor-pointer transition-colors">
                Termos de Uso
              </span>{' '}
              e{' '}
              <span className="text-white/40 hover:text-white/60 cursor-pointer transition-colors">
                Política de Privacidade
              </span>
              .
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default Registrar
