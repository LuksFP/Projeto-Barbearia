// Página de callback do OAuth (Google, etc.)
// Supabase redireciona aqui após autenticação social.
// Verifica se o usuário já tem saas_account:
//   - Sim → /dashboard ou /pagamento
//   - Não → /registrar/completar (pede nome da barbearia)

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { saasAccountRepository } from '@/repositories/saasAccountRepository'

const AuthCallback = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const handle = async () => {
      // Supabase troca o code/hash por uma sessão automaticamente
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        navigate('/entrar?erro=oauth', { replace: true })
        return
      }

      const account = await saasAccountRepository.getByUserId(session.user.id)

      if (!account) {
        // Novo usuário via Google — precisa completar o cadastro
        navigate('/registrar/completar', { replace: true })
        return
      }

      if (account.plan_status === 'active') {
        navigate('/dashboard', { replace: true })
      } else {
        navigate(`/pagamento?plano=${account.plan ?? 'pro'}`, { replace: true })
      }
    }

    handle()
  }, [navigate])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-white/40 text-sm font-body">Entrando...</p>
      </div>
    </div>
  )
}

export default AuthCallback
