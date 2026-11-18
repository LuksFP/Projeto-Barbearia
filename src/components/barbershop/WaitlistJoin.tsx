// "Lista de espera" no passo de data/horário do site: o cliente deixa nome,
// WhatsApp e o período; se abrir vaga nesse dia a barbearia chama.
// Em destaque quando o dia está lotado; senão é só um link discreto.
import { useState } from 'react'
import { Hourglass, Loader2, CheckCircle2 } from 'lucide-react'
import { PERIOD_LABEL, waitlistErrorMessage, waitlistRepository, type WaitPeriod } from '@/repositories/waitlistRepository'

interface Props {
  barbershopId: string
  date: string
  barberId: string | null
  barberName: string | null
  primary: string
  full: boolean
  initialName: string
  initialPhone: string
}

const PERIODS: WaitPeriod[] = ['qualquer', 'manha', 'tarde', 'noite']

const WaitlistJoin = ({ barbershopId, date, barberId, barberName, primary, full, initialName, initialPhone }: Props) => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [period, setPeriod] = useState<WaitPeriod>('qualquer')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [doneFor, setDoneFor] = useState<string | null>(null)

  const phoneOk = phone.replace(/\D/g, '').length >= 10
  const day = new Date(`${date}T12:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  if (doneFor === date) {
    return (
      <p className="mt-3 flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-white/75 text-xs font-body">
        <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: primary }} />
        Pronto! Se abrir vaga {day}, a barbearia te chama no WhatsApp.
      </p>
    )
  }

  if (!open) {
    return full ? (
      <button type="button" onClick={() => setOpen(true)}
        className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold font-body border"
        style={{ borderColor: primary + '66', color: primary, backgroundColor: primary + '10' }}>
        <Hourglass className="w-4 h-4" />Entrar na lista de espera desse dia
      </button>
    ) : (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 text-xs font-body underline underline-offset-4 text-white/45 hover:text-white/70">
        Nenhum horário serve? Entre na lista de espera
      </button>
    )
  }

  const submit = async () => {
    if (!name.trim() || !phoneOk) return
    setSending(true)
    setError('')
    try {
      await waitlistRepository.join({ barbershopId, date, clientName: name.trim(), clientPhone: phone, period, barberId })
      setDoneFor(date)
      setOpen(false)
    } catch (err: unknown) {
      setError(waitlistErrorMessage(err))
    } finally {
      setSending(false)
    }
  }

  const field = 'w-full bg-[#161616] border border-[#252525] rounded-lg px-3 py-2.5 text-white text-base sm:text-sm font-body placeholder:text-white/30 focus:outline-none focus:border-[#333]'
  return (
    <div className="mt-3 rounded-xl border border-[#252525] bg-[#121212] p-4 space-y-3">
      <p className="text-white/80 text-sm font-body">
        Lista de espera de <b className="text-white">{day}</b>{barberName ? <> com {barberName}</> : null}. Se alguém desmarcar, você é avisado.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input value={name} onChange={e => setName(e.target.value.slice(0, 80))} placeholder="Seu nome" autoComplete="name" aria-label="Seu nome" className={field} />
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="WhatsApp com DDD" inputMode="tel" autoComplete="tel" aria-label="WhatsApp com DDD" className={field} />
      </div>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Período">
        {PERIODS.map(p => (
          <button key={p} type="button" role="radio" aria-checked={period === p} onClick={() => setPeriod(p)}
            className="px-2.5 py-1 rounded-full text-xs font-body border transition-colors"
            style={period === p ? { borderColor: primary, color: primary, backgroundColor: primary + '14' } : { borderColor: '#2a2a2a', color: 'rgba(255,255,255,0.6)' }}>
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-red-300 text-xs font-body">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => void submit()} disabled={sending || !name.trim() || !phoneOk}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold font-body disabled:opacity-40"
          style={{ backgroundColor: primary, color: '#0a0a0a' }}>
          {sending && <Loader2 className="w-4 h-4 animate-spin" />}Me avisa se abrir vaga
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs font-body text-white/45 hover:text-white/70">Agora não</button>
      </div>
    </div>
  )
}

export default WaitlistJoin
