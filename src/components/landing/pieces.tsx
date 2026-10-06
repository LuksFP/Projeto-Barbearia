import { useRef, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { MARCOS, paraMinutos } from './content'
import { Icone, type Ferramenta } from './Ornamentos'

const SAIDA = [0.16, 1, 0.3, 1] as const

// cada hora do dia tem a sua ferramenta
const FERRAMENTA: Record<string, Ferramenta> = {
  link: 'tesoura',
  equipe: 'pente',
  lembrete: 'navalha',
  clube: 'tesoura',
  caixa: 'pente',
  noite: 'navalha',
  amanha: 'tesoura',
}

/** Carimbo de hora que abre cada capítulo. Também é o marco que o relógio da página lê. */
export const Carimbo = ({ id, nota }: { id: string; nota?: string }) => {
  const marco = MARCOS.find((item) => item.id === id)
  if (!marco) return null

  return (
    <div className="lp-carimbo" data-minutos={paraMinutos(marco.hora, marco.diaSeguinte)}>
      <span className="lp-carimbo__hora">{marco.hora}</span>
      <motion.span
        className="lp-carimbo__fio"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: '-12% 0px' }}
        transition={{ duration: 1.1, ease: SAIDA }}
        aria-hidden
      />
      {FERRAMENTA[id] && <Icone tipo={FERRAMENTA[id]} />}
      <span className="lp-carimbo__rotulo">{nota ?? marco.rotulo}</span>
    </div>
  )
}

interface TelaProps {
  src: string
  alt: string
  largura: number
  altura: number
  className?: string
  /** De que lado a tela "abre", como uma capa sendo puxada. */
  abre?: 'esquerda' | 'direita'
  prioridade?: boolean
}

/** Print real do produto, revelado por um corte lateral em vez de fade. */
export const Tela = ({ src, alt, largura, altura, className = '', abre = 'esquerda', prioridade = false }: TelaProps) => {
  const parado = useReducedMotion()
  // Quem observa a entrada na tela é a figure: o navegador não enxerga um elemento 100% recortado.
  const figura = useRef<HTMLElement>(null)
  const visivel = useInView(figura, { once: true, margin: '-10% 0px' })
  // margens negativas no corte pra sombra da tela não ser decepada
  const aberto = 'inset(-12% -12% -28% -12%)'
  const fechado = abre === 'esquerda' ? 'inset(-12% 100% -28% -12%)' : 'inset(-12% -12% -28% 100%)'

  return (
    <figure className={`lp-tela ${className}`} ref={figura}>
      <motion.div
        initial={parado ? false : { clipPath: fechado }}
        animate={{ clipPath: visivel || parado ? aberto : fechado }}
        transition={{ duration: 1.25, ease: SAIDA }}
      >
        <img
          src={src}
          alt={alt}
          width={largura}
          height={altura}
          loading={prioridade ? 'eager' : 'lazy'}
          decoding="async"
        />
      </motion.div>
    </figure>
  )
}

/** Texto que só acende (sem deslizar): o movimento fica com a tela e com o fio do carimbo. */
export const Acende = ({ children, atraso = 0, className }: { children: ReactNode; atraso?: number; className?: string }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0 }}
    whileInView={{ opacity: 1 }}
    viewport={{ once: true, margin: '-12% 0px' }}
    transition={{ duration: 0.9, delay: atraso, ease: 'easeOut' }}
  >
    {children}
  </motion.div>
)

interface BotaoProps {
  children: ReactNode
  onClick: () => void
  tom?: 'latao' | 'tinta'
  className?: string
}

/** Botão principal: no hover, a faixa de poste de barbeiro corre na base. */
export const Botao = ({ children, onClick, tom = 'latao', className = '' }: BotaoProps) => (
  <button type="button" onClick={onClick} className={`lp-botao lp-botao--${tom} ${className}`}>
    <span>{children}</span>
    <ArrowRight className="lp-botao__seta" aria-hidden />
  </button>
)
