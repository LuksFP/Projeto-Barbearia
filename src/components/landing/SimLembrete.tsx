import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'

interface Cliente {
  id: string
  hora: string
  nome: string
  servico: string
  barbeiro: string
}

const CLIENTES: Cliente[] = [
  { id: 'rafael', hora: '09:00', nome: 'Rafael Dias', servico: 'Corte Executivo', barbeiro: 'Diego' },
  { id: 'bruno', hora: '10:30', nome: 'Bruno Costa', servico: 'Barba Premium', barbeiro: 'Caio' },
  { id: 'igor', hora: '14:00', nome: 'Igor Menezes', servico: 'Combo Atlas', barbeiro: 'Diego' },
  { id: 'paulo', hora: '16:30', nome: 'Paulo Serra', servico: 'Corte Executivo', barbeiro: 'Caio' },
]

type Etapa = 'enviado' | 'respondido'

const mensagem = (cliente: Cliente) =>
  `Fala, ${cliente.nome.split(' ')[0]}! Passando pra lembrar do seu horário hoje às ${cliente.hora} na Atlas Barber Shop (${cliente.servico} com o ${cliente.barbeiro}). Confirma pra mim?`

/** Lista de lembretes que dá pra tocar: o "WhatsApp" ao lado mostra a mensagem saindo e a resposta. */
const SimLembrete = () => {
  const [etapas, setEtapas] = useState<Record<string, Etapa>>({})
  const [aberto, setAberto] = useState<Cliente | null>(null)
  const esperas = useRef<number[]>([])

  useEffect(() => {
    const pendentes = esperas.current
    return () => pendentes.forEach((id) => window.clearTimeout(id))
  }, [])

  const lembrar = (cliente: Cliente) => {
    setAberto(cliente)
    if (etapas[cliente.id]) return
    setEtapas((antes) => ({ ...antes, [cliente.id]: 'enviado' }))
    esperas.current.push(
      window.setTimeout(() => setEtapas((antes) => ({ ...antes, [cliente.id]: 'respondido' })), 1900),
    )
  }

  const lembrados = Object.keys(etapas).length
  const etapaAberta = aberto ? etapas[aberto.id] : undefined

  return (
    <div className="lp-lembrar">
      <div className="lp-sim">
        <header className="lp-sim__topo">
          <strong>Lembretes · hoje</strong>
          <span>
            lembrados {lembrados}/{CLIENTES.length}
          </span>
        </header>
        <ul className="lp-sim__lista">
          {CLIENTES.map((cliente) => {
            const etapa = etapas[cliente.id]
            return (
              <li key={cliente.id} className="lp-sim__linha" data-aberto={aberto?.id === cliente.id}>
                <time>{cliente.hora}</time>
                <span>
                  <strong>{cliente.nome}</strong>
                  <small>
                    {cliente.servico} · {cliente.barbeiro}
                  </small>
                </span>
                {etapa === 'respondido' ? (
                  <em>confirmado</em>
                ) : (
                  <button type="button" onClick={() => lembrar(cliente)} disabled={etapa === 'enviado'}>
                    <MessageCircle aria-hidden /> {etapa === 'enviado' ? 'Enviado' : 'Lembrar'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      <div className="lp-zap" aria-live="polite">
        <header>
          <span className="lp-zap__avatar" aria-hidden>
            {aberto ? aberto.nome[0] : '?'}
          </span>
          <strong>{aberto ? aberto.nome : 'WhatsApp'}</strong>
        </header>
        <div className="lp-zap__conversa">
          <AnimatePresence mode="popLayout">
            {!aberto && (
              <motion.p key="vazio" className="lp-zap__vazio" exit={{ opacity: 0 }}>
                Toque em <b>Lembrar</b> num cliente da lista. A mensagem abre aqui, escrita.
              </motion.p>
            )}
            {aberto && (
              <motion.p
                key={`${aberto.id}-ida`}
                className="lp-zap__balao lp-zap__balao--ida"
                initial={{ opacity: 0, y: 14, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              >
                {mensagem(aberto)}
              </motion.p>
            )}
            {aberto && etapaAberta === 'enviado' && (
              <motion.p key={`${aberto.id}-digitando`} className="lp-zap__digitando" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <i /> <i /> <i />
              </motion.p>
            )}
            {aberto && etapaAberta === 'respondido' && (
              <motion.p
                key={`${aberto.id}-volta`}
                className="lp-zap__balao lp-zap__balao--volta"
                initial={{ opacity: 0, y: 14, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              >
                Confirmado, tô aí.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default SimLembrete
