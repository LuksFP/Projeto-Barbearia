// "Transferir": muda dia, hora e/ou barbeiro de um horário marcado. Depois de
// salvar, oferece o aviso pro cliente no WhatsApp.
import { useEffect, useState } from 'react'
import { ArrowRightLeft, Check, Loader2, MessageCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { appointmentRepository } from '@/repositories/appointmentRepository'
import { mapAppointment } from '@/contexts/TenantContext'
import { getDemoAppointments, getDemoPlan, isDemoMode } from '@/lib/demo'
import { buildTransferNotice, transferSlots } from '@/lib/transfer'
import { waUrl } from '@/lib/whatsapp'
import { localISO } from '@/lib/month'
import type { Barbershop, BarbershopAppointment, BarbershopBarber } from '@/types/tenant'

export interface TransferTarget { date: string; time: string; barberId: string; barberName: string }

interface Props {
  apt: BarbershopAppointment | null
  shop: Barbershop
  barbers: BarbershopBarber[]
  onClose: () => void
  /** Salva. Lança erro com a mensagem pro barbeiro quando não dá. */
  onConfirm: (apt: BarbershopAppointment, to: TransferTarget) => Promise<void>
}

const longDay = (d: string) =>
  new Date(`${d}T12:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })

const field = 'w-full bg-[#161616] border border-[#2a2a2a] rounded-lg px-3 h-11 text-white text-base font-body focus:outline-none focus:border-amber-500/50'

const TransferForm = ({ apt, shop, barbers, onClose, onConfirm }: Props & { apt: BarbershopAppointment }) => {
  const today = localISO(new Date())
  const [date, setDate] = useState(apt.date < today ? today : apt.date)
  const [barberId, setBarberId] = useState(apt.barberId)
  const [time, setTime] = useState(apt.time.slice(0, 5))
  const [dayApts, setDayApts] = useState<BarbershopAppointment[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [reload, setReload] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<TransferTarget | null>(null)

  useEffect(() => {
    setDayApts(null)
    setLoadError(false)
    if (!date) return
    if (isDemoMode()) {
      const plan = getDemoPlan()
      setDayApts(plan ? getDemoAppointments(plan).filter(a => a.date === date) : [])
      return
    }
    let alive = true
    appointmentRepository.listByBarbershop(shop.id, date)
      .then(rows => { if (alive) setDayApts(rows.map(mapAppointment)) })
      .catch(() => { if (alive) setLoadError(true) })
    return () => { alive = false }
  }, [date, shop.id, reload])

  const barber = barbers.find(b => b.id === barberId)
  const choices = barbers.filter(b => b.active || b.id === apt.barberId)
  const slots = dayApts && date >= today
    ? transferSlots({ apt, appointments: dayApts, date, barberId, barber, shop: { open: shop.openTime, close: shop.closeTime } })
    : []
  const picked = slots.find(s => s.time === time && s.available)
  const unchanged = date === apt.date && time === apt.time.slice(0, 5) && barberId === apt.barberId

  const confirm = async () => {
    if (!picked || unchanged) return
    const to = { date, time, barberId, barberName: barber?.name ?? apt.barberName }
    setSaving(true)
    setError('')
    try {
      await onConfirm(apt, to)
      setDone(to)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Não deu pra transferir')
      setReload(n => n + 1)
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    const href = waUrl(apt.clientPhone, buildTransferNotice(apt.clientName, shop.name, done.date, done.time, done.barberName))
    return (
      <div className="flex flex-col items-center text-center py-2">
        <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
          <Check className="w-6 h-6 text-emerald-400" />
        </div>
        <DialogTitle className="font-heading text-2xl tracking-wide mt-3">TRANSFERIDO</DialogTitle>
        <DialogDescription className="text-white/70 text-sm font-body mt-1">
          {apt.clientName}: {longDay(done.date)} às {done.time}{done.barberName ? ` com ${done.barberName}` : ''}
        </DialogDescription>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClose}
            className="mt-6 w-full py-3.5 rounded-xl bg-[#25D366] text-[#0a0a0a] text-sm font-bold font-body flex items-center justify-center gap-2">
            <MessageCircle className="w-4 h-4" />Avisar no WhatsApp
          </a>
        ) : <p className="text-white/55 text-xs font-body mt-4">Sem telefone válido pra avisar pelo WhatsApp.</p>}
        <button type="button" onClick={onClose} className="mt-3 h-11 px-4 text-sm font-body text-white/65 hover:text-white">Fechar</button>
      </div>
    )
  }

  return (
    <>
      <DialogTitle className="font-body text-lg flex items-center gap-2"><ArrowRightLeft className="w-4 h-4 text-amber-400" />Transferir horário</DialogTitle>
      <DialogDescription className="text-white/60 text-sm font-body">
        <b className="text-white/85">{apt.clientName}</b>, marcado pra {longDay(apt.date)} às {apt.time.slice(0, 5)}{apt.barberName ? ` com ${apt.barberName}` : ''}.
      </DialogDescription>

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-white/55 text-xs font-body">Dia
            <input type="date" value={date} min={today} onChange={e => { setDate(e.target.value); setError('') }} className={`${field} mt-1.5 [color-scheme:dark]`} />
          </label>
          {choices.length > 0 && (
            <label className="block text-white/55 text-xs font-body">Barbeiro
              <select value={barberId} onChange={e => { setBarberId(e.target.value); setError('') }} className={`${field} mt-1.5`}>
                {!apt.barberId && <option value="">A definir</option>}
                {choices.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
          )}
        </div>

        <div>
          <p className="text-white/55 text-xs font-body mb-1.5">Horário</p>
          {loadError ? (
            <button type="button" onClick={() => setReload(n => n + 1)} className="text-sm font-body text-red-300 underline">Não carregou os horários. Tentar de novo</button>
          ) : !dayApts ? (
            <Loader2 className="w-5 h-5 animate-spin text-white/50" />
          ) : !slots.some(s => s.available) ? (
            <p className="text-white/65 text-sm font-body">Nenhum horário livre nesse dia pra esse barbeiro.</p>
          ) : (
            <div className="grid grid-cols-4 gap-1.5 max-h-52 overflow-y-auto pr-1">
              {slots.filter(s => s.available).map(s => (
                <button key={s.time} type="button" aria-pressed={time === s.time} onClick={() => { setTime(s.time); setError('') }}
                  className={`h-11 rounded-lg text-sm font-body tabular-nums border transition-colors ${
                    time === s.time ? 'bg-amber-500 border-amber-500 text-[#0a0a0a] font-bold' : 'border-[#2a2a2a] text-white/80 hover:border-amber-500/40'}`}>
                  {s.time}
                </button>
              ))}
            </div>
          )}
        </div>

        {apt.recurrenceId && (
          <p className="text-xs font-body text-violet-200/90 bg-violet-500/10 border border-violet-400/20 rounded-lg px-3 py-2">
            Cliente fixo: muda só este dia. Os próximos continuam no horário de sempre.
          </p>
        )}
        {error && <p role="alert" className="text-sm font-body text-red-300">{error}</p>}
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={saving} className="h-11 px-3 rounded-lg text-sm font-body text-white/60 hover:text-white">Voltar</button>
        <button type="button" onClick={() => void confirm()} disabled={saving || !picked || unchanged}
          className="h-11 flex items-center gap-2 px-5 rounded-lg text-sm font-semibold font-body bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-40">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}Transferir
        </button>
      </div>
    </>
  )
}

const TransferDialog = (props: Props) => (
  <Dialog open={!!props.apt} onOpenChange={o => { if (!o) props.onClose() }}>
    <DialogContent className="bg-[#141414] border-[#2a2a2a] text-white max-w-md max-h-[90dvh] overflow-y-auto">
      {props.apt && <TransferForm key={props.apt.id} {...props} apt={props.apt} />}
    </DialogContent>
  </Dialog>
)

export default TransferDialog
