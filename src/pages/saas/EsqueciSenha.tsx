import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'

const EsqueciSenha = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Informe seu email.'); return }
    setLoading(true)
    setError('')

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nova-senha`,
    })

    setLoading(false)

    if (resetError) {
      // Não revelamos se o email existe ou não (segurança)
      console.error('reset error:', resetError)
    }

    // Sempre mostra sucesso — evita enumeração de emails
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <div className="border-b border-white/5 shrink-0">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/entrar')}
            className="flex items-center gap-2 text-white/40 hover:text-white text-sm font-body transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <span className="font-heading text-lg text-amber-400 tracking-wider">BARBEROS</span>
          <div className="w-16" />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {!sent ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="w-full max-w-sm"
            >
              <h1 className="font-heading text-3xl tracking-wide text-white mb-2">RECUPERAR ACESSO</h1>
              <p className="text-white/40 text-sm font-body mb-8">
                Informe o email da sua conta e enviaremos um link para redefinir a senha.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-white/40 font-body tracking-wide uppercase">
                    Email
                  </label>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="rafael@barbearia.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError('') }}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/8 text-white placeholder:text-white/20 text-sm font-body focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                </div>

                {error && <p className="text-red-400 text-sm font-body">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-amber-500 text-[#0a0a0a] font-semibold font-body text-sm tracking-wide hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Enviando…' : 'Enviar link de redefinição'}
                </button>
              </form>

              <p className="text-white/20 text-xs font-body text-center mt-6">
                Lembrou a senha?{' '}
                <Link to="/entrar" className="text-amber-400/70 hover:text-amber-400 transition-colors">
                  Entrar
                </Link>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="sent"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-sm text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <h1 className="font-heading text-2xl tracking-wide text-white mb-3">EMAIL ENVIADO</h1>
              <p className="text-white/45 text-sm font-body leading-relaxed mb-2">
                Se <span className="text-white/70">{email}</span> estiver cadastrado, você receberá um link para redefinir sua senha em instantes.
              </p>
              <p className="text-white/25 text-xs font-body mb-8">
                Verifique também a caixa de spam.
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setSent(false); setEmail('') }}
                  className="flex-1 py-3 rounded-xl border border-white/8 text-white/45 hover:text-white hover:border-white/20 text-sm font-body transition-colors"
                >
                  Tentar outro email
                </button>
                <Link
                  to="/entrar"
                  className="flex-1 py-3 rounded-xl bg-amber-500 text-[#0a0a0a] font-semibold font-body text-sm text-center hover:bg-amber-400 transition-colors"
                >
                  Voltar ao login
                </Link>
              </div>

              <div className="mt-6 flex items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <Mail className="w-4 h-4 text-white/25 shrink-0" />
                <p className="text-white/30 text-xs font-body text-left">
                  O link expira em 1 hora. Caso não receba, verifique o spam ou solicite um novo link.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default EsqueciSenha
