import type { MouseEvent, ReactNode } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SAAS_PLANS } from '@/types/saas'
import { useSaasAccount } from '@/contexts/SaasAccountContext'

const proofStrip = [
  'Configuração inicial rápida',
  'Sem contrato anual',
  'Plano pronto para crescer com a casa',
]

const benefits = [
  'Agenda online para parar de perder horário e cliente',
  'Site pronto para colocar no ar sem projeto separado',
  'Painel para equipe, clientes e operação no mesmo lugar',
]

const heroStats = [
  { value: '+32%', label: 'agenda mais previsível', detail: 'menos buraco na semana' },
  { value: '24h', label: 'link vendendo sozinho', detail: 'cliente agenda fora do horário' },
  { value: '1 lugar', label: 'operação centralizada', detail: 'site, agenda e equipe' },
]

const motionStrip = [
  'agenda online',
  'confirmação automática',
  'mais retorno',
  'menos buraco na agenda',
  'site no ar',
  'equipe organizada',
  'cliente volta mais',
]

const testimonials = [
  {
    quote: 'A gente saiu do caderno em dois dias. Só isso já limpou a recepção e reduziu falta.',
    name: 'Rafael Moura',
    role: 'Barbearia Corvo',
  },
  {
    quote: 'Antes eu perdia cliente no direct. Hoje mando um link e o cara entende na hora como agendar.',
    name: 'João Faria',
    role: 'Casa Faria',
  },
  {
    quote: 'O que mais pesou foi parecer profissional sem contratar site, designer e sistema separado.',
    name: 'Mateus Prado',
    role: 'Clube 27',
  },
]

const comparisonLists = {
  without: [
    'Agenda no caderno, cheia de rasuras',
    'WhatsApp lotado de mensagens perdidas',
    'Clientes esperando sem previsão',
    'Sem controle de faturamento',
  ],
  with: [
    'Agendamento online 24h',
    'Notificações automáticas',
    'Relatórios claros e objetivos',
    'Faturamento sob controle',
  ],
}

const setupSteps = [
  'Crie sua conta em 1 minuto',
  'Cadastre seus barbeiros',
  'Compartilhe seu link de agendamento',
  'Receba clientes no piloto automático',
]

const resultCards = [
  { name: 'João Silva', city: 'São Paulo, SP', result: 'Aumentou em 40% os agendamentos no primeiro mês' },
  { name: 'Carlos Mendes', city: 'Belo Horizonte, MG', result: 'Parou de perder clientes por esquecimento' },
  { name: 'Rafael Torres', city: 'Rio de Janeiro, RJ', result: 'Organizou 3 barbeiros sem precisar de secretária' },
]

const faqs = [
  {
    question: 'Preciso contratar site por fora?',
    answer: 'Não. A própria plataforma já entrega a página pública junto da agenda e da operação interna.',
  },
  {
    question: 'Quanto tempo leva para começar?',
    answer: 'A proposta é justamente reduzir atrito: cadastro, pagamento e configuração inicial no mesmo fluxo.',
  },
  {
    question: 'Qual plano faz mais sentido para a maioria?',
    answer: 'O Pro tende a encaixar melhor porque junta agenda, site e operação completa sem precisar de estrutura paralela.',
  },
]

const revealUp = {
  initial: { opacity: 0, y: 26, scale: 0.985 },
  whileInView: { opacity: 1, y: 0, scale: 1 },
}

const liftCard = {
  y: -8,
  scale: 1.012,
  transition: { duration: 0.22, ease: 'easeOut' },
}

const iconFloat = {
  y: -3,
  scale: 1.06,
  transition: { duration: 0.22, ease: 'easeOut' },
}

const ParallaxCard = ({
  children,
  className,
  glowClassName = 'from-[#c79b4b]/20 via-[#f0d39a]/10 to-transparent',
}: {
  children: ReactNode
  className: string
  glowClassName?: string
}) => {
  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  const mouseX = useMotionValue(50)
  const mouseY = useMotionValue(50)

  const smoothRotateX = useSpring(rotateX, { stiffness: 180, damping: 18, mass: 0.4 })
  const smoothRotateY = useSpring(rotateY, { stiffness: 180, damping: 18, mass: 0.4 })
  const smoothMouseX = useSpring(mouseX, { stiffness: 180, damping: 18, mass: 0.4 })
  const smoothMouseY = useSpring(mouseY, { stiffness: 180, damping: 18, mass: 0.4 })

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const relativeX = (event.clientX - rect.left) / rect.width
    const relativeY = (event.clientY - rect.top) / rect.height

    rotateX.set((0.5 - relativeY) * 7)
    rotateY.set((relativeX - 0.5) * 9)
    mouseX.set(relativeX * 100)
    mouseY.set(relativeY * 100)
  }

  const handleMouseLeave = () => {
    rotateX.set(0)
    rotateY.set(0)
    mouseX.set(50)
    mouseY.set(50)
  }

  const glare = useMotionTemplate`radial-gradient(circle at ${smoothMouseX}% ${smoothMouseY}%, rgba(245, 212, 149, 0.18), transparent 34%)`

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX: smoothRotateX,
        rotateY: smoothRotateY,
        transformPerspective: 1200,
        transformStyle: 'preserve-3d',
      }}
      whileHover={{ y: -10, scale: 1.016 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={`group relative overflow-hidden ${className}`}
    >
      <motion.div
        aria-hidden
        style={{ backgroundImage: glare }}
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      />
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${glowClassName} opacity-90`} />
      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}

const Index = () => {
  const navigate = useNavigate()
  const { isLoggedIn, hasActivePlan } = useSaasAccount()

  const handlePlanCta = (planId: string) => {
    if (isLoggedIn && hasActivePlan) {
      navigate('/dashboard')
    } else if (isLoggedIn && !hasActivePlan) {
      navigate(`/pagamento?plano=${planId}`)
    } else {
      navigate(`/registrar?plano=${planId}`)
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0a08] text-[#efe6d7]">
      <section className="relative overflow-hidden px-6 pb-24 pt-36 sm:px-8 sm:pb-28 lg:px-12 lg:pt-40">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(198,151,67,0.16),transparent_22%),radial-gradient(circle_at_84%_18%,rgba(255,130,72,0.07),transparent_18%),linear-gradient(180deg,#0b0a08_0%,#0d0a07_52%,#090806_100%)]" />
        <motion.div
          animate={{ x: [0, 18, 0], y: [0, -10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute -left-8 top-24 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(199,155,75,0.18),transparent_70%)] blur-2xl"
        />
        <motion.div
          animate={{ x: [0, -14, 0], y: [0, 12, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
          className="pointer-events-none absolute right-0 top-16 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(255,132,65,0.10),transparent_72%)] blur-3xl"
        />

        <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="inline-flex rounded-full border border-[#3b2d17] bg-[#120f0b] px-4 py-2 text-[11px] uppercase tracking-[0.26em] text-[#bf9447]"
            >
              +500 barbearias já usam
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.08 }}
              className="mt-8 max-w-4xl font-heading text-[3rem] leading-[0.93] tracking-[-0.065em] text-[#f3eadb] sm:text-[4.5rem] lg:text-[6.1rem]"
            >
              Sua barbearia pode
              <span className="block text-[#c79b4b]">parecer cheia</span>
              <span className="block">antes mesmo do cliente chegar.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.16 }}
              className="mt-6 max-w-xl text-sm leading-7 text-[#9f9688] sm:text-base"
            >
              Agenda online, confirmação automática e presença digital no mesmo sistema. Mais organização, mais percepção de valor e menos improviso no dia a dia.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.24 }}
              className="mt-8 flex flex-col items-start gap-5"
            >
              <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                <span className="text-xs text-[#5f574c] line-through sm:text-sm">De R$ 39,90</span>
                <span className="font-heading text-[2rem] tracking-[-0.05em] text-[#c79b4b] sm:text-[2.8rem]">
                  A partir de R$ 19,90/mês
                </span>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Button onClick={() => handlePlanCta('basic')} className="liquid-glass-button h-12 rounded-xl px-8 text-xs font-semibold uppercase tracking-[0.18em] text-[#f5ead3] sm:h-14 sm:px-10 sm:text-sm">
                  {isLoggedIn ? 'Acessar dashboard' : 'Quero começar agora'}
                </Button>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#746b5d] sm:text-xs">
                  Sem fidelidade • Cancele quando quiser
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.32 }}
              className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3"
            >
              {heroStats.map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.34 + index * 0.06 }}
                  whileHover={liftCard}
                  className="rounded-[22px] border border-[#251c12] bg-[linear-gradient(180deg,#14110d_0%,#0d0b08_100%)] p-4 text-left shadow-[0_20px_40px_rgba(0,0,0,0.18)]"
                >
                  <p className="font-heading text-[1.7rem] tracking-[-0.05em] text-[#f4e8d6]">{item.value}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-[#bf9447]">{item.label}</p>
                  <p className="mt-3 text-sm leading-6 text-[#958a7b]">{item.detail}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 22 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative mx-auto w-full max-w-[32rem] lg:ml-auto"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -left-4 top-12 hidden rounded-2xl border border-[#3b2d17] bg-[#15110d]/95 px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur md:block"
            >
              <p className="text-[10px] uppercase tracking-[0.26em] text-[#bf9447]">agora</p>
              <p className="mt-2 text-sm text-[#eee1ce]">2 horários preenchidos no link de agendamento</p>
            </motion.div>

            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
              className="absolute -right-3 bottom-10 hidden rounded-2xl border border-[#3a2a17] bg-[#110f0c]/95 px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur md:block"
            >
              <p className="text-[10px] uppercase tracking-[0.26em] text-[#bf9447]">percepção</p>
              <p className="mt-2 text-sm text-[#eee1ce]">cliente vê organização antes de entrar na cadeira</p>
            </motion.div>

            <ParallaxCard className="rounded-[34px] border border-[#3a2c18] bg-[linear-gradient(180deg,#17130e_0%,#0c0a08_100%)] p-6 shadow-[0_34px_120px_rgba(0,0,0,0.38)]">
              <div className="flex items-center justify-between border-b border-[#241c14] pb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#bf9447]">barbearia no controle</p>
                  <p className="mt-2 font-heading text-[2rem] tracking-[-0.05em] text-[#f6ebdd]">Hoje, 14 de 21 horários ocupados</p>
                </div>
                <div className="rounded-full border border-[#3a2d1c] bg-[#130f0b] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[#d4aa57]">
                  operação ao vivo
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-3">
                  {[
                    ['09:00', 'Corte + barba', 'confirmado', 'Marcos Silva'],
                    ['11:30', 'Corte social', 'novo cliente', 'André Costa'],
                    ['15:00', 'Barba premium', 'recorrente', 'Fábio Luz'],
                  ].map(([time, service, state, client], index) => (
                    <motion.div
                      key={`${time}-${client}`}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.45, delay: 0.2 + index * 0.08 }}
                      whileHover={{ x: 6, scale: 1.01 }}
                      className="rounded-[22px] border border-[#2d241a] bg-[#120f0b] px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-heading text-[1.45rem] text-[#f3eadb]">{time}</p>
                          <p className="mt-1 text-sm text-[#dfd4c4]">{service}</p>
                          <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-[#897d6b]">{client}</p>
                        </div>
                        <div className="rounded-full border border-[#3a2d1c] bg-[#17120d] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#cba25a]">
                          {state}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="space-y-4">
                  <motion.div
                    whileHover={{ ...liftCard, scale: 1.02 }}
                    className="rounded-[24px] border border-[#2f2418] bg-[#120f0b] p-4 transition-colors duration-200 hover:border-[#c79b4b]"
                  >
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#bf9447]">esta semana</p>
                    <p className="mt-3 font-heading text-[2.4rem] tracking-[-0.06em] text-[#f8eedf]">R$ 4.820</p>
                    <p className="mt-2 text-sm leading-6 text-[#958a7b]">Faturamento visível sem depender de caderno ou memória.</p>
                  </motion.div>
                  <motion.div
                    whileHover={{ ...liftCard, scale: 1.02 }}
                    className="rounded-[24px] border border-[#2f2418] bg-[#0f0d0a] p-4 transition-colors duration-200 hover:border-[#c79b4b]"
                  >
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#bf9447]">recuperação</p>
                    <p className="mt-3 font-heading text-[2.1rem] tracking-[-0.06em] text-[#f8eedf]">11 clientes</p>
                    <p className="mt-2 text-sm leading-6 text-[#958a7b]">voltaram depois do lembrete automático este mês.</p>
                  </motion.div>
                </div>
              </div>
            </ParallaxCard>
          </motion.div>
        </div>
      </section>

      <section className="border-y border-[#171411] bg-[#090806] py-4">
        <div className="overflow-hidden">
          <motion.div
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
            className="flex min-w-max items-center gap-4"
          >
            {[...motionStrip, ...motionStrip, ...motionStrip].map((item, index) => (
              <div key={`${item}-${index}`} className="flex items-center gap-4 px-2">
                <span className="text-[11px] uppercase tracking-[0.28em] text-[#bf9447]">{item}</span>
                <span className="text-[#463b2d]">✦</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="border-t border-[#171411] px-6 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <div className="grid gap-4">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit}
                {...revealUp}
                whileHover={liftCard}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                className="group flex items-start gap-4 rounded-[22px] border border-[#1d1813] bg-[#0f0d0a] px-5 py-5 transition-colors duration-200 hover:border-[#3a2c18]"
              >
                <motion.div whileHover={iconFloat} className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#17120c] text-[#c79b4b] shadow-[0_0_0_0_rgba(199,155,75,0)] transition-shadow duration-200 group-hover:shadow-[0_0_0_6px_rgba(199,155,75,0.08)]">
                  <Check className="h-3.5 w-3.5" />
                </motion.div>
                <p className="text-sm leading-7 text-[#d4cbbb] sm:text-[15px]">{benefit}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#171411] px-6 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="font-heading text-[2.3rem] leading-[0.98] tracking-[-0.05em] text-[#f3eadb] sm:text-[3.6rem]">
              O segredo que barbearias de sucesso <span className="text-[#c79b4b]">já usam</span>
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-8 text-[#9f9688] sm:text-base">
              O problema nunca foi falta de clientes. É falta de organização e profissionalismo. Quando sua barbearia funciona com sistema, os clientes confiam mais, voltam mais e indicam mais.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            <motion.div
              {...revealUp}
              whileHover={{ ...liftCard, rotate: -0.4 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.45 }}
              className="group rounded-[24px] border border-[#5b1f1f] bg-[#120d0d] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.16)] transition-colors duration-200 hover:border-[#8a2d2d]"
            >
              <p className="font-heading text-[1.8rem] tracking-[-0.04em] text-[#ff6c5f]">Sem o sistema</p>
              <ul className="mt-5 space-y-3">
                {comparisonLists.without.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-7 text-[#cbbdb8]">
                    <span className="text-[#ff6c5f]">✕</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              {...revealUp}
              whileHover={{ ...liftCard, rotate: 0.4 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.45, delay: 0.05 }}
              className="group rounded-[24px] border border-[#4c3a19] bg-[#11100d] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.16)] transition-colors duration-200 hover:border-[#c79b4b]"
            >
              <p className="font-heading text-[1.8rem] tracking-[-0.04em] text-[#d3aa58]">Com o sistema</p>
              <ul className="mt-5 space-y-3">
                {comparisonLists.with.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-7 text-[#d7cdc0]">
                    <span className="text-[#b7da72]">✔</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="plans" className="border-t border-[#171411] px-6 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#bf9447]">planos</p>
            <h2 className="mx-auto mt-4 max-w-3xl font-heading text-[2.5rem] leading-[0.96] tracking-[-0.05em] text-[#f3eadb] sm:text-[4rem]">
              Escolha o nível certo para a sua operação.
            </h2>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {SAAS_PLANS.map((plan) => {
              const isFeatured = plan.id === 'pro'
              const cardContent = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.26em] text-[#867d6e]">{plan.name}</p>
                      <div className="mt-4 flex items-end gap-2">
                        <span className="font-heading text-[2.3rem] tracking-[-0.05em] text-[#f3eadb]">
                          R$ {plan.price.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="pb-1 text-[11px] uppercase tracking-[0.22em] text-[#7c7366]">/{plan.period}</span>
                      </div>
                    </div>

                    {isFeatured && (
                      <motion.div whileHover={{ scale: 1.06 }} className="rounded-full border border-[#4a391d] bg-[#1a140d] px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-[#d2a24d]">
                        recomendado
                      </motion.div>
                    )}
                  </div>

                  <p className="mt-5 text-sm leading-7 text-[#9f9688]">{plan.description}</p>

                  <ul className="mt-7 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-3 text-sm leading-7 text-[#d4cbbb]">
                        <Check className="mt-1 h-4 w-4 shrink-0 text-[#c79b4b]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    className={`mt-8 h-12 w-full rounded-xl text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm ${
                      isFeatured
                        ? 'liquid-glass-button text-[#f5ead3]'
                        : 'liquid-glass-button text-[#e7ddcf]'
                    }`}
                  >
                    <span onClick={() => handlePlanCta(plan.id)}>
                      {isLoggedIn ? 'Acessar dashboard' : plan.cta}
                    </span>
                  </Button>
                </>
              )

              return (
                isFeatured ? (
                  <motion.div
                    key={plan.id}
                    {...revealUp}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.45, delay: 0.04 }}
                  >
                    <ParallaxCard className="rounded-[28px] border border-[#c79b4b] bg-[#12100c] p-7 shadow-[0_18px_70px_rgba(199,155,75,0.08)] hover:shadow-[0_30px_100px_rgba(199,155,75,0.16)]">
                      {cardContent}
                    </ParallaxCard>
                  </motion.div>
                ) : (
                  <motion.article
                    key={plan.id}
                    {...revealUp}
                    whileHover={liftCard}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.45 }}
                    className="group rounded-[28px] border border-[#1d1813] bg-[#0f0d0a] p-7 transition-colors duration-200 hover:border-[#3a2c18] hover:shadow-[0_22px_70px_rgba(0,0,0,0.22)]"
                  >
                    {cardContent}
                  </motion.article>
                )
              )
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-[#171411] bg-[#141311] px-6 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#bf9447]">oferta principal</p>
          <h2 className="font-heading text-[2.2rem] leading-[0.98] tracking-[-0.05em] text-[#f3eadb] sm:text-[3.5rem]">
            Tudo isso por apenas <span className="text-[#c79b4b]">R$ 59,90/mês</span> no plano Pro
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-8 text-[#aa9f90] sm:text-base">
            O plano mais completo para quem quer agenda, presença digital e operação no mesmo lugar, sem montar um quebra-cabeça de ferramentas.
          </p>
          <div className="mx-auto mt-8 max-w-xl">
            <ParallaxCard className="rounded-[26px] border border-[#342817] bg-[linear-gradient(180deg,#18130d_0%,#100d09_100%)] p-7 text-left shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
              <ul className="space-y-3">
                {[
                  'Acesso completo à plataforma',
                  'Site genérico no ar e agenda no mesmo fluxo',
                  'Estratégia de fidelização de clientes',
                  'Suporte prioritário',
                  'Atualizações gratuitas',
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-7 text-[#d7cdc0]">
                    <span className="text-[#b7da72]">✔</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </ParallaxCard>
          </div>
          <Button onClick={() => handlePlanCta('pro')} className="liquid-glass-button mt-8 h-12 rounded-xl px-8 text-xs font-semibold uppercase tracking-[0.18em] text-[#f5ead3] sm:h-14 sm:px-10 sm:text-sm">
            {isLoggedIn ? 'Acessar dashboard' : 'Quero os bônus agora'}
          </Button>
        </div>
      </section>

      <section className="border-t border-[#171411] px-6 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#bf9447]">comece rápido</p>
          <h2 className="font-heading text-[2.2rem] leading-[0.98] tracking-[-0.05em] text-[#f3eadb] sm:text-[3.3rem]">
            Configure em <span className="text-[#c79b4b]">4 passos simples</span>
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {setupSteps.map((step, index) => (
              <motion.div
                key={step}
                {...revealUp}
                whileHover={liftCard}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.45, delay: index * 0.05 }}
                className="group rounded-[24px] border border-[#2d2318] bg-[linear-gradient(180deg,#15110d_0%,#0f0d0a_100%)] px-5 py-7 shadow-[0_20px_50px_rgba(0,0,0,0.18)] transition-colors duration-200 hover:border-[#c79b4b]"
              >
                <motion.div whileHover={iconFloat} className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#d1aa58] text-sm font-semibold text-[#120d08] shadow-[0_0_0_0_rgba(209,170,88,0)] transition-shadow duration-200 group-hover:shadow-[0_0_0_8px_rgba(209,170,88,0.10)]">
                  {index + 1}
                </motion.div>
                <p className="mt-4 text-sm leading-7 text-[#e0d6c7]">{step}</p>
              </motion.div>
            ))}
          </div>
          <p className="mt-6 text-xs text-[#756d60]">Sem técnico. Sem complicação. Só você e seu celular.</p>
        </div>
      </section>

      <section className="border-t border-[#171411] bg-[linear-gradient(180deg,#0c0a08_0%,#120e0a_100%)] px-6 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#bf9447]">depoimentos</p>
            <h2 className="mx-auto mt-4 max-w-3xl font-heading text-[2.5rem] leading-[0.96] tracking-[-0.05em] text-[#f3eadb] sm:text-[4rem]">
              O tipo de resposta que convence mais do que promessa.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-8 text-[#a89e90] sm:text-base">
              Depoimento bom não parece slogan. Parece dono de barbearia falando o que mudou depois que a casa deixou de operar no improviso.
            </p>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {testimonials.map((item, index) => (
              <motion.article
                key={item.name}
                {...revealUp}
                whileHover={liftCard}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.45, delay: index * 0.05 }}
                className="group rounded-[28px] border border-[#2a2117] bg-[linear-gradient(180deg,#16120d_0%,#0f0d0a_100%)] p-7 shadow-[0_24px_70px_rgba(0,0,0,0.24)] transition-colors duration-200 hover:border-[#c79b4b]"
              >
                <div className="flex items-center justify-between">
                  <motion.p whileHover={{ rotate: -6, scale: 1.08 }} className="font-heading text-[2.4rem] leading-none text-[#c79b4b]">“</motion.p>
                  <motion.div whileHover={{ scale: 1.05 }} className="rounded-full border border-[#3a2c18] bg-[#17120d] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[#c79b4b]">
                    cliente real
                  </motion.div>
                </div>
                <p className="mt-4 text-[15px] leading-8 text-[#ece1d0]">
                  {item.quote}
                </p>
                <div className="mt-7 border-t border-[#2b2219] pt-5">
                  <p className="font-heading text-[1.5rem] tracking-[-0.04em] text-[#f3eadb]">{item.name}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-[#b08c4b]">{item.role}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#171411] bg-[#0a0907] px-6 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#bf9447]">resultados</p>
          <h2 className="mt-4 font-heading text-[2.3rem] leading-[0.98] tracking-[-0.05em] text-[#f3eadb] sm:text-[3.6rem]">
            Resultados reais de <span className="text-[#c79b4b]">barbearias reais</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-8 text-[#a79d8e] sm:text-base">
            Não é só estética. Quando a operação fica mais organizada, o cliente percebe, agenda com menos atrito e volta com mais frequência.
          </p>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {resultCards.map((item, index) => (
              <motion.article
                key={item.name}
                {...revealUp}
                whileHover={liftCard}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.45, delay: index * 0.05 }}
                className="group rounded-[28px] border border-[#2a2117] bg-[linear-gradient(180deg,#17120d_0%,#100d09_100%)] p-7 shadow-[0_24px_70px_rgba(0,0,0,0.24)] transition-colors duration-200 hover:border-[#c79b4b]"
              >
                <motion.div whileHover={{ scale: 1.08, rotate: 10 }} className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#3a2c18] bg-[#17120d] text-[#d5aa55] shadow-[0_0_0_6px_rgba(199,155,75,0.05)]">
                  ✂
                </motion.div>
                <p className="mt-5 font-heading text-[1.55rem] tracking-[-0.04em] text-[#f3eadb]">{item.name}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-[#b08c4b]">{item.city}</p>
                <p className="mt-5 text-[15px] leading-8 text-[#e2d7c7]">{item.result}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#171411] bg-[#0d0b08] px-6 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-3">
          {faqs.map((faq, index) => (
            <motion.article
              key={faq.question}
              {...revealUp}
              whileHover={liftCard}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.45, delay: index * 0.05 }}
              className="group rounded-[28px] border border-[#2b2117] bg-[linear-gradient(180deg,#15110d_0%,#0f0d0a_100%)] p-7 shadow-[0_22px_60px_rgba(0,0,0,0.22)] transition-colors duration-200 hover:border-[#c79b4b]"
            >
              <motion.div whileHover={{ width: 76 }} className="mb-4 h-px w-14 bg-[linear-gradient(90deg,#c79b4b,transparent)] transition-all duration-200" />
              <h3 className="font-heading text-[1.95rem] leading-[0.95] tracking-[-0.04em] text-[#f8eedf]">
                {faq.question}
              </h3>
              <p className="mt-5 text-sm leading-8 text-[#b1a797]">
                {faq.answer}
              </p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="border-t border-[#171411] bg-[radial-gradient(circle_at_top,rgba(199,155,75,0.12),transparent_32%),#090806] px-6 py-28 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#bf9447]">entrar no ar</p>
          <h2 className="mt-4 font-heading text-[2.8rem] leading-[0.92] tracking-[-0.06em] text-[#fff4e4] sm:text-[4.8rem]">
            Pare de vender no improviso.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-[#9f9688] sm:text-base">
            Uma promessa direta, um preço claro e um caminho curto para a decisão. Sem rodeio, sem fricção e sem deixar o dono adivinhar o próximo passo.
          </p>

          <div className="mx-auto mt-10 max-w-3xl">
            <ParallaxCard className="rounded-[30px] border border-[#3a2d1b] bg-[linear-gradient(180deg,#17120d_0%,#0f0d0a_100%)] px-7 py-7 text-left shadow-[0_30px_80px_rgba(0,0,0,0.3)]">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#bf9447]">por que isso converte</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <motion.div
                  whileHover={{ ...liftCard, scale: 1.02 }}
                  className="rounded-[20px] border border-[#2c2217] bg-[#120f0b] p-4 transition-colors duration-200 hover:border-[#c79b4b]"
                >
                  <p className="font-heading text-[1.7rem] text-[#fff0d8]">Preço claro</p>
                  <p className="mt-2 text-sm leading-7 text-[#a89d8d]">Sem esconder valor e sem pedir contato para descobrir quanto custa.</p>
                </motion.div>
                <motion.div
                  whileHover={{ ...liftCard, scale: 1.02 }}
                  className="rounded-[20px] border border-[#2c2217] bg-[#120f0b] p-4 transition-colors duration-200 hover:border-[#c79b4b]"
                >
                  <p className="font-heading text-[1.7rem] text-[#fff0d8]">Oferta simples</p>
                  <p className="mt-2 text-sm leading-7 text-[#a89d8d]">O dono entende rápido o que entra: agenda, site e operação no mesmo produto.</p>
                </motion.div>
                <motion.div
                  whileHover={{ ...liftCard, scale: 1.02 }}
                  className="rounded-[20px] border border-[#2c2217] bg-[#120f0b] p-4 transition-colors duration-200 hover:border-[#c79b4b]"
                >
                  <p className="font-heading text-[1.7rem] text-[#fff0d8]">Risco baixo</p>
                  <p className="mt-2 text-sm leading-7 text-[#a89d8d]">Sem fidelidade, sem contrato travado e com caminho curto para testar.</p>
                </motion.div>
              </div>
            </ParallaxCard>
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button onClick={() => handlePlanCta('pro')} className="liquid-glass-button h-12 rounded-xl px-8 text-xs font-semibold uppercase tracking-[0.18em] text-[#f5ead3] sm:h-14 sm:min-w-[250px] sm:px-10 sm:text-sm">
              {isLoggedIn ? 'Acessar dashboard' : 'Quero o plano Pro'}
            </Button>

            <Button asChild variant="ghost" className="liquid-glass-button h-12 rounded-xl px-8 text-xs font-semibold uppercase tracking-[0.18em] text-[#f1e7d8] sm:h-14 sm:min-w-[250px] sm:text-sm">
              <Link to="/entrar">
                Entrar no painel
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Index
