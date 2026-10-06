import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { SAAS_PLANS, type SaasPlan } from '@/types/saas'
import { Filete, Icone, Toldo, type Ferramenta } from './Ornamentos'
import { Botao } from './pieces'
import { useLandingCta } from './useLandingCta'

const preco = (valor: number) => valor.toFixed(2).replace('.', ',')

type Equipe = 'ate2' | 'mais'
type Site = 'agenda' | 'pagina' | 'proprio'

const FERRAMENTA: Record<SaasPlan, Ferramenta> = { basic: 'pente', pro: 'tesoura', premium: 'navalha' }

const EQUIPES: { id: Equipe; rotulo: string }[] = [
  { id: 'ate2', rotulo: '1 ou 2' },
  { id: 'mais', rotulo: '3 ou mais' },
]

const SITES: { id: Site; rotulo: string }[] = [
  { id: 'agenda', rotulo: 'Só a agenda' },
  { id: 'pagina', rotulo: 'Página pronta' },
  { id: 'proprio', rotulo: 'Design e domínio meus' },
]

// Segue os limites da própria lista de planos: Básico vai até 2 barbeiros e não tem site;
// domínio e design próprios só no Premium.
const planoPara = (equipe: Equipe, site: Site): SaasPlan => {
  if (site === 'proprio') return 'premium'
  if (site === 'pagina' || equipe === 'mais') return 'pro'
  return 'basic'
}

/** Planos como a tabela de preços da parede da barbearia: papel, tinta e carimbo — sem cartões. */
const PriceBoard = () => {
  const { isLoggedIn, irParaPlano } = useLandingCta()
  const parado = useReducedMotion()
  const [equipe, setEquipe] = useState<Equipe | null>(null)
  const [site, setSite] = useState<Site | null>(null)

  const respondeu = equipe !== null || site !== null
  const indicado: SaasPlan = respondeu ? planoPara(equipe ?? 'ate2', site ?? 'agenda') : 'pro'

  return (
    <section className="lp-planos" id="planos">
      <Toldo />
      <motion.div
        className="lp-folha"
        initial={parado ? false : { rotate: -2.4, y: 60, opacity: 0 }}
        whileInView={{ rotate: -0.6, y: 0, opacity: 1 }}
        viewport={{ once: true, margin: '-15% 0px' }}
        transition={{ type: 'spring', stiffness: 60, damping: 16 }}
      >
        <header className="lp-folha__topo">
          <div>
            <p className="lp-folha__sobre">BarberOS · cobrança mensal</p>
            <h2 className="lp-folha__titulo">
              Tabela <em>de preços</em>
            </h2>
            <p className="lp-folha__nota">2 dias grátis pra testar, sem cartão. Sem fidelidade.</p>
          </div>

          <div className="lp-escolha">
            <p className="lp-escolha__titulo">Qual é o seu? Responda duas.</p>
            <fieldset>
              <legend>Quantos barbeiros na casa?</legend>
              {EQUIPES.map((item) => (
                <button key={item.id} type="button" aria-pressed={equipe === item.id} onClick={() => setEquipe(item.id)}>
                  {item.rotulo}
                </button>
              ))}
            </fieldset>
            <fieldset>
              <legend>E o site da barbearia?</legend>
              {SITES.map((item) => (
                <button key={item.id} type="button" aria-pressed={site === item.id} onClick={() => setSite(item.id)}>
                  {item.rotulo}
                </button>
              ))}
            </fieldset>
          </div>
        </header>

        <div className="lp-folha__filete">
          <Filete tipo="tesoura" />
        </div>

        <div className="lp-folha__colunas">
          {SAAS_PLANS.map((plano) => {
            const escolhido = plano.id === indicado
            return (
              <article key={plano.id} className="lp-plano" data-escolhido={escolhido} data-apagado={respondeu && !escolhido}>
                {escolhido && (
                  <motion.p
                    layoutId="lp-carimbo"
                    className="lp-plano__carimbo"
                    initial={false}
                    style={{ rotate: 7 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    aria-live="polite"
                  >
                    {respondeu ? 'esse é o seu' : 'a gente indica'}
                  </motion.p>
                )}
                <h3 className="lp-plano__nome">
                  <Icone tipo={FERRAMENTA[plano.id]} />
                  {plano.name}
                </h3>
                <p className="lp-plano__preco">
                  <span className="lp-plano__moeda">R$</span>
                  {preco(plano.price)}
                  <span className="lp-plano__periodo">/{plano.period}</span>
                </p>
                <p className="lp-plano__desc">{plano.description}</p>

                <ul className="lp-plano__itens">
                  {plano.features.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>

                <Botao tom="tinta" onClick={() => irParaPlano(plano.id)} className={escolhido ? '' : 'lp-botao--vazado'}>
                  {isLoggedIn ? 'Abrir o painel' : plano.cta}
                </Botao>
              </article>
            )
          })}
        </div>
      </motion.div>
    </section>
  )
}

export default PriceBoard
