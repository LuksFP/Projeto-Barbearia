// /b/:slug/horario/:token — "meu horário": o cliente vê, cancela, remarca e,
// depois de atendido, avalia. Sem login: o link é a chave.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { CalendarClock, Check, Loader2, MessageCircle, Star, X } from 'lucide-react'
import type { PublicSiteOutletCtx } from '@/layouts/PublicSiteLayout'
import { manageRepository, type ManagedAppointment } from '@/repositories/manageRepository'
import { barberHours, buildDaySlots, type BusyRange } from '@/lib/scheduling'
import { lockMessage } from '@/lib/extras'
import { errorText } from '@/lib/errors'
import { localISO } from '@/lib/month'
import { waLink } from '@/lib/whatsapp'

const longDay = (d: string) => new Date(`${d}T12:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
const ghost = 'h-12 px-4 rounded-xl border border-[#2a2a2a] text-white/75 text-sm font-semibold font-body hover:border-white/25 disabled:opacity-40'

/** Mensagens do banco que ajudam o cliente; o resto vira uma frase só. */
const friendly = (err: unknown) => {
  const msg = errorText(err)
  if (/bloqueado na agenda|acabou de ser reservado|cliente fixo|appointments_no_overlap|23P01/i.test(msg)) return 'Esse horário não está mais livre. Escolha outro.'
  const known = msg.match(/(Esse horário não pode mais[^"]*|Esse horário já foi remarcado[^"]*|Horário fora do expediente|Escolha um horário dentro do prazo[^"]*)/)
  return known ? known[1] : 'Não deu certo agora. Confira a internet e tente de novo.'
}

const ManageAppointmentPage = () => {
  const { barbershop, barbers } = useOutletContext<PublicSiteOutletCtx>()
  const { token = '' } = useParams()
  const [apt, setApt] = useState<ManagedAppointment | null | undefined>(undefined)
  const [loadFailed, setLoadFailed] = useState(false)
  const [view, setView] = useState<'home' | 'move' | 'cancel'>('home')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [busy, setBusy] = useState<BusyRange[] | null>(null)
  const [busyNonce, setBusyNonce] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const primary = barbershop.primaryColor
  const today = localISO(new Date())

  const load = useCallback(async () => {
    try {
      setApt(await manageRepository.get(barbershop.id, token))
      setLoadFailed(false)
    } catch {
      setLoadFailed(true)
    }
  }, [barbershop.id, token])
  useEffect(() => { void load() }, [load])

  useEffect(() => {
    setBusy(null)
    setTime('')
    if (view !== 'move' || !date || !apt) return
    let alive = true
    manageRepository.busy(barbershop.id, apt, date)
      .then(r => { if (alive) setBusy(r) })
      .catch(() => { if (alive) setError('Não carregou os horários desse dia.') })
    return () => { alive = false }
  }, [view, date, busyNonce, apt?.date, apt?.time]) // eslint-disable-line react-hooks/exhaustive-deps

  const slots = useMemo(() => {
    if (!apt || !date || !busy) return []
    const barber = barbers.find(b => b.id === apt.barberId)
    const hours = barberHours(barbershop.openTime, barbershop.closeTime, barber)
    // o prazo mínimo vale também pro horário novo
    const now = new Date(Date.now() + (apt.minHours ?? 0) * 3_600_000)
    const earliest = localISO(now)
    if (date < earliest) return []
    return buildDaySlots({ step: Math.min(30, apt.durationMin), duration: apt.durationMin, busy, open: hours.open, close: hours.close, now, date })
      .filter(s => s.available && !(date === apt.date && s.time === apt.time))
  }, [apt, date, busy, barbers, barbershop.openTime, barbershop.closeTime])

  const run = async (action: () => Promise<void>, done: string) => {
    setSaving(true)
    setError('')
    try {
      await action()
      await load()
      setView('home')
      setNotice(done)
    } catch (err: unknown) {
      setError(friendly(err))
      setBusyNonce(n => n + 1)
      void load()
    } finally {
      setSaving(false)
    }
  }

  const shell = (children: React.ReactNode) => (
    <section className="min-h-[70vh] px-4 pt-28 pb-20">
      <div className="max-w-md mx-auto">{children}</div>
    </section>
  )

  if (loadFailed && !apt) {
    return shell(<div className="text-center"><p className="text-white/70 font-body mb-4">Não deu pra abrir seu horário agora.</p>
      <button type="button" onClick={() => void load()} className={ghost}>Tentar de novo</button></div>)
  }
  if (apt === undefined) return shell(<Loader2 className="w-6 h-6 animate-spin text-white/50 mx-auto" />)
  if (apt === null) {
    return shell(<div className="text-center">
      <p className="text-white text-lg font-body mb-2">Não achei esse horário.</p>
      <p className="text-white/55 text-sm font-body mb-6">Confira se o link está completo, ou fale com a barbearia.</p>
      <Link to={`/b/${barbershop.slug}#agendar`} className="underline underline-offset-4 text-sm font-body" style={{ color: primary }}>Agendar um horário</Link>
    </div>)
  }

  const cancelled = apt.status === 'cancelled'
  const canChange = apt.lockReason === null
  const title = cancelled ? 'HORÁRIO CANCELADO' : apt.status === 'done' ? 'ATENDIMENTO FEITO' : apt.status === 'no_show' ? 'HORÁRIO ENCERRADO' : 'SEU HORÁRIO'
  const talk = barbershop.whatsapp ? waLink(barbershop.whatsapp, `Oi! É ${apt.clientName}, sobre meu horário de ${longDay(apt.date)} às ${apt.time}.`) : null

  return shell(
    <>
      <p className="text-xs tracking-[0.3em] font-semibold font-body mb-2" style={{ color: primary }}>OLÁ, {apt.clientName.toUpperCase()}</p>
      <h1 className="font-heading text-4xl text-white tracking-wide mb-6">{title}</h1>

      <div className={`border-l-2 pl-4 py-1 mb-6 ${cancelled ? 'opacity-50' : ''}`} style={{ borderColor: primary }}>
        <p className={`font-heading text-5xl text-white tabular-nums leading-none ${cancelled ? 'line-through' : ''}`}>{apt.time}</p>
        <p className="text-white/85 font-body mt-2 first-letter:uppercase">{longDay(apt.date)}</p>
        <p className="text-white/55 text-sm font-body mt-1">{apt.serviceName}{apt.barberName && apt.barberName !== 'A definir' ? ` · com ${apt.barberName}` : ''}</p>
      </div>

      {notice && <p role="status" className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-emerald-300 text-sm font-body"><Check className="w-4 h-4 shrink-0" />{notice}</p>}
      {error && <p role="alert" className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-red-300 text-sm font-body">{error}</p>}

      {view === 'home' && canChange && (
        <div className="grid grid-cols-2 gap-3">
          <button type="button" disabled={apt.reschedulesLeft <= 0} onClick={() => { setView('move'); setDate(apt.date < today ? today : apt.date); setNotice(''); setError('') }}
            className="h-12 rounded-xl text-sm font-bold font-body flex items-center justify-center gap-2 disabled:opacity-40" style={{ backgroundColor: primary, color: '#0a0a0a' }}>
            <CalendarClock className="w-4 h-4" />Remarcar
          </button>
          <button type="button" onClick={() => { setView('cancel'); setNotice(''); setError('') }} className={`${ghost} flex items-center justify-center gap-2`}>
            <X className="w-4 h-4" />Cancelar
          </button>
          <p className="col-span-2 text-white/40 text-xs font-body">
            {apt.reschedulesLeft <= 0 ? 'Esse horário já foi remarcado 3 vezes. ' : ''}
            {apt.minHours ? `Dá pra mudar até ${apt.minHours} ${apt.minHours === 1 ? 'hora' : 'horas'} antes.` : 'Dá pra mudar até a hora marcada.'}
          </p>
        </div>
      )}

      {view === 'home' && apt.lockReason && apt.lockReason !== 'encerrado' && apt.lockReason !== 'passou' && (
        <p className="text-white/65 text-sm font-body mb-4">{lockMessage(apt.lockReason, apt.minHours)}</p>
      )}

      {view === 'cancel' && (
        <div>
          <p className="text-white/80 font-body mb-4">Cancelar mesmo? O horário fica livre pra outra pessoa.</p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setView('home')} disabled={saving} className={ghost}>Manter</button>
            <button type="button" disabled={saving} onClick={() => void run(() => manageRepository.cancel(barbershop.id, token), 'Cancelado. A barbearia já vê na agenda.')}
              className="h-12 rounded-xl bg-red-500 text-white text-sm font-bold font-body flex items-center justify-center gap-2 disabled:opacity-50">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}Sim, cancelar
            </button>
          </div>
        </div>
      )}

      {view === 'move' && (
        <div>
          <label className="block text-white/55 text-xs font-body mb-4">Novo dia
            <input type="date" min={today} value={date} onChange={e => { setDate(e.target.value); setError('') }}
              className="mt-1.5 w-full bg-[#161616] border border-[#252525] rounded-xl px-4 h-12 text-white text-base font-body [color-scheme:dark]" />
          </label>
          {!busy ? (date && <Loader2 className="w-5 h-5 animate-spin text-white/50" />) : slots.length === 0 ? (
            <p className="text-white/65 text-sm font-body">Nenhum horário livre nesse dia. Tente outra data.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {slots.map(s => (
                <button key={s.time} type="button" aria-pressed={time === s.time} onClick={() => setTime(s.time)}
                  className="h-11 rounded-lg text-sm font-body tabular-nums border"
                  style={time === s.time ? { backgroundColor: primary, color: '#0a0a0a', borderColor: primary } : { backgroundColor: '#161616', color: 'rgba(255,255,255,0.75)', borderColor: '#252525' }}>
                  {s.time}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 mt-5">
            <button type="button" onClick={() => setView('home')} disabled={saving} className={ghost}>Voltar</button>
            <button type="button" disabled={saving || !time} onClick={() => void run(() => manageRepository.reschedule(barbershop.id, token, date, time), 'Remarcado. A barbearia já vê na agenda.')}
              className="h-12 rounded-xl text-sm font-bold font-body flex items-center justify-center gap-2 disabled:opacity-40" style={{ backgroundColor: primary, color: '#0a0a0a' }}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}Confirmar
            </button>
          </div>
        </div>
      )}

      {apt.canReview && (
        <div className="mt-8 pt-6 border-t border-[#222]">
          <p className="text-white font-body font-semibold mb-3">Como foi o atendimento?</p>
          <div className="flex gap-1" role="group" aria-label="Nota de 1 a 5">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`} aria-pressed={rating === n} onClick={() => setRating(n)} className="w-12 h-12 grid place-items-center">
                <Star className="w-8 h-8" style={n <= rating ? { fill: primary, color: primary } : { color: '#3a3a3a' }} />
              </button>
            ))}
          </div>
          <textarea value={review} maxLength={500} rows={3} onChange={e => setReview(e.target.value)} placeholder="Quer contar algo? (opcional)" aria-label="Comentário"
            className="mt-3 w-full bg-[#161616] border border-[#252525] rounded-xl px-4 py-3 text-white text-base font-body" />
          <p className="text-white/40 text-xs font-body mt-1">Aparece no site com seu primeiro nome e a inicial do sobrenome.</p>
          <button type="button" disabled={!rating || saving} onClick={() => void run(() => manageRepository.review(barbershop.id, token, rating, review), 'Avaliação enviada. Valeu!')}
            className="mt-3 w-full h-12 rounded-xl text-sm font-bold font-body disabled:opacity-40" style={{ backgroundColor: primary, color: '#0a0a0a' }}>Enviar avaliação</button>
        </div>
      )}
      {apt.rating && !apt.canReview && <p className="mt-6 text-white/55 text-sm font-body">Sua nota: {apt.rating} de 5.</p>}

      <div className="mt-8 flex flex-col gap-3">
        {talk && view === 'home' && (
          <a href={talk} target="_blank" rel="noopener noreferrer" className={`${ghost} flex items-center justify-center gap-2`}><MessageCircle className="w-4 h-4" />Falar com a barbearia</a>
        )}
        {(cancelled || apt.status === 'done') && (
          <Link to={`/b/${barbershop.slug}#agendar`} className="text-center text-sm font-body underline underline-offset-4" style={{ color: primary }}>Agendar de novo</Link>
        )}
      </div>
    </>,
  )
}

export default ManageAppointmentPage
