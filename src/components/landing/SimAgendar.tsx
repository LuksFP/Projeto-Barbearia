import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Scissors } from 'lucide-react'
import { HORARIOS, OCUPADOS, SERVICOS, reais, somarMinutos, useDemo, type Servico } from './DemoContext'

const TROCA = { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const }

/** Celular de mentira com o fluxo de agendamento: serviço → horário → reservado. */
const SimAgendar = ({ className = '' }: { className?: string }) => {
  const { reserva, reservar } = useDemo()
  const [servico, setServico] = useState<Servico | null>(null)
  const [hora, setHora] = useState<string | null>(null)

  const passo = reserva ? 3 : servico ? 2 : 1

  const recomecar = () => {
    reservar(null)
    setServico(null)
    setHora(null)
  }

  return (
    <div className={`lp-fone ${className}`}>
      <div className="lp-fone__topo">
        <span className="lp-fone__logo">
          <Scissors aria-hidden />
        </span>
        <strong>Corvo</strong>
        <ol className="lp-fone__passos" aria-label={`Passo ${passo} de 3`}>
          {[1, 2, 3].map((n) => (
            <li key={n} data-ativo={n <= passo} />
          ))}
        </ol>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {passo === 1 && (
          <motion.div key="servico" className="lp-fone__tela" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={TROCA}>
            <p className="lp-fone__titulo">Escolha o serviço</p>
            {SERVICOS.map((item) => (
              <button key={item.id} type="button" className="lp-fone__servico" onClick={() => setServico(item)}>
                <span>
                  <strong>{item.nome}</strong>
                  <small>{item.minutos} min</small>
                </span>
                <b>{reais(item.preco)}</b>
              </button>
            ))}
          </motion.div>
        )}

        {passo === 2 && servico && (
          <motion.div key="hora" className="lp-fone__tela" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={TROCA}>
            <p className="lp-fone__titulo">Hoje, que horas?</p>
            <div className="lp-fone__horas">
              {HORARIOS.map((item) => {
                const ocupado = OCUPADOS.includes(item)
                return (
                  <button
                    key={item}
                    type="button"
                    disabled={ocupado}
                    aria-pressed={hora === item}
                    aria-label={ocupado ? `${item}, ocupado` : item}
                    onClick={() => setHora(item)}
                  >
                    {item}
                  </button>
                )
              })}
            </div>
            <p className="lp-fone__nota">
              {hora
                ? `${servico.nome}: ${hora} às ${somarMinutos(hora, servico.minutos)}`
                : 'Os riscados já têm cliente. Ninguém marca em cima.'}
            </p>
            <button type="button" className="lp-fone__confirmar" disabled={!hora} onClick={() => hora && reservar({ servico, hora })}>
              Confirmar reserva
            </button>
            <button type="button" className="lp-fone__voltar" onClick={() => { setServico(null); setHora(null) }}>
              Trocar serviço
            </button>
          </motion.div>
        )}

        {passo === 3 && reserva && (
          <motion.div key="feito" className="lp-fone__tela lp-fone__tela--feito" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={TROCA}>
            <motion.span className="lp-fone__check" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 16, delay: 0.1 }}>
              <Check aria-hidden />
            </motion.span>
            <p className="lp-fone__titulo">Reservado</p>
            <p className="lp-fone__nota">
              {reserva.servico.nome}, hoje às {reserva.hora}. O pagamento de {reais(reserva.servico.preco)} é na barbearia.
            </p>
            <a href="#equipe" className="lp-fone__confirmar">
              Ver cair na agenda ↓
            </a>
            <button type="button" className="lp-fone__voltar" onClick={recomecar}>
              Marcar outro
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SimAgendar
