import { useNavigate } from 'react-router-dom'
import { useSaasAccount } from '@/contexts/SaasAccountContext'
import type { SaasPlan } from '@/types/saas'

/** Para onde o botão de plano leva: painel, pagamento ou cadastro, conforme a conta. */
export const useLandingCta = () => {
  const navigate = useNavigate()
  const { isLoggedIn, hasActivePlan } = useSaasAccount()

  const irParaPlano = (planId: SaasPlan) => {
    if (isLoggedIn && hasActivePlan) {
      navigate('/dashboard')
    } else if (isLoggedIn) {
      navigate(`/pagamento?plano=${planId}`)
    } else {
      navigate(`/registrar?plano=${planId}`)
    }
  }

  return { isLoggedIn, irParaPlano }
}
