import { Link, useNavigate } from 'react-router-dom'
import { useSaasAccount } from '@/contexts/SaasAccountContext'
import { SAAS_PLANS } from '@/types/saas'
import { useInstallApp } from '@/hooks/useInstallApp'
import { isStandaloneApp } from '@/lib/pwaHead'
import { motion } from 'framer-motion'
import { Scissors, ArrowRight, CheckCircle2 } from 'lucide-react'

const PASSOS_IPHONE = [
  'Abra esta página no Safari.',
  'Toque em Compartilhar, o quadrado com a seta pra cima.',
  'Toque em “Adicionar à Tela de Início”.',
]
const PASSOS_ANDROID = [
  'Abra esta página no Chrome.',
  'Toque nos três pontinhos no canto de cima.',
  'Toque em “Instalar app”.',
]

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
const isAndroid = () => /Android/i.test(navigator.userAgent)

function diasRestantes(fim: string | null): number | null {
  if (!fim) return null
  const ms = new Date(fim).getTime() - Date.now()
  return Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / 86_400_000)) : null
}

/** Conta nova em teste grátis: a tela existe pra uma coisa, baixar o app e receber o aviso de agendamento. */
const BemVindoTeste = () => {
  const navigate = useNavigate()
  const { account } = useSaasAccount()
  const { mode, install } = useInstallApp()
  const planConfig = SAAS_PLANS.find(p => p.id === account?.plan) ?? SAAS_PLANS[1]
  const dias = diasRestantes(account?.trialEndsAt ?? null)
  const jaInstalado = isStandaloneApp()
  const pushLiberado = planConfig.id !== 'basic'
  const passos = isIOS() ? PASSOS_IPHONE : isAndroid() ? PASSOS_ANDROID : null

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-6 py-14 lg:py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="max-w-5xl mx-auto grid lg:grid-cols-[1fr_0.8fr] gap-12 lg:gap-16 items-start"
      >
        <div>
          <p className="inline-flex items-center gap-2 text-amber-400 text-xs font-semibold tracking-[0.25em] uppercase font-body mb-5">
            <Scissors className="w-3.5 h-3.5" />
            Teste grátis ativo{dias !== null && ` · ${dias} ${dias === 1 ? 'dia' : 'dias'} restantes`}
          </p>
          <h1 className="font-heading text-5xl md:text-6xl tracking-wide leading-[0.95] mb-5">
            {account?.ownerName?.split(' ')[0].toUpperCase() ?? 'BARBEIRO'},
            <br />
            <span className="text-amber-400">BAIXA O APP.</span>
          </h1>
          <p className="text-white/60 font-body text-base leading-relaxed max-w-md mb-8">
            {pushLiberado
              ? 'Cliente marcou horário pelo seu site? O aviso chega no seu celular na hora, mesmo com o app fechado. Pra isso funcionar, o app precisa estar instalado.'
              : 'O app deixa a agenda de ' + (account?.barbershopName ?? 'sua barbearia') + ' a um toque na tela do celular. O aviso de novo horário no celular é dos planos Pro e Premium; no Básico, o aviso aparece dentro do painel.'}
          </p>

          {jaInstalado ? (
            <p className="text-white/70 text-sm font-body mb-6">Você já está no app instalado.</p>
          ) : mode === 'prompt' ? (
            <button
              type="button"
              onClick={() => void install()}
              className="px-7 py-4 rounded-xl bg-amber-500 text-[#0a0a0a] font-semibold font-body text-sm tracking-wide hover:bg-amber-400 active:translate-y-px transition-all mb-6"
            >
              Instalar o BarberPro agora
            </button>
          ) : null}

          {!jaInstalado && mode !== 'prompt' && passos && (
            <ol className="space-y-4 mb-6 max-w-sm">
              {passos.map((p, i) => (
                <li key={p} className="flex gap-4 items-baseline">
                  <span className="font-heading text-3xl leading-none text-amber-400/80 w-6 shrink-0">{i + 1}</span>
                  <span className="text-white/75 text-[15px] font-body leading-snug">{p}</span>
                </li>
              ))}
            </ol>
          )}

          {!jaInstalado && !passos && mode !== 'prompt' && (
            <p className="text-white/55 text-sm font-body mb-6 max-w-sm">
              Você está no computador. Abra o endereço{' '}
              <Link to="/app" className="text-amber-400 underline underline-offset-4">/app</Link> no navegador do celular
              pra instalar.
            </p>
          )}

          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm font-body transition-colors"
          >
            Instalo depois, ir pro painel
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="border-t border-white/10 lg:border-t-0 lg:border-l lg:pl-10 pt-8 lg:pt-0">
          <p className="text-white/45 text-xs font-semibold tracking-wide uppercase font-body mb-5">
            O que fazer nos 2 dias
          </p>
          <ol className="space-y-5">
            {[
              'Instalar o app e ligar o sininho de avisos.',
              'Cadastrar a equipe e os serviços com preço e duração.',
              'Mandar o link do seu site pros clientes marcarem.',
              'Ver o primeiro horário cair na agenda.',
            ].map((t, i) => (
              <li key={t} className="flex gap-4 items-baseline">
                <span className="font-heading text-2xl leading-none text-amber-400/70 w-6 shrink-0">{i + 1}</span>
                <span className="text-white/65 text-sm font-body leading-snug">{t}</span>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-white/35 text-xs font-body leading-relaxed">
            Se não assinar, o painel trava quando os 2 dias acabarem. Seus dados ficam guardados.
          </p>
        </div>
      </motion.div>
    </div>
  )
}

const BemVindoAssinante = () => {
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
            <span className="text-white/70">{account?.barbershopName}</span> agora é BarberPro {planConfig.name}.
          </p>
          <p className="text-white/30 font-body text-sm mb-12">
            Seu painel está pronto. Veja o que fazer primeiro:
          </p>
        </motion.div>

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

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-6 text-white/40 text-sm font-body"
        >
          Quer a agenda na tela do celular?{' '}
          <Link to="/app" className="text-amber-400 underline underline-offset-4 hover:text-amber-300">
            Instale o app
          </Link>
        </motion.p>
      </motion.div>
    </div>
  )
}

// Conta em teste grátis vê a tela do teste; quem já paga vê a de boas-vindas normal.
const BemVindo = () => {
  const { account } = useSaasAccount()
  return account?.planStatus === 'trial' ? <BemVindoTeste /> : <BemVindoAssinante />
}

export default BemVindo
