import { useNavigate } from 'react-router-dom'
import { useSaasAccount } from '@/contexts/SaasAccountContext'
import { SAAS_PLANS } from '@/types/saas'
import { motion } from 'framer-motion'
import { Scissors, ArrowRight, CheckCircle2 } from 'lucide-react'

const BemVindo = () => {
  const navigate = useNavigate()
  const { account } = useSaasAccount()
  const planConfig = SAAS_PLANS.find(p => p.id === account?.plan) ?? SAAS_PLANS[1]

  const nextSteps = [
    'Configure o perfil da sua barbearia',
    'Adicione sua equipe de barbeiros',
    'Personalize seus serviços e preços',
    'Compartilhe o link do seu site público',
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg text-center"
      >
        {/* Ícone */}
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
          className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-8"
        >
          <Scissors className="w-9 h-9 text-amber-400" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <p className="text-amber-400 text-xs font-semibold tracking-[0.3em] uppercase font-body mb-3">
            Conta ativada
          </p>
          <h1 className="font-heading text-4xl md:text-5xl tracking-wider text-white mb-4">
            BEM-VINDO,<br />
            {account?.ownerName?.split(' ')[0].toUpperCase() ?? 'BARBEIRO'}!
          </h1>
          <p className="text-white/40 font-body text-base mb-2">
            <span className="text-white/70">{account?.barbershopName}</span> agora é BarberOS {planConfig.name}.
          </p>
          <p className="text-white/30 font-body text-sm mb-12">
            Seu painel está pronto. Veja o que fazer primeiro:
          </p>
        </motion.div>

        {/* Próximos passos */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-left space-y-3 mb-10"
        >
          {nextSteps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.45 + i * 0.08 }}
              className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-400/60 shrink-0" />
              <span className="text-white/60 text-sm font-body">{step}</span>
            </motion.div>
          ))}
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-amber-500 text-[#0a0a0a] font-semibold font-body text-sm tracking-wide hover:bg-amber-400 transition-colors"
        >
          Acessar meu painel
          <ArrowRight className="w-4 h-4" />
        </motion.button>
      </motion.div>
    </div>
  )
}

export default BemVindo
