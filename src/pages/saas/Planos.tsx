import { useNavigate, useSearchParams } from 'react-router-dom'
import { Check, Crown, Zap, Sparkles, ArrowLeft, CalendarCheck, Globe, Star } from 'lucide-react'
import { SAAS_PLANS } from '@/types/saas'
import type { SaasPlan } from '@/types/saas'
import { motion } from 'framer-motion'
import { useSaasAccount } from '@/contexts/SaasAccountContext'

const PLAN_ICONS = {
  basic: CalendarCheck,
  pro: Globe,
  premium: Sparkles,
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.45 } }),
}

// Features exclusivas do Premium — destacadas visualmente
const PREMIUM_FEATURES = [
  'Site personalizado (design exclusivo)',
  'Domínio próprio incluso',
  'SEO local configurado',
]

const Planos = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const planoAtual = searchParams.get('plano') as SaasPlan | null
  const trialExpired = searchParams.get('trial') === 'expired'
  const { account } = useSaasAccount()

  const handleSelect = (plan: SaasPlan) => {
    if (account) {
      const trialExpiredNow = account.planStatus === 'trial'
        && !!account.trialEndsAt
        && new Date(account.trialEndsAt) <= new Date()
      // Conta existente sem acesso ativo → vai direto pro pagamento
      if (trialExpiredNow || !['active', 'trial'].includes(account.planStatus ?? '')) {
        navigate(`/pagamento?plano=${plan}`)
        return
      }
    }
    navigate(`/registrar?plano=${plan}`)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pt-16">
      {/* Header */}
      <div className="border-b border-[#1a1a1a]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/40 hover:text-white text-sm font-body transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <span className="font-heading text-lg text-amber-400 tracking-wider">BARBEROS</span>
          <button
            onClick={() => navigate('/entrar')}
            className="text-white/40 hover:text-white text-sm font-body transition-colors"
          >
            Já tenho conta
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-20">

        {/* Banner trial expirado */}
        {trialExpired && (
          <div className="mb-10 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
            <p className="text-red-400 text-sm font-semibold font-body mb-1">Seu período de teste encerrou.</p>
            <p className="text-red-400/60 text-xs font-body">Escolha um plano abaixo para continuar usando o BarberOS.</p>
          </div>
        )}

        {/* Headline */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="text-center mb-14"
        >
          <p className="text-amber-400 text-xs font-semibold tracking-[0.3em] uppercase mb-4 font-body">
            Plataforma BarberOS
          </p>
          <h1 className="font-heading text-5xl md:text-6xl tracking-wider text-white mb-6">
            ESCOLHA SEU PLANO
          </h1>
          <p className="text-white/45 text-lg max-w-xl mx-auto font-body">
            Comece em 5 minutos. Sem taxa de adesão, sem contrato mínimo.
          </p>
        </motion.div>

        {/* O que cada plano entrega */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={0.5}
          className="mb-12"
        >
          <p className="text-white/30 text-xs font-semibold tracking-[0.25em] uppercase font-body text-center mb-5">
            O que está incluso em cada plano
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Básico */}
            <div className="p-6 rounded-2xl bg-[#141414] border border-[#242424]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <CalendarCheck className="w-5 h-5 text-white/50" />
                </div>
                <div>
                  <p className="text-white font-semibold font-body">Básico</p>
                  <p className="text-white/35 text-xs font-body">Só a agenda</p>
                </div>
              </div>
              <p className="text-white/45 text-sm font-body leading-relaxed">
                Sistema de agendamento completo. Seus clientes marcam horário online 24h, você gerencia pelo dashboard.
              </p>
            </div>

            {/* Pro */}
            <div className="p-6 rounded-2xl bg-[#141414] border border-[#242424]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white font-semibold font-body">Pro</p>
                  <p className="text-emerald-400 text-xs font-body font-semibold tracking-wide">Agenda + site genérico</p>
                </div>
              </div>
              <p className="text-white/45 text-sm font-body leading-relaxed">
                Tudo do Básico + site publicado na hora em <span className="text-white/65 font-mono text-xs">barberos.io/b/slug</span>. Template profissional com cores, logo e equipe.
              </p>
            </div>

            {/* Premium */}
            <div className="relative p-6 rounded-2xl bg-[#16120a] border border-amber-500/20 overflow-hidden">
              <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-[#0a0a0a] text-xs font-bold font-body">
                <Star className="w-3 h-3" />
                TOP
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-white font-semibold font-body">Premium</p>
                  <p className="text-amber-400 text-xs font-body font-semibold tracking-wide">Agenda + site personalizado + domínio</p>
                </div>
              </div>
              <p className="text-white/45 text-sm font-body leading-relaxed">
                Tudo do Pro + site com design exclusivo para a sua barbearia, domínio próprio incluso e SEO local configurado.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {SAAS_PLANS.map((plan, i) => {
            const Icon = PLAN_ICONS[plan.id]
            const isPro = plan.id === 'pro'
            const isPremium = plan.id === 'premium'
            const isHighlighted = isPro || isPremium
            const isSelected = planoAtual === plan.id

            return (
              <motion.div
                key={plan.id}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={i + 1}
                className={`relative flex flex-col p-8 rounded-2xl border transition-all cursor-pointer group ${
                  isPremium
                    ? 'border-amber-500/40 bg-amber-500/[0.06]'
                    : isPro
                    ? 'border-emerald-500/25 bg-emerald-500/[0.04]'
                    : isSelected
                    ? 'border-[#333] bg-[#181818]'
                    : 'border-[#222] bg-[#141414] hover:border-[#2e2e2e] hover:bg-[#181818]'
                }`}
                onClick={() => handleSelect(plan.id)}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-[#0a0a0a] text-xs font-bold font-body whitespace-nowrap">
                    <Crown className="w-3 h-3" />
                    {plan.highlight}
                  </div>
                )}

                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-6 ${
                  isPremium
                    ? 'bg-amber-500/20 border border-amber-500/35'
                    : isPro
                    ? 'bg-emerald-500/15 border border-emerald-500/25'
                    : 'bg-[#222] border border-[#2e2e2e]'
                }`}>
                  <Icon className={`w-5 h-5 ${
                    isPremium ? 'text-amber-400' : isPro ? 'text-emerald-400' : 'text-white/50'
                  }`} />
                </div>

                <h2 className="font-heading text-2xl tracking-wide text-white mb-1">{plan.name}</h2>
                <div className="flex items-baseline gap-1.5 mb-4">
                  <span className={`font-heading text-4xl ${
                    isPremium ? 'text-amber-400' : isPro ? 'text-emerald-400' : 'text-white'
                  }`}>
                    R$ {plan.price.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-white/30 text-sm font-body">/{plan.period}</span>
                </div>
                <p className="text-white/45 text-sm font-body leading-relaxed mb-8 flex-1">
                  {plan.description}
                </p>

                <ul className="space-y-2.5 mb-8">
                  {plan.features.map((f, fi) => {
                    const isPremiumFeature = PREMIUM_FEATURES.includes(f)
                    return (
                      <li key={fi} className="flex items-start gap-2.5 text-sm font-body">
                        <Check className={`w-4 h-4 shrink-0 mt-0.5 ${
                          isPremiumFeature ? 'text-amber-400' : isHighlighted ? (isPremium ? 'text-amber-400/70' : 'text-emerald-400/70') : 'text-white/40'
                        }`} />
                        <span className={isPremiumFeature ? 'text-white/90 font-medium' : 'text-white/65'}>
                          {f}
                        </span>
                      </li>
                    )
                  })}
                </ul>

                <button
                  onClick={(e) => { e.stopPropagation(); handleSelect(plan.id) }}
                  className={`w-full py-3 rounded-lg font-semibold text-sm font-body tracking-wide transition-all ${
                    isPremium
                      ? 'bg-amber-500 text-[#0a0a0a] hover:bg-amber-400'
                      : isPro
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                      : 'border border-[#333] text-white/60 hover:text-white hover:border-[#444]'
                  }`}
                >
                  {plan.cta}
                </button>
              </motion.div>
            )
          })}
        </div>

        {/* Footer note */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={5}
          className="mt-10 p-5 rounded-2xl bg-[#141414] border border-[#242424] flex flex-col md:flex-row items-start md:items-center gap-4 justify-between"
        >
          <div>
            <p className="text-white/60 text-sm font-body leading-relaxed">
              <span className="text-white font-semibold">Básico</span> só agenda.{' '}
              <span className="text-white font-semibold">Pro</span> adiciona site genérico em barberos.io.{' '}
              <span className="text-white font-semibold">Premium</span> entrega site exclusivo com domínio próprio incluso.
            </p>
          </div>
          <p className="text-white/25 text-xs font-body shrink-0">Cancele quando quiser. Sem multa.</p>
        </motion.div>
      </div>
    </div>
  )
}

export default Planos
