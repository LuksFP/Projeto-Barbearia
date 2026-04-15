import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Check, X as XIcon, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'

const NovaSenha = () => {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)  // link válido = sessão restaurada

  // O Supabase redireciona com #access_token=...&type=recovery na URL.
  // O SDK processa o hash durante a inicialização — antes do useEffect rodar —
  // então o evento PASSWORD_RECOVERY pode ter disparado antes da subscription.
  // Solução: checa getSession() no mount E escuta o evento como fallback.
  useEffect(() => {
    // Verifica se já existe uma sessão de recovery ativa (evento já processado)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const passwordRules = useMemo(() => [
    { label: 'Mínimo 8 caracteres',              ok: password.length >= 8 },
    { label: 'Uma letra maiúscula',               ok: /[A-Z]/.test(password) },
    { label: 'Um número',                         ok: /[0-9]/.test(password) },
    { label: 'Um caractere especial (!@#$...)',   ok: /[^A-Za-z0-9]/.test(password) },
  ], [password])

  const isStrong = passwordRules.every(r => r.ok)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isStrong) { setError('Crie uma senha que atenda a todos os requisitos.'); return }
    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Link expirado. Solicite um novo link de redefinição de senha.')
        return
      }

      // Usa Edge Function com admin client — garante que a senha é alterada
      // independente do tipo de sessão (recovery, regular) sem travar no SDK.
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15_000)

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-password`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ password }),
        }
      )
      clearTimeout(timeoutId)

      if (!res.ok) {
        const body = await res.json() as { error?: string }
        const expired = res.status === 401
        setError(expired
          ? 'Link expirado. Solicite um novo link de redefinição.'
          : (body.error ?? 'Não foi possível salvar a senha. Tente novamente.')
        )
        return
      }

      await supabase.auth.signOut()
      navigate('/entrar?senha=alterada', { replace: true })

    } catch (err) {
      const aborted = err instanceof Error && err.name === 'AbortError'
      setError(aborted
        ? 'Conexão lenta. Verifique sua internet e tente novamente.'
        : 'Erro inesperado. Tente novamente.'
      )
    } finally {
      setLoading(false)
    }
  }

  // Link inválido / já usado (sem evento PASSWORD_RECOVERY em 3s)
  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-sm text-center space-y-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 text-amber-400" />
          </div>
          <h1 className="font-heading text-2xl tracking-wide text-white">VALIDANDO LINK…</h1>
          <p className="text-white/40 text-sm font-body">
            Se o link for válido, o formulário aparecerá em instantes.
            Caso contrário,{' '}
            <a href="/esqueci-senha" className="text-amber-400/70 hover:text-amber-400 underline underline-offset-2 transition-colors">
              solicite um novo link
            </a>.
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <div className="border-b border-white/5 shrink-0">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-white/20 text-sm font-body">Redefinição de senha</span>
          <span className="font-heading text-lg text-amber-400 tracking-wider">BARBEROS</span>
          <div className="w-24" />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <h1 className="font-heading text-3xl tracking-wide text-white mb-2">NOVA SENHA</h1>
          <p className="text-white/40 text-sm font-body mb-8">
            Crie uma senha segura para sua conta BarberOS.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/40 font-body tracking-wide uppercase">
                Nova senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
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

            {/* Checklist visual de requisitos */}
            {password.length > 0 && (
              <ul className="space-y-1.5">
                {passwordRules.map(rule => (
                  <li key={rule.label} className={`flex items-center gap-2 text-xs font-body transition-colors ${rule.ok ? 'text-emerald-400' : 'text-white/30'}`}>
                    {rule.ok
                      ? <Check className="w-3.5 h-3.5 shrink-0" />
                      : <XIcon className="w-3.5 h-3.5 shrink-0" />
                    }
                    {rule.label}
                  </li>
                ))}
              </ul>
            )}

            {error && <p className="text-red-400 text-sm font-body">{error}</p>}

            <button
              type="submit"
              disabled={loading || !isStrong}
              className="w-full py-3.5 rounded-xl bg-amber-500 text-[#0a0a0a] font-semibold font-body text-sm tracking-wide hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando…' : 'Definir nova senha'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}

export default NovaSenha
