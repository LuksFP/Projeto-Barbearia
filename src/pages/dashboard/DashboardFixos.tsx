// Clientes fixos: quem vem sempre no mesmo dia e hora. Lista por dia da semana,
// avisa quando a série está acabando, estende, para e cadastra direto
// (antes só dava pelo "Repetir" dentro de um horário da Agenda).
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Repeat, MessageCircle, Loader2, CalendarPlus, ChevronDown, Lock } from 'lucide-react'
import { useTenant, mapAppointment } from '@/contexts/TenantContext'
import { appointmentRepository, type SeriesResult } from '@/repositories/appointmentRepository'
import { isDemoMode, getDemoPlan, getDemoAppointments } from '@/lib/demo'
import { addDemoBooking, updateDemoBooking, onDemoBookingsChange } from '@/lib/demoBookings'
import { useAppointmentsLive } from '@/hooks/useAppointmentsLive'
import { groupSeries, shortDate, weekdayOf, nextOnRhythm, type FixedSeries } from '@/lib/fixedClients'
import { recurrenceLabel, seriesDates } from '@/lib/recurrence'
import { busyRanges, isTimeAvailable } from '@/lib/scheduling'
import { waUrl } from '@/lib/whatsapp'
import { toast } from '@/hooks/use-toast'
import { blockRanges } from '@/lib/blocks'
import { useScheduleBlocks } from '@/hooks/useScheduleBlocks'
import NewFixedDialog, { type NewFixedInput } from '@/components/dashboard/fixos/NewFixedDialog'
import type { BarbershopAppointment } from '@/types/tenant'

const EXTEND_BY = 4
const DAY_ORDER = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo']
const iso = (d: Date) => d.toLocaleDateString('sv-SE')
const ddmm = (d: string) => new Date(`${d}T12:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
const btn = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-body font-semibold border transition-colors'

const skippedText = (r: SeriesResult) =>
  r.skipped.length ? `Pulados: ${r.skipped.map(x => `${ddmm(x.date)} (${x.reason})`).join(', ')}` : undefined

const DashboardFixos = () => {
  const { barbershop, barbers, refreshClients } = useTenant()
  const { blocks } = useScheduleBlocks(barbershop?.id)
  const [apts, setApts] = useState<BarbershopAppointment[] | null>(null)
  const [reservedIds, setReservedIds] = useState<Set<string> | undefined>(undefined)
  const [filterBarber, setFilterBarber] = useState('all')
  const [newOpen, setNewOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [armedStop, setArmedStop] = useState<string | null>(null)
  const [showEnded, setShowEnded] = useState(false)
  const today = iso(new Date())
  const tomorrow = iso(new Date(Date.now() + 86_400_000))

  const load = useCallback(async () => {
    if (!barbershop) return
    if (isDemoMode()) {
      const plan = getDemoPlan()
      setApts(plan ? getDemoAppointments(plan).filter(a => a.recurrenceId) : [])
      return
    }
    try {
      const from = iso(new Date(Date.now() - 120 * 86_400_000))
      const [rows, ids] = await Promise.all([
        appointmentRepository.listRecurring(barbershop.id, from),
        // Sem a tabela de reservas (migração não aplicada): cai no "tem horário pra frente"
        appointmentRepository.activeFixedSlotIds(barbershop.id).catch(() => undefined),
      ])
      setReservedIds(ids)
      setApts(rows.map(mapAppointment))
    } catch {
      setApts(prev => prev ?? [])
      toast({ title: 'Erro ao carregar os clientes fixos', variant: 'destructive' })
    }
  }, [barbershop])

  useEffect(() => {
    void load()
    if (isDemoMode()) return onDemoBookingsChange(() => void load())
  }, [load])
  useAppointmentsLive(barbershop?.id, () => void load())

  useEffect(() => {
    if (!armedStop) return
    const t = setTimeout(() => setArmedStop(null), 4000)
    return () => clearTimeout(t)
  }, [armedStop])

  const series = useMemo(() => groupSeries(apts ?? [], today, reservedIds), [apts, today, reservedIds])
  const visible = series.filter(s => filterBarber === 'all' || s.barberId === filterBarber)
  const active = visible.filter(s => s.reserved)
  const ended = visible.filter(s => !s.reserved)

  // Por dia da semana do próximo horário, e na hora dentro do dia
  const byDay = useMemo(() => {
    const m = new Map<string, FixedSeries[]>()
    for (const s of active) {
      const d = weekdayOf(nextOnRhythm(s, today))
      m.set(d, [...(m.get(d) ?? []), s])
    }
    return DAY_ORDER.filter(d => m.has(d)).map(d => ({ day: d, list: m.get(d)!.sort((a, b) => a.time.localeCompare(b.time)) }))
  }, [active, today])

  // Dia inteiro (pra lista de horas livres do formulário)
  const loadDay = async (date: string): Promise<BarbershopAppointment[]> => {
    if (!barbershop) return []
    if (isDemoMode()) {
      const plan = getDemoPlan()
      return plan ? getDemoAppointments(plan).filter(a => a.date === date) : []
    }
    return (await appointmentRepository.listByBarbershop(barbershop.id, date)).map(mapAppointment)
  }

  // Demo: cria no localStorage pulando o que bate com outro horário
  const demoInsert = (base: Omit<BarbershopAppointment, 'id' | 'date' | 'status'>, dates: string[]): SeriesResult => {
    const plan = getDemoPlan()
    const all = plan ? getDemoAppointments(plan) : []
    const res: SeriesResult = { created: [], skipped: [] }
    dates.forEach((date, i) => {
      if (!isTimeAvailable(base.time, base.durationMin, blockRanges(blocks, base.barberId, date))) {
        res.skipped.push({ date, reason: 'agenda bloqueada' })
        return
      }
      if (!isTimeAvailable(base.time, base.durationMin, busyRanges(all, base.barberId, date))) {
        res.skipped.push({ date, reason: 'horário ocupado' })
        return
      }
      addDemoBooking({ ...base, id: `${base.recurrenceId}-${Date.now()}-${i}`, date, status: 'confirmed' })
      res.created.push({} as SeriesResult['created'][number])
    })
    return res
  }

  const handleCreate = async (input: NewFixedInput, dates: string[], everyDays: number) => {
    if (!barbershop) return
    try {
      let res: SeriesResult
      if (isDemoMode()) {
        res = demoInsert({
          barbershopId: barbershop.id, clientName: input.clientName, clientPhone: input.clientPhone,
          barberId: input.barberId, barberName: input.barberName, serviceId: input.serviceId,
          serviceName: input.serviceName, serviceCategory: input.serviceCategory, time: input.time,
          durationMin: input.durationMin, price: input.price, recurrenceId: `demo-rec-${Date.now()}`, recurrenceEveryDays: everyDays,
        }, dates)
      } else {
        res = await appointmentRepository.createFixed({
          barbershop_id: barbershop.id, client_name: input.clientName, client_phone: input.clientPhone,
          service_id: input.serviceId, service_ids: input.serviceIds, service_name: input.serviceName,
          service_category: input.serviceCategory ?? null, barber_id: input.barberId, barber_name: input.barberName,
          time: input.time, duration_min: input.durationMin, price: input.price,
        }, dates, everyDays)
      }
      if (res.created.length === 0) {
        toast({ title: 'Nenhum horário marcado', description: skippedText(res), variant: 'destructive' })
        return
      }
      toast({ title: `${input.clientName} virou cliente fixo`, description: skippedText(res) ?? `${res.created.length} horários marcados na Agenda.` })
      setNewOpen(false)
      await load()
      if (!isDemoMode()) void refreshClients()
    } catch {
      toast({ title: 'Não deu pra cadastrar', variant: 'destructive' })
    }
  }

  const handleExtend = async (s: FixedSeries) => {
    const dates = seriesDates(s.lastDate, s.everyDays, EXTEND_BY, tomorrow)
    setBusyId(s.id)
    try {
      let res: SeriesResult
      if (isDemoMode()) {
        const ref = s.upcoming[0] ?? (apts ?? []).filter(a => a.recurrenceId === s.id).sort((a, b) => b.date.localeCompare(a.date))[0]
        const { id: _id, date: _d, status: _st, remindedAt: _r, reviewRequestedAt: _rv, ...base } = ref
        res = demoInsert(base, dates)
      } else {
        res = await appointmentRepository.extendSeries(s.id, dates)
      }
      toast({
        title: res.created.length ? `+${res.created.length} horários pra ${s.clientName}` : 'Nenhum horário marcado',
        description: skippedText(res) ?? `Agora vai até ${ddmm(dates[dates.length - 1])}.`,
        variant: res.created.length ? undefined : 'destructive',
      })
      await load()
    } catch {
      toast({ title: 'Não deu pra estender', variant: 'destructive' })
    } finally {
      setBusyId(null)
    }
  }

  const handleStop = async (s: FixedSeries) => {
    if (armedStop !== s.id) { setArmedStop(s.id); return }
    setArmedStop(null)
    setBusyId(s.id)
    try {
      let n = 0
      if (isDemoMode()) {
        const future = s.upcoming.filter(a => a.date > today)
        future.forEach(a => updateDemoBooking(a.barbershopId, a.id, { status: 'cancelled' }))
        n = future.length
      } else {
        n = await appointmentRepository.stopSeries(s.id, today)
      }
      const keepsToday = s.upcoming.some(a => a.date === today)
      toast({ title: `${s.clientName} não é mais fixo`, description: `O horário voltou a ficar livre no site. ${n} ${n === 1 ? 'horário cancelado' : 'horários cancelados'}${keepsToday ? ', o de hoje continua marcado.' : '.'}` })
      await load()
    } catch {
      toast({ title: 'Não deu pra parar', description: 'Algum horário pra frente pode estar pago online: cancele esse pela Agenda ("Estornar").', variant: 'destructive' })
    } finally {
      setBusyId(null)
    }
  }

  const row = (s: FixedSeries) => {
    const next = s.upcoming[0]
    const left = s.upcoming.length
    const wa = waUrl(s.clientPhone)
    return (
      <div key={s.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 p-4 rounded-xl bg-[#161616] border border-[#262626]`}>
        <span className="font-heading text-2xl text-white/85 tabular-nums w-16 shrink-0">{s.time}</span>
        <div className="min-w-0 flex-1 basis-48">
          <p className="text-white font-body font-semibold truncate">{s.clientName}</p>
          <p className="text-white/50 text-xs font-body truncate">{s.serviceName} · {s.barberName} · {recurrenceLabel(s.everyDays)}</p>
          <p className="text-xs font-body mt-1">
            {s.reserved ? (
              <>
                <span className="inline-flex items-center gap-1 text-emerald-300/90"><Lock className="w-3 h-3" />Reservado</span>
                <span className="text-white/40"> · o site não deixa outro cliente marcar esse horário</span>
                <span className="block mt-0.5">
                  {next
                    ? <><span className="text-white/70">Próximo: {shortDate(next.date)}</span><span className="text-white/40"> · {left === 1 ? 'os seguintes' : `na Agenda até ${ddmm(s.upcoming[left - 1].date)}, os seguintes`} entram sozinhos</span></>
                    : <span className="text-white/50">Os próximos entram na Agenda sozinhos</span>}
                </span>
              </>
            ) : (
              <span className="text-white/40">Parado · último em {ddmm(s.lastDate)}</span>
            )}
            {s.noShowCount > 0 && <span className="text-orange-300/80"> · faltou {s.noShowCount}x</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className={`${btn} border-[#2a2a2a] text-white/60 hover:text-emerald-300`} aria-label={`WhatsApp de ${s.clientName}`}>
              <MessageCircle className="w-3.5 h-3.5" />
            </a>
          )}
          {!s.reserved && (
            <button type="button" disabled={busyId === s.id} onClick={() => void handleExtend(s)}
              className={`${btn} border-amber-500/50 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25`}>
              {busyId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarPlus className="w-3.5 h-3.5" />}Retomar
            </button>
          )}
          {s.reserved && (
            <button type="button" disabled={busyId === s.id} onClick={() => void handleStop(s)} onBlur={() => setArmedStop(null)}
              className={`${btn} ${armedStop === s.id ? 'border-red-500/50 bg-red-500/10 text-red-300' : 'border-[#2a2a2a] text-white/45 hover:text-red-300'}`}>
              {armedStop === s.id ? 'Toque de novo: libera o horário' : 'Parar'}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-white/55 text-sm font-body mb-1">Quem vem sempre no mesmo dia e hora</p>
          <h1 className="font-heading text-3xl tracking-wide text-white">CLIENTES FIXOS</h1>
        </div>
        <button type="button" onClick={() => setNewOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 text-black text-sm font-semibold font-body hover:bg-amber-400">
          <Plus className="w-4 h-4" />Novo cliente fixo
        </button>
      </div>

      {barbers.filter(b => b.active).length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por barbeiro">
          {[{ id: 'all', name: 'Todos' }, ...barbers.filter(b => b.active)].map(b => (
            <button key={b.id} type="button" onClick={() => setFilterBarber(b.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-body border ${filterBarber === b.id ? 'bg-white text-black border-white' : 'border-[#2a2a2a] text-white/60 hover:text-white'}`}>
              {b.name}
            </button>
          ))}
        </div>
      )}

      {apts === null ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>
      ) : active.length === 0 ? (
        <div className="py-14 px-6 rounded-xl border border-dashed border-[#2a2a2a] text-center">
          <Repeat className="w-6 h-6 text-white/30 mx-auto mb-3" />
          <p className="text-white/80 font-body">Nenhum cliente fixo {filterBarber !== 'all' ? 'desse barbeiro ' : ''}ainda</p>
          <p className="text-white/45 text-sm font-body mt-1 max-w-sm mx-auto">
            Cadastre aqui quem vem toda semana ou a cada 15 dias. Também dá pelo “Repetir” de um horário na <Link to="/dashboard/agenda" className="underline underline-offset-2 hover:text-amber-300">Agenda</Link>.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {byDay.map(({ day, list }) => (
            <section key={day}>
              <h2 className="text-white/45 text-xs font-body uppercase tracking-[0.18em] mb-2">
                {day} <span className="text-white/25">· {list.length}</span>
              </h2>
              <div className="space-y-2">{list.map(row)}</div>
            </section>
          ))}
        </div>
      )}

      {ended.length > 0 && (
        <section>
          <button type="button" onClick={() => setShowEnded(v => !v)} aria-expanded={showEnded}
            className="flex items-center gap-1.5 text-white/45 hover:text-white text-xs font-body uppercase tracking-[0.18em]">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showEnded ? 'rotate-180' : ''}`} />
            Parados · {ended.length}
          </button>
          {showEnded && <div className="space-y-2 mt-2 opacity-80">{ended.map(row)}</div>}
        </section>
      )}

      <NewFixedDialog open={newOpen} onClose={() => setNewOpen(false)} loadDay={loadDay} onCreate={handleCreate} />
    </div>
  )
}

export default DashboardFixos
