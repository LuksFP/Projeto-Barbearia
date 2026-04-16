import { ArrowRight, CalendarDays, Check, Crown, Globe2, MessageSquareText, Scissors, ShieldCheck, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SAAS_PLANS } from '@/types/saas'

const proofPoints = [
  { value: '+500', label: 'barbearias ja usam' },
  { value: '24h', label: 'agenda online ativa' },
  { value: '1 link', label: 'site pronto para bio' },
]

const featureCards = [
  {
    icon: Globe2,
    title: 'Site pronto para vender',
    text: 'Uma landing enxuta para a casa sair do Instagram improvisado e colocar um link serio no ar no mesmo dia.',
  },
  {
    icon: CalendarDays,
    title: 'Agenda sem bagunca',
    text: 'Recepcao, barbeiros e clientes operam em um fluxo claro, sem depender de caderno, audio ou confirmacao solta.',
  },
  {
    icon: Users,
    title: 'Equipe no lugar certo',
    text: 'Cada unidade roda isolada, com historico, servicos e permissoes sem confundir uma operacao com a outra.',
  },
]

const dashboardSignals = [
  {
    icon: Scissors,
    title: 'Cadeiras ocupadas com previsibilidade',
    text: 'O barbeiro sabe quem entra, o que vai fazer e quanto tempo o atendimento exige.',
  },
  {
    icon: MessageSquareText,
    title: 'Cliente nao some depois do corte',
    text: 'Historico, retorno e ofertas ficam organizados para a casa vender mais do que um horario avulso.',
  },
  {
    icon: ShieldCheck,
    title: 'Operacao com cara de sistema',
    text: 'Tudo centralizado em painel, sem acesso cruzado entre casas e sem depender de gambiarra para funcionar.',
  },
]

const faqs = [
  {
    question: 'Preciso contratar site separado?',
    answer: 'Nao. O proprio BarberOS ja entrega a pagina publica e conecta isso com agenda, equipe e operacao.',
  },
  {
    question: 'Consigo comecar rapido?',
    answer: 'Sim. A proposta dessa landing e exatamente vender rapidez: cadastro, pagamento e casa pronta para entrar no ar.',
  },
  {
    question: 'Se eu crescer, preciso trocar de sistema?',
    answer: 'Nao. Os planos escalam junto com a operacao, saindo do essencial ate dominio proprio e onboarding dedicado.',
  },
]

const Index = () => {
  return (
    <div className="relative overflow-hidden bg-[#0c0a08] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(204,158,72,0.14),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_24%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />

      <section className="relative flex min-h-screen items-center px-6 pb-20 pt-32 sm:px-8 lg:px-12">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-[#7b6336] bg-[#17120d] px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-[#d8b46a]"
          >
            <span className="h-2 w-2 rounded-full bg-[#d8b46a]" />
            +500 barbearias ja usam
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08 }}
            className="mt-8 max-w-5xl font-heading text-[3.3rem] leading-[0.92] tracking-[-0.06em] text-[#f1e7d3] sm:text-[4.6rem] lg:text-[6.8rem]"
          >
            Sua barbearia ainda vive
            <span className="block text-[#cfa14c]">de caderno e WhatsApp?</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16 }}
            className="mt-8 max-w-3xl text-base leading-8 text-[#b5ada0] sm:text-xl"
          >
            Organize sua agenda, pare de perder clientes e faca sua barbearia faturar mais com um sistema profissional que cabe no bolso.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24 }}
            className="mt-10 flex flex-col items-center gap-4"
          >
            <div className="flex items-end gap-3 text-center">
              <span className="text-sm text-[#655a47] line-through sm:text-base">De R$ 39,90</span>
              <span className="font-heading text-3xl tracking-[-0.04em] text-[#d2a24d] sm:text-5xl">
                A partir de R$ 19,90/mes
              </span>
            </div>

            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <Button asChild className="h-14 rounded-2xl bg-[#c99c49] px-10 text-sm font-semibold uppercase tracking-[0.16em] text-[#120d07] hover:bg-[#ddb15e]">
                <Link to="/registrar?plano=basic">
                  Quero comecar agora
                </Link>
              </Button>

              <Button asChild variant="ghost" className="h-14 rounded-2xl border border-[#2d2418] bg-[#15110d] px-8 text-sm uppercase tracking-[0.16em] text-[#d8cfbf] hover:bg-[#1a1510] hover:text-white">
                <a href="#plans">
                  Ver planos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>

            <p className="text-sm text-[#7e7567]">Sem fidelidade. Cancele quando quiser.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.32 }}
            className="mt-16 grid w-full max-w-4xl gap-4 sm:grid-cols-3"
          >
            {proofPoints.map((item) => (
              <div key={item.label} className="rounded-[28px] border border-[#221a12] bg-[#110e0b]/90 px-6 py-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-sm">
                <p className="font-heading text-4xl tracking-[-0.05em] text-[#f5ead4]">{item.value}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[#8f8678]">{item.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="templates" className="relative px-6 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.34em] text-[#cfa14c]">o que entra no ar</p>
              <h2 className="mt-4 max-w-xl font-heading text-4xl leading-[0.94] tracking-[-0.05em] text-[#f1e7d3] sm:text-6xl">
                A landing vende seriedade antes de vender tecnologia.
              </h2>
            </div>
            <p className="max-w-2xl text-base leading-8 text-[#aba393] sm:text-lg">
              A referencia que voce mandou funciona porque elimina excesso. A proposta aqui segue a mesma linha: hero forte, argumento direto, prova social limpa e comparativo de planos sem ruido.
            </p>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {featureCards.map((card, index) => (
              <motion.article
                key={card.title}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="rounded-[34px] border border-[#201810] bg-[linear-gradient(180deg,#120f0b_0%,#0d0b08_100%)] p-7 shadow-[0_24px_90px_rgba(0,0,0,0.32)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1c160f] text-[#d2a24d]">
                  <card.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-8 font-heading text-3xl leading-none tracking-[-0.04em] text-[#f5ead4]">{card.title}</h3>
                <p className="mt-4 text-base leading-7 text-[#9e9588]">{card.text}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section id="dashboard" className="relative border-y border-[#19130d] bg-[#0b0907] px-6 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.34em] text-[#cfa14c]">operacao diaria</p>
              <h2 className="mt-4 font-heading text-4xl leading-[0.94] tracking-[-0.05em] text-[#f1e7d3] sm:text-6xl">
                O painel entra depois do clique, mas segura toda a casa.
              </h2>
              <p className="mt-6 max-w-xl text-base leading-8 text-[#aba393] sm:text-lg">
                Agenda, equipe, clientes, site publico e recorrencia vivem no mesmo produto. O dono da barbearia compra a landing pela clareza, mas fica pela operacao organizada.
              </p>
            </div>

            <div className="rounded-[36px] border border-[#221a12] bg-[radial-gradient(circle_at_top,rgba(207,161,76,0.12),transparent_34%),#12100c] p-8">
              <div className="flex items-center justify-between border-b border-[#2a2016] pb-5">
                <div>
                  <p className="text-sm uppercase tracking-[0.22em] text-[#8f8678]">workspace</p>
                  <p className="mt-1 font-heading text-3xl text-[#f5ead4]">BarberOS</p>
                </div>
                <div className="rounded-full border border-[#3b2f1f] bg-[#17120d] px-4 py-2 text-xs uppercase tracking-[0.22em] text-[#d2a24d]">
                  isolado por casa
                </div>
              </div>

              <div className="mt-6 space-y-5">
                {dashboardSignals.map((signal) => (
                  <div key={signal.title} className="flex gap-4 rounded-[24px] border border-[#211910] bg-[#0f0c09] p-5">
                    <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1a140e] text-[#d2a24d]">
                      <signal.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-heading text-2xl tracking-[-0.04em] text-[#f3e6cf]">{signal.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-[#9d9588]">{signal.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="plans" className="relative px-6 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-5 text-center">
            <p className="text-xs uppercase tracking-[0.34em] text-[#cfa14c]">planos</p>
            <h2 className="mx-auto max-w-4xl font-heading text-4xl leading-[0.94] tracking-[-0.05em] text-[#f1e7d3] sm:text-6xl">
              Mesma atmosfera da referencia. Seus planos, sem enrolacao.
            </h2>
            <p className="mx-auto max-w-2xl text-base leading-8 text-[#aba393] sm:text-lg">
              Cada plano foi mantido com a estrutura real do produto. O que mudou aqui foi a forma de apresentar: menos ruido, mais contraste e decisao mais rapida.
            </p>
          </div>

          <div className="mt-14 grid gap-6 xl:grid-cols-3">
            {SAAS_PLANS.map((plan, index) => {
              const featured = plan.id === 'pro'

              return (
                <motion.article
                  key={plan.id}
                  initial={{ opacity: 0, y: 26 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  className={`rounded-[36px] border p-8 ${
                    featured
                      ? 'border-[#cfa14c] bg-[linear-gradient(180deg,#1a140d_0%,#100d09_100%)] shadow-[0_32px_120px_rgba(207,161,76,0.14)]'
                      : 'border-[#211910] bg-[linear-gradient(180deg,#120f0b_0%,#0d0b08_100%)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-[#9a917f]">{plan.description}</p>
                      <h3 className="mt-4 font-heading text-4xl tracking-[-0.05em] text-[#f5ead4]">{plan.name}</h3>
                    </div>
                    {featured && (
                      <div className="rounded-full border border-[#d7ad61] bg-[#d7ad61]/12 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#e5bf78]">
                        mais popular
                      </div>
                    )}
                  </div>

                  <div className="mt-10 flex items-end gap-3">
                    <span className="font-heading text-5xl tracking-[-0.05em] text-[#d2a24d]">
                      R$ {plan.price.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="pb-2 text-sm uppercase tracking-[0.24em] text-[#8f8678]">/{plan.period}</span>
                  </div>

                  <ul className="mt-10 space-y-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-3 text-sm leading-7 text-[#c4bcaf]">
                        <Check className="mt-1 h-4 w-4 shrink-0 text-[#d2a24d]" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button asChild className={`mt-10 h-14 w-full rounded-2xl text-sm font-semibold uppercase tracking-[0.16em] ${
                    featured
                      ? 'bg-[#c99c49] text-[#120d07] hover:bg-[#ddb15e]'
                      : 'bg-[#17120d] text-[#f0e4cf] hover:bg-[#211910]'
                  }`}>
                    <Link to={`/registrar?plano=${plan.id}`}>
                      {plan.cta}
                    </Link>
                  </Button>
                </motion.article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="relative border-y border-[#19130d] bg-[#0b0907] px-6 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-[#cfa14c]">perguntas diretas</p>
            <h2 className="mt-4 font-heading text-4xl leading-[0.94] tracking-[-0.05em] text-[#f1e7d3] sm:text-6xl">
              O que o dono quer saber antes de pagar.
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-[28px] border border-[#201810] bg-[#110e0b] p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1a140e] text-[#d2a24d]">
                    <Crown className="h-4 w-4" />
                  </div>
                  <h3 className="font-heading text-2xl tracking-[-0.04em] text-[#f4e7d1]">{faq.question}</h3>
                </div>
                <p className="mt-4 text-sm leading-7 text-[#9e9588]">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-6 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl rounded-[40px] border border-[#2a2016] bg-[radial-gradient(circle_at_top,rgba(207,161,76,0.14),transparent_36%),#120f0b] px-8 py-14 text-center sm:px-12">
          <p className="text-xs uppercase tracking-[0.34em] text-[#cfa14c]">pronto para sair do improviso</p>
          <h2 className="mt-5 font-heading text-4xl leading-[0.94] tracking-[-0.05em] text-[#f1e7d3] sm:text-6xl">
            Sua pagina de vendas pode parar de parecer remendo hoje.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[#aba393] sm:text-lg">
            A landing agora aponta para o mesmo territorio visual da referencia: elegante, escura, direta e pensada para converter barbearia real.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild className="h-14 rounded-2xl bg-[#c99c49] px-10 text-sm font-semibold uppercase tracking-[0.16em] text-[#120d07] hover:bg-[#ddb15e]">
              <Link to="/registrar?plano=pro">
                Quero lançar com o Pro
              </Link>
            </Button>
            <Button asChild variant="ghost" className="h-14 rounded-2xl border border-[#2d2418] bg-[#15110d] px-8 text-sm uppercase tracking-[0.16em] text-[#d8cfbf] hover:bg-[#1a1510] hover:text-white">
              <Link to="/entrar">
                Entrar no painel
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Index
