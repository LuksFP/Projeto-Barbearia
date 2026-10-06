import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { formatarHora, minutosDe, rotuloDe } from './content'

// O relógio da página: a rolagem é o dia passando.
// Cada capítulo tem um marco [data-minutos]; a hora atual é interpolada entre os dois
// marcos que cercam a linha de leitura (42% da altura da tela).

const DiaContext = createContext<MotionValue<number> | null>(null)

const useMinutos = (): MotionValue<number> => {
  const minutos = useContext(DiaContext)
  if (!minutos) throw new Error('useMinutos precisa estar dentro de <DiaProvider>')
  return minutos
}

export const DiaProvider = ({ children }: { children: ReactNode }) => {
  const minutos = useMotionValue(minutosDe('abertura'))

  useEffect(() => {
    let frame = 0

    const medir = () => {
      frame = 0
      const marcos = Array.from(document.querySelectorAll<HTMLElement>('[data-minutos]'))
      if (marcos.length === 0) return

      const linha = window.innerHeight * 0.42
      const pontos = marcos.map((el) => ({
        y: el.getBoundingClientRect().top,
        m: Number(el.dataset.minutos),
      }))

      if (linha <= pontos[0].y) {
        minutos.set(pontos[0].m)
        return
      }
      for (let i = 0; i < pontos.length - 1; i += 1) {
        const a = pontos[i]
        const b = pontos[i + 1]
        if (linha < b.y) {
          const t = (linha - a.y) / Math.max(b.y - a.y, 1)
          minutos.set(a.m + t * (b.m - a.m))
          return
        }
      }
      minutos.set(pontos[pontos.length - 1].m)
    }

    const agendar = () => {
      if (!frame) frame = requestAnimationFrame(medir)
    }

    medir()
    window.addEventListener('scroll', agendar, { passive: true })
    window.addEventListener('resize', agendar)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', agendar)
      window.removeEventListener('resize', agendar)
    }
  }, [minutos])

  return <DiaContext.Provider value={minutos}>{children}</DiaContext.Provider>
}

/** Hora corrente + em que parte do dia a página está. Só re-renderiza quando o minuto muda. */
export const Relogio = () => {
  const minutos = useMinutos()
  const [hora, setHora] = useState(() => formatarHora(minutos.get()))
  const [rotulo, setRotulo] = useState(() => rotuloDe(minutos.get()))

  useMotionValueEvent(minutos, 'change', (valor) => {
    setHora(formatarHora(valor))
    setRotulo(rotuloDe(valor))
  })

  return (
    <p className="lp-relogio" aria-label={`Na história desta página são ${hora}, ${rotulo}`}>
      <span className="lp-relogio__ponto" aria-hidden />
      <span className="lp-relogio__hora">{hora}</span>
      <span className="lp-relogio__rotulo">{rotulo}</span>
    </p>
  )
}

/** A luz da vitrine: âmbar de manhã, clara à tarde, vermelha no poente, azul-petróleo à noite. */
export const LuzDoDia = () => {
  const minutos = useMinutos()
  const manha = useTransform(minutos, [478, 660, 840, 1800, 1918], [1, 0.6, 0, 0, 1])
  const tarde = useTransform(minutos, [600, 840, 1040, 1180], [0, 1, 0.35, 0])
  const poente = useTransform(minutos, [960, 1090, 1230, 1330], [0, 1, 0.3, 0])
  const noite = useTransform(minutos, [1190, 1427, 1780, 1918], [0, 1, 1, 0])

  return (
    <div className="lp-luz" aria-hidden>
      <motion.div className="lp-luz__camada lp-luz__camada--manha" style={{ opacity: manha }} />
      <motion.div className="lp-luz__camada lp-luz__camada--tarde" style={{ opacity: tarde }} />
      <motion.div className="lp-luz__camada lp-luz__camada--poente" style={{ opacity: poente }} />
      <motion.div className="lp-luz__camada lp-luz__camada--noite" style={{ opacity: noite }} />
      <div className="lp-azulejo" />
      <div className="lp-grao" />
    </div>
  )
}

/** Poste de barbeiro: as listras sobem conforme a página rola. Lateral no desktop, fio no topo no celular. */
export const Poste = () => {
  const { scrollY } = useScroll()
  const parado = useReducedMotion()
  const posicao = useTransform(scrollY, (valor) => (parado ? '0px' : `${-valor * 0.45}px`))

  return (
    <div className="lp-poste" aria-hidden>
      <motion.div className="lp-poste__listras" style={{ backgroundPositionY: posicao, backgroundPositionX: posicao }} />
    </div>
  )
}
