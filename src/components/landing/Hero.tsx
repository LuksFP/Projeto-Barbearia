import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import Clipe from './Clipe'
import { minutosDe, REGUA, REGUA_TITULOS } from './content'
import { Selo } from './Ornamentos'
import { Botao } from './pieces'
import { useLandingCta } from './useLandingCta'

const SAIDA = [0.16, 1, 0.3, 1] as const

const LINHAS = [
  { texto: 'Tesoura na mão.', destaque: '' },
  { texto: 'Agenda no ', destaque: 'automático.' },
]

const Hero = () => {
  const { isLoggedIn, irParaPlano } = useLandingCta()
  const parado = useReducedMotion()
  const palco = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: palco, offset: ['start end', 'end start'] })
  const sobeVideo = useTransform(scrollYProgress, [0, 1], parado ? [0, 0] : [26, -26])

  return (
    <section className="lp-hero" id="abertura">
      {/* marco na linha de leitura do relógio, pra página abrir cravada em 07:58 */}
      <span className="lp-hero__marco" data-minutos={minutosDe('abertura')} aria-hidden />
      <p className="lp-hero__abre">
        <span>07:58</span> A porta ainda está fechada. Já tem horário marcado.
      </p>

      <h1 className="lp-hero__titulo">
        {LINHAS.map((linha, indice) => (
          <span className="lp-hero__linha" key={linha.texto}>
            <motion.span
              initial={parado ? false : { y: '108%' }}
              animate={{ y: '0%' }}
              transition={{ duration: 1.15, delay: 0.12 + indice * 0.13, ease: SAIDA }}
            >
              {linha.texto}
              {linha.destaque && <em>{linha.destaque}</em>}
            </motion.span>
          </span>
        ))}
      </h1>

      <div className="lp-hero__corpo">
        <motion.div
          className="lp-hero__texto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.55 }}
        >
          <p className="lp-lead">
            Agenda online, página da barbearia, clube e caixa no mesmo painel. O cliente marca pelo link e você só vê o
            horário aparecer.
          </p>

          <div className="lp-hero__acoes">
            <Botao onClick={() => irParaPlano('basic')}>
              {isLoggedIn ? 'Abrir o painel' : 'Começar 2 dias grátis'}
            </Botao>
            <a href="#planos" className="lp-botao lp-botao--contorno">
              <span>Ver planos</span>
            </a>
            <Link to="/demo/pro" className="lp-link lp-link--seta">
              Ver o painel por dentro
            </Link>
          </div>

          <p className="lp-miudo">A partir de R$ 19,90 por mês · sem cartão no teste · sem fidelidade</p>
        </motion.div>

        <div className="lp-hero__palco" ref={palco}>
          <Selo />
          <motion.div style={{ y: sobeVideo }}>
            <div className="lp-video" id="video">
              <Clipe
                nome="tutorial-barberos"
                largura={1920}
                altura={1080}
                controles
                descricao="Tutorial do BarberOS em 37 segundos: agendamento pelo link, agenda, lembretes, clube e financeiro"
              />
            </div>
          </motion.div>
          <p className="lp-miudo lp-hero__nota">37 segundos · gravado no próprio BarberOS, na conta de demonstração</p>
        </div>
      </div>

      <nav className="lp-regua" aria-label="O dia nesta página">
        <p className="lp-regua__titulo">O dia de hoje</p>
        <ol>
          {REGUA.map((marco) => (
            <li key={marco.id}>
              <a href={`#${marco.id}`}>
                <span className="lp-regua__hora">{marco.hora}</span>
                <span className="lp-regua__nome">{REGUA_TITULOS[marco.id]}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </section>
  )
}

export default Hero
