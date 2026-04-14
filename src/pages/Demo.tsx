import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { setDemoSession, isDemoRouteAllowed, type DemoPlan } from '@/lib/demo'

const VALID_PLANS: DemoPlan[] = ['basic', 'pro', 'premium']

const Demo = () => {
  const { plan } = useParams<{ plan: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isDemoRouteAllowed()) {
      navigate('/planos', { replace: true })
      return
    }
    const p = plan as DemoPlan
    if (!VALID_PLANS.includes(p)) {
      navigate('/planos', { replace: true })
      return
    }
    setDemoSession(p)
    // Força reload completo para que SaasAccountContext releia a sessionStorage
    window.location.replace('/dashboard')
  }, [plan, navigate])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
    </div>
  )
}

export default Demo
