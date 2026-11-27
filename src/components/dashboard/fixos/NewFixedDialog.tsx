// "Novo cliente fixo": cadastra direto, sem precisar de um horário na Agenda.
// Escolhe cliente, barbeiro, serviço, o primeiro dia, a hora (só as livres
// daquele dia), de quanto em quanto tempo e quantas vezes. Mostra as datas antes.
import { useEffect, useMemo, useState } from 'react'
import { Loader2, Repeat } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useTenant } from '@/contexts/TenantContext'
import { RECURRENCE_OPTIONS, seriesDates } from '@/lib/recurrence'
import { shortDate, weekdayOf } from '@/lib/fixedClients'
import { barberHours, buildDaySlots, busyRanges } from '@/lib/scheduling'
import { blockRanges } from '@/lib/blocks'
import { useScheduleBlocks } from '@/hooks/useScheduleBlocks'
import { formatPhoneBR } from '@/lib/phone'
import type { BarbershopAppointment } from '@/types/tenant'

export interface NewFixedInput {
  clientName: string
  clientPhone: string
  barberId: string
  barberName: string
  serviceId: string
  serviceIds: string[]
  serviceName: string
  serviceCategory?: string
  time: string
  durationMin: number
  price: number
}

interface Props {
  open: boolean
  onClose: () => void
  loadDay: (date: string) => Promise<BarbershopAppointment[]>
  onCreate: (input: NewFixedInput, dates: string[], everyDays: number) => Promise<void>
}

const iso = (d: Date) => d.toLocaleDateString('sv-SE')
const field = 'w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white font-body focus:outline-none focus:border-amber-500/60'
const label = 'text-white/55 text-xs font-body mb-1.5 block'
const chip = (on: boolean) =>
  `px-2.5 py-1.5 rounded-md text-xs font-body border ${on ? 'bg-amber-500/15 border-amber-500/50 text-amber-300' : 'border-[#2a2a2a] text-white/65 hover:text-white'}`

const NewFixedDialog = ({ open, onClose, loadDay, onCreate }: Props) => {
  const { barbershop, barbers, services, clients } = useTenant()
  const activeBarbers = barbers.filter(b => b.active)
  const { blocks, reload: reloadBlocks } = useScheduleBlocks(barbershop?.id)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [suggest, setSuggest] = useState(false)
  const [barberId, setBarberId] = useState('')
  const [serviceIds, setServiceIds] = useState<string[]>([])
  const [first, setFirst] = useState(iso(new Date()))
  const [time, setTime] = useState('')
  const [every, setEvery] = useState(7)
  const [count, setCount] = useState(8)
  const [dayApts, setDayApts] = useState<BarbershopAppointment[] | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    void reloadBlocks()
    setName(''); setPhone(''); setServiceIds([]); setTime(''); setEvery(7); setCount(8)
    setFirst(iso(new Date()))
    setBarberId(activeBarbers.length === 1 ? activeBarbers[0].id : '')
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || !first) return
    let alive = true
    setDayApts(null)
    loadDay(first).then(l => { if (alive) setDayApts(l) }).catch(() => { if (alive) setDayApts([]) })
    return () => { alive = false }
  }, [open, first]) // eslint-disable-line react-hooks/exhaustive-deps

  const barber = activeBarbers.find(b => b.id === barberId)
  const picked = services.filter(s => serviceIds.includes(s.id))
  const duration = Math.max(5, picked.reduce((a, s) => a + (s.durationMin || 0), 0) || barber?.cutDurationMin || 30)
  const price = picked.reduce((a, s) => a + s.price, 0)

  const slots = useMemo(() => {
    if (!barberId || !dayApts) return []
    const hours = barberHours(barbershop?.openTime, barbershop?.closeTime, barber)
    return buildDaySlots({
      step: Math.min(30, duration), duration, busy: [...busyRanges(dayApts, barberId, first), ...blockRanges(blocks, barberId, first)],
      open: hours.open, close: hours.close, now: new Date(), date: first,
    }).filter(s => s.available)
  }, [blocks, barberId, dayApts, duration, first, barbershop?.openTime, barbershop?.closeTime, barber])

  // Trocou barbeiro/serviço/dia e a hora escolhida não está mais livre: limpa
  useEffect(() => { if (time && dayApts && !slots.some(s => s.time === time)) setTime('') }, [slots]) // eslint-disable-line react-hooks/exhaustive-deps

  const dates = useMemo(() => (first ? [first, ...seriesDates(first, every, count - 1)] : []), [first, every, count])

  const suggestions = useMemo(() => {
    const plain = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    const q = plain(name.trim())
    if (!suggest || q.length < 2) return []
    return clients.filter(c => plain(c.name).includes(q) && c.name !== name).slice(0, 5)
  }, [suggest, name, clients])

  const ready = name.trim() && phone.replace(/\D/g, '').length >= 10 && barber && picked.length > 0 && time
  const submit = async () => {
    if (!ready || !barber) return
    setSaving(true)
    try {
      await onCreate({
        clientName: name.trim(), clientPhone: phone, barberId: barber.id, barberName: barber.name,
        serviceId: picked[0].id, serviceIds: picked.map(s => s.id), serviceName: picked.map(s => s.name).join(' + '),
        serviceCategory: picked.length > 1 ? 'Combo' : picked[0].category, time, durationMin: duration, price,
      }, dates, every)
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o && !saving) onClose() }}>
      <DialogContent className="bg-[#141414] border-[#2a2a2a] text-white max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogTitle className="font-body text-lg flex items-center gap-2"><Repeat className="w-4 h-4 text-amber-400" />Novo cliente fixo</DialogTitle>
        <DialogDescription className="text-white/60 text-sm font-body">
          Cliente que vem sempre no mesmo dia e hora. Os horários já entram confirmados na Agenda.
        </DialogDescription>

        <div className="space-y-4 mt-1">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="relative">
              <label htmlFor="fx-name" className={label}>Cliente</label>
              <input id="fx-name" className={field} value={name} autoComplete="off" placeholder="Nome"
                onChange={e => { setName(e.target.value); setSuggest(true) }} onBlur={() => setTimeout(() => setSuggest(false), 150)} />
              {suggestions.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 rounded-md border border-[#2a2a2a] bg-[#1a1a1a] overflow-hidden">
                  {suggestions.map(c => (
                    <button key={c.id} type="button" onMouseDown={e => e.preventDefault()}
                      onClick={() => { setName(c.name); setPhone(c.phone); setSuggest(false) }}
                      className="w-full text-left px-3 py-2 text-sm font-body hover:bg-white/5">
                      {c.name} <span className="text-white/40">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="fx-phone" className={label}>WhatsApp</label>
              <input id="fx-phone" className={field} inputMode="tel" value={phone} placeholder="(13) 99999-9999"
                onChange={e => setPhone(formatPhoneBR(e.target.value))} />
            </div>
          </div>

          <div>
            <span className={label}>Barbeiro</span>
            <div className="flex flex-wrap gap-1.5">
              {activeBarbers.map(b => (
                <button key={b.id} type="button" className={chip(barberId === b.id)} onClick={() => setBarberId(b.id)}>{b.name}</button>
              ))}
            </div>
          </div>

          <div>
            <span className={label}>Serviço</span>
            <div className="flex flex-wrap gap-1.5">
              {services.map(s => (
                <button key={s.id} type="button" className={chip(serviceIds.includes(s.id))}
                  onClick={() => setServiceIds(ids => ids.includes(s.id) ? ids.filter(i => i !== s.id) : [...ids, s.id])}>
                  {s.name}
                </button>
              ))}
            </div>
            {picked.length > 0 && (
              <p className="text-white/45 text-xs font-body mt-1.5">
                {duration} min · {price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <label htmlFor="fx-first" className={label}>Primeiro dia</label>
              <input id="fx-first" type="date" className={`${field} [color-scheme:dark]`} value={first} min={iso(new Date())}
                onChange={e => setFirst(e.target.value)} />
            </div>
            <p className="text-white/70 text-sm font-body pb-2">{first ? `${['sábado', 'domingo'].includes(weekdayOf(first)) ? 'Todo' : 'Toda'} ${weekdayOf(first)}` : ''}</p>
          </div>

          <div>
            <span className={label}>Hora {barber ? `(livres de ${barber.name} nesse dia)` : ''}</span>
            {!barberId ? (
              <p className="text-white/40 text-xs font-body">Escolha o barbeiro primeiro.</p>
            ) : dayApts === null ? (
              <Loader2 className="w-4 h-4 animate-spin text-white/40" />
            ) : slots.length === 0 ? (
              <p className="text-white/50 text-xs font-body">Nenhum horário livre nesse dia. Tente outra data.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {slots.map(s => (
                  <button key={s.time} type="button" className={`${chip(time === s.time)} tabular-nums`} onClick={() => setTime(s.time)}>{s.time}</button>
                ))}
              </div>
            )}
          </div>

          <div>
            <span className={label}>De quanto em quanto tempo</span>
            <div className="flex flex-wrap gap-1.5">
              {RECURRENCE_OPTIONS.map(o => (
                <button key={o.days} type="button" className={chip(every === o.days)} onClick={() => setEvery(o.days)}>{o.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="fx-count" className={label}>Quantos horários já deixar marcados</label>
            <div className="flex items-center gap-3">
              <input id="fx-count" type="range" min={2} max={12} value={count} onChange={e => setCount(Number(e.target.value))} className="flex-1 accent-amber-500" />
              <span className="text-white font-body tabular-nums w-6 text-right">{count}</span>
            </div>
            <p className="text-white/45 text-xs font-body mt-1">Quando estiver acabando, a tela avisa e você estende com um toque.</p>
          </div>

          {time && (
            <div className="rounded-md border border-[#2a2a2a] bg-[#0f0f0f] p-3">
              <p className="text-white/55 text-xs font-body mb-1">Vai marcar às {time}</p>
              <p className="text-white/85 text-sm font-body leading-relaxed">{dates.map(shortDate).join(' · ')}</p>
              <p className="text-white/40 text-xs font-body mt-1.5">Data que bater com outro horário é pulada e aparece no aviso.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} disabled={saving} className="px-3 py-2 rounded-md text-sm font-body text-white/60 hover:text-white">Cancelar</button>
          <button type="button" onClick={() => void submit()} disabled={saving || !ready}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold font-body bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-40">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}Marcar {count} horários
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default NewFixedDialog
