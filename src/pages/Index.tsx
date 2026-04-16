import { ArrowRight, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SAAS_PLANS } from '@/types/saas'

const proofStrip = [
  'Configuracao inicial rapida',
  'Sem contrato anual',
  'Plano pronto para crescer com a casa',
]

const benefits = [
  'Agenda online para parar de perder horario e cliente',
  'Site pronto para colocar no ar sem projeto separado',
  'Painel para equipe, clientes e operacao no mesmo lugar',
]

const testimonials = [
  {
    quote: 'A gente saiu do caderno em dois dias. So isso ja limpou a recepcao e reduziu falta.',
    name: 'Rafael Moura',
    role: 'Barbearia Corvo',
  },
  {
    quote: 'Antes eu perdia cliente no direct. Hoje mando um link e o cara entende na hora como agendar.',
    name: 'Joao Faria',
    role: 'Casa Faria',
  },
  {
    quote: 'O que mais pesou foi parecer profissional sem contratar site, designer e sistema separado.',
    name: 'Mateus Prado',
    role: 'Clube 27',
  },
]

const faqs = [
  {
    question: 'Preciso contratar site por fora?',
    answer: 'Nao. A propria plataforma ja entrega a pagina publica junto da agenda e da operacao interna.',
  },
  {
    question: 'Quanto tempo leva para comecar?',
    answer: 'A proposta e justamente reduzir atrito: cadastro, pagamento e configuracao inicial no mesmo fluxo.',
  },
  {
    question: 'Qual plano faz mais sentido para a maioria?',
    answer: 'O Pro tende a encaixar melhor porque junta agenda, site e operacao completa sem precisar de estrutura paralela.',
  },
]

const Index = () => {
  return (
    <div className="min-h-screen bg-[#0b0a08] text-[#efe6d7]">
      <section className="relative px-6 pb-28 pt-40 sm:px-8 sm:pb-36 lg:px-12 lg:pt-44">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(198,151,67,0.08),transparent_26%)]" />

        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="rounded-full border border-[#3b2d17] bg-[#120f0b] px-4 py-2 text-[11px] uppercase tracking-[0.26em] text-[#bf9447]"
          >
            +500 barbearias ja usam
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08 }}
            className="mt-10 max-w-3xl font-heading text-[3rem] leading-[0.95] tracking-[-0.06em] text-[#f3eadb] sm:text-[4.4rem] lg:text-[5.5rem]"
          >
            Sua barbearia ainda vive
            <span className="block text-[#c79b4b]">de caderno e WhatsApp?</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.16 }}
            className="mt-6 max-w-2xl text-sm leading-7 text-[#9f9688] sm:text-base"
          >
            Organize sua agenda, pare de perder clientes e faca sua barbearia faturar mais com um sistema profissional que cabe no bolso.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.24 }}
            className="mt-8 flex flex-col items-center"
          >
            <div className="flex items-end gap-3">
              <span className="text-xs text-[#5f574c] line-through sm:text-sm">De R$ 39,90</span>
              <span className="font-heading text-[2rem] tracking-[-0.05em] text-[#c79b4b] sm:text-[2.8rem]">
                A partir de R$ 19,90/mes
              </span>
            </div>

            <Button asChild className="liquid-glass-button mt-5 h-12 rounded-xl px-8 text-xs font-semibold uppercase tracking-[0.18em] text-[#f5ead3] sm:h-14 sm:px-10 sm:text-sm">
              <Link to="/registrar?plano=basic">
                Quero comecar agora
              </Link>
            </Button>

            <p className="mt-3 text-[11px] text-[#746b5d] sm:text-xs">
              Sem fidelidade • Cancele quando quiser
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.32 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.22em] text-[#756d60]"
          >
            {proofStrip.map((item) => (
              <span key={item}>{item}</span>
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
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                className="flex items-start gap-4 rounded-[22px] border border-[#1d1813] bg-[#0f0d0a] px-5 py-5"
              >
                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#17120c] text-[#c79b4b]">
                  <Check className="h-3.5 w-3.5" />
                </div>
                <p className="text-sm leading-7 text-[#d4cbbb] sm:text-[15px]">{benefit}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="plans" className="border-t border-[#171411] px-6 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#bf9447]">planos</p>
            <h2 className="mx-auto mt-4 max-w-3xl font-heading text-[2.5rem] leading-[0.96] tracking-[-0.05em] text-[#f3eadb] sm:text-[4rem]">
              Escolha o nivel certo para a sua operacao.
            </h2>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {SAAS_PLANS.map((plan) => {
              const isFeatured = plan.id === 'pro'

              return (
                <motion.article
                  key={plan.id}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.45 }}
                  className={`rounded-[28px] border p-7 ${
                    isFeatured
                      ? 'border-[#c79b4b] bg-[#12100c] shadow-[0_18px_70px_rgba(199,155,75,0.08)]'
                      : 'border-[#1d1813] bg-[#0f0d0a]'
                  }`}
                >
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
                      <div className="rounded-full border border-[#4a391d] bg-[#1a140d] px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] text-[#d2a24d]">
                        recomendado
                      </div>
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

      <section className="border-t border-[#171411] px-6 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#bf9447]">depoimentos</p>
            <h2 className="mx-auto mt-4 max-w-3xl font-heading text-[2.5rem] leading-[0.96] tracking-[-0.05em] text-[#f3eadb] sm:text-[4rem]">
              O tipo de resposta que convence mais do que promessa.
            </h2>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {testimonials.map((item, index) => (
              <motion.article
                key={item.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.45, delay: index * 0.05 }}
                className="rounded-[24px] border border-[#1d1813] bg-[#0f0d0a] p-6"
              >
                <p className="font-heading text-[1.8rem] leading-none text-[#c79b4b]">“</p>
                <p className="mt-3 text-sm leading-8 text-[#d5cbbb]">
                  {item.quote}
                </p>
                <div className="mt-6 border-t border-[#1b1712] pt-4">
                  <p className="font-heading text-[1.45rem] tracking-[-0.04em] text-[#f3eadb]">{item.name}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-[#7f7668]">{item.role}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#171411] px-6 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-3">
          {faqs.map((faq, index) => (
            <motion.article
              key={faq.question}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.45, delay: index * 0.05 }}
              className="rounded-[24px] border border-[#1d1813] bg-[#0f0d0a] p-6"
            >
              <h3 className="font-heading text-[1.8rem] leading-[0.98] tracking-[-0.04em] text-[#f3eadb]">
                {faq.question}
              </h3>
              <p className="mt-4 text-sm leading-7 text-[#9f9688]">
                {faq.answer}
              </p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="border-t border-[#171411] px-6 py-24 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-[11px] uppercase tracking-[0.3em] text-[#bf9447]">entrar no ar</p>
          <h2 className="mt-4 font-heading text-[2.5rem] leading-[0.96] tracking-[-0.05em] text-[#f3eadb] sm:text-[4rem]">
            Pare de vender no improviso.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-[#9f9688] sm:text-base">
            Se a ideia e ficar mais perto da referencia, esse e o centro da pagina: uma promessa direta, um preco claro e um caminho simples para cadastro.
          </p>

          <div className="mx-auto mt-8 max-w-2xl rounded-[24px] border border-[#1d1813] bg-[#0f0d0a] px-6 py-5 text-left">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#bf9447]">por que isso converte</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="font-heading text-[1.6rem] text-[#f3eadb]">Preco claro</p>
                <p className="mt-1 text-sm leading-7 text-[#938a7c]">Sem esconder valor e sem pedir contato para descobrir quanto custa.</p>
              </div>
              <div>
                <p className="font-heading text-[1.6rem] text-[#f3eadb]">Oferta simples</p>
                <p className="mt-1 text-sm leading-7 text-[#938a7c]">O dono entende rapido o que entra: agenda, site e operacao no mesmo produto.</p>
              </div>
              <div>
                <p className="font-heading text-[1.6rem] text-[#f3eadb]">Risco baixo</p>
                <p className="mt-1 text-sm leading-7 text-[#938a7c]">Sem fidelidade, sem contrato travado e com caminho curto para testar.</p>
              </div>
            </div>
          </div>

          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild className="liquid-glass-button h-12 rounded-xl px-8 text-xs font-semibold uppercase tracking-[0.18em] text-[#f5ead3] sm:h-14 sm:px-10 sm:text-sm">
              <Link to="/registrar?plano=pro">
                Quero o plano Pro
              </Link>
            </Button>

            <Button asChild variant="ghost" className="liquid-glass-button h-12 rounded-xl px-8 text-xs font-semibold uppercase tracking-[0.18em] text-[#f1e7d8] sm:h-14 sm:text-sm">
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
