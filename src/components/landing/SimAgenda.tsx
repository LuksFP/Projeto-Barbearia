import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BellRing } from 'lucide-react'
import { somarMinutos, useDemo } from './DemoContext'

interface Linha {
  hora: string
  fim: string
  cliente: string
  servico: string
  novo?: boolean
}

const FIXOS: Linha[] = [
  { hora: '14:00', fim: '14:30', cliente: 'Igor Menezes', servico: 'Combo Atlas' },
  { hora: '16:30', fim: '17:00', cliente: 'Paulo Serra', servico: 'Corte Executivo' },
]

/** Agenda do painel em miniatura: o horário marcado no celular do capítulo anterior cai aqui. */
const SimAgenda = ({ className = '' }: { className?: string }) => {
  const { reserva } = useDemo()
  const [confirmado, setConfirmado] = useState(false)

  useEffect(() => setConfirmado(false), [reserva])

  const linhas: Linha[] = reserva
    ? [
        ...FIXOS,
        {
          hora: reserva.hora,
          fim: somarMinutos(reserva.hora, reserva.servico.minutos),
          cliente: 'Você',
          servico: reserva.servico.nome,
          novo: true,
        },
      ].sort((a, b) => a.hora.localeCompare(b.hora))
    : FIXOS

  return (
    <div className={`lp-sim ${className}`}>
      <header className="lp-sim__topo">
        <strong>Agenda · hoje</strong>
        <span className="lp-sim__vivo">ao vivo</span>
      </header>

      <AnimatePresence>
        {reserva && (
          <motion.p
            key={`${reserva.hora}-${reserva.servico.id}`}
            className="lp-sim__aviso"
            role="status"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <BellRing aria-hidden /> Novo agendamento pelo site
          </motion.p>
        )}
      </AnimatePresence>

      <ul className="lp-sim__lista">
        <AnimatePresence initial={false}>
          {linhas.map((linha) => (
            <motion.li
              key={linha.novo ? 'novo' : linha.hora}
              layout
              className={linha.novo ? 'lp-sim__linha lp-sim__linha--nova' : 'lp-sim__linha'}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: 'spring', stiffness: 220, damping: 24 }}
            >
              <time>
                {linha.hora}
                <small>{linha.fim}</small>
              </time>
              <span>
                <strong>{linha.cliente}</strong>
                <small>{linha.servico}</small>
              </span>
              {linha.novo && !confirmado ? (
                <button type="button" onClick={() => setConfirmado(true)}>
                  Confirmar
                </button>
              ) : (
                <em>confirmado</em>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {!reserva && (
        <p className="lp-sim__dica">
          Marque um horário no celular do capítulo anterior e ele cai aqui. <a href="#link">Voltar pro celular ↑</a>
        </p>
      )}
    </div>
  )
}

export default SimAgenda
