// "Folgas e bloqueios": dias em que a barbearia não abre, pausas que se repetem
// e bloqueios por data. Nada que já estava marcado é cancelado: cada bloqueio
// mostra quem está dentro dele pra equipe avisar ou transferir.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarOff, ChevronDown, Coffee, Loader2, MessageCircle, Plus, Trash2 } from 'lucide-react'
import { mapAppointment, useTenant } from '@/contexts/TenantContext'
import { useScheduleBlocks } from '@/hooks/useScheduleBlocks'
import { appointmentRepository } from '@/repositories/appointmentRepository'
import BlockDialog, { type BlockMode } from '@/components/dashboard/blocks/BlockDialog'
import { affectedBy, describeBlock, isClosedWeekday, WEEKDAY_SHORT, type ScheduleBlock } from '@/lib/blocks'
import { getDemoAppointments, getDemoPlan, isDemoMode } from '@/lib/demo'
import { localISO } from '@/lib/month'
import { waUrl } from '@/lib/whatsapp'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import type { BarbershopAppointment } from '@/types/tenant'

const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`
const heading = 'text-white/55 text-xs font-body uppercase tracking-[0.18em]'

const DashboardFolgas = () => {
  const { barbershop, barbers, isAdmin } = useTenant()
  const { blocks, loading, failed, reload, add, remove } = useScheduleBlocks(barbershop?.id)
  const [userId, setUserId] = useState<string | null>(null)
  const [apts, setApts] = useState<BarbershopAppointment[]>([])
  const [aptsFailed, setAptsFailed] = useState(false)
  const [mode, setMode] = useState<BlockMode | null>(null)
  const [armed, setArmed] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [busyDay, setBusyDay] = useState<number | null>(null)
  const today = localISO(new Date())

  useEffect(() => {
    if (!isDemoMode()) void supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null))
  }, [])

  useEffect(() => {
    if (!barbershop) return
    if (isDemoMode()) {
      const plan = getDemoPlan()
      setApts(plan ? getDemoAppointments(plan) : [])
      return
    }
    appointmentRepository.listOpenFrom(barbershop.id, today)
      .then(rows => { setApts(rows.map(mapAppointment)); setAptsFailed(false) })
      .catch(() => setAptsFailed(true))
  }, [barbershop?.id, today]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!barbershop) return null

  const active = barbers.filter(b => b.active)
  const mine = active.filter(b => !!userId && b.userId === userId)
  const manageable = isAdmin ? active : mine
  const canManage = (b: ScheduleBlock) => isAdmin || mine.some(m => m.id === b.barberId)
  const nameOf = (id: string | null) => id ? barbers.find(b => b.id === id)?.name ?? 'Barbeiro removido' : 'Barbearia toda'

  const closed = blocks.filter(isClosedWeekday)
  const weekly = blocks.filter(b => b.weekdays && !isClosedWeekday(b))
  const dated = blocks.filter(b => !b.weekdays && (b.dateTo ?? '') >= today)
    .sort((a, b) => (a.dateFrom ?? '').localeCompare(b.dateFrom ?? ''))

  const fail = (title: string) => toast({ title, description: 'Confira a internet e tente de novo.', variant: 'destructive' })

  const toggleDay = async (day: number) => {
    const current = closed.filter(b => b.weekdays?.[0] === day)
    setBusyDay(day)
    try {
      if (current.length) {
        for (const b of current) await remove(b.id)
      } else {
        await add({ barbershopId: barbershop.id, barberId: null, weekdays: [day], dateFrom: null, dateTo: null, startTime: null, endTime: null, reason: '' })
      }
    } catch {
      fail('Não deu pra mudar o dia')
    } finally {
      setBusyDay(null)
    }
  }

  const handleRemove = async (id: string) => {
    if (armed !== id) { setArmed(id); return }
    setArmed(null)
    try { await remove(id) } catch { fail('Não deu pra remover') }
  }

  // Quem já estava marcado dentro de um bloqueio
  const affectedList = (id: string, list: BarbershopAppointment[]) => {
    if (list.length === 0) return null
    const open = openId === id
    return (
      <div className="mt-2">
        <button type="button" onClick={() => setOpenId(open ? null : id)} aria-expanded={open}
          className="flex items-center gap-1.5 min-h-9 text-left text-orange-300 text-xs font-body font-semibold">
          <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
          {list.length} {list.length === 1 ? 'horário já marcado aqui' : 'horários já marcados aqui'}: avise ou transfira
        </button>
        {open && (
          <ul className="mt-1 border-l border-orange-400/30 pl-3 space-y-1">
            {list.map(a => {
              const wa = waUrl(a.clientPhone, `Oi, ${a.clientName.split(' ')[0]}! Aqui é da ${barbershop.name}. Preciso mudar seu horário do dia ${ddmm(a.date)} às ${a.time.slice(0, 5)}. Qual outro dia ou horário fica bom pra você?`)
              return (
                <li key={a.id} className="flex items-center gap-2 text-sm font-body text-white/75">
                  <span className="tabular-nums text-white/55">{ddmm(a.date)} {a.time.slice(0, 5)}</span>
                  <span className="truncate flex-1">{a.clientName}{a.barberName ? ` · ${a.barberName}` : ''}</span>
                  {wa && (
                    <a href={wa} target="_blank" rel="noopener noreferrer" aria-label={`Avisar ${a.clientName} no WhatsApp`}
                      className="w-9 h-9 grid place-items-center rounded-lg text-white/55 hover:text-emerald-300"><MessageCircle className="w-4 h-4" /></a>
                  )}
                </li>
              )
            })}
            <li><Link to="/dashboard/agenda" className="inline-block py-1.5 text-xs font-body text-white/60 underline underline-offset-2 hover:text-amber-300">Transferir pela Agenda</Link></li>
          </ul>
        )}
      </div>
    )
  }

  const row = (b: ScheduleBlock) => (
    <li key={b.id} className="py-3 border-b border-[#232323]">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-white text-sm font-body font-semibold tabular-nums">{describeBlock(b)}</p>
          <p className="text-white/55 text-xs font-body mt-0.5">{nameOf(b.barberId)}{b.reason ? ` · ${b.reason}` : ''}</p>
          {affectedList(b.id, affectedBy(b, apts, today))}
        </div>
        {canManage(b) && (
          <button type="button" onClick={() => void handleRemove(b.id)} onBlur={() => setArmed(null)}
            aria-label={armed === b.id ? 'Confirmar remoção' : `Remover bloqueio ${describeBlock(b)}`}
            className={`shrink-0 h-9 min-w-9 px-2 flex items-center justify-center gap-1.5 rounded-lg text-xs font-body border ${armed === b.id ? 'border-red-500/50 bg-red-500/10 text-red-300' : 'border-transparent text-white/45 hover:text-red-300'}`}>
            <Trash2 className="w-4 h-4" />{armed === b.id && 'Toque de novo'}
          </button>
        )}
      </div>
    </li>
  )

  const addButton = (m: BlockMode, text: string) => manageable.length > 0 || isAdmin ? (
    <button type="button" onClick={() => setMode(m)}
      className="flex items-center gap-1.5 h-10 px-3.5 rounded-lg bg-amber-500 text-black text-sm font-semibold font-body hover:bg-amber-400">
      <Plus className="w-4 h-4" />{text}
    </button>
  ) : null

  const empty = (text: string) => <p className="py-4 text-white/50 text-sm font-body border-b border-[#232323]">{text}</p>

  return (
    <div className="space-y-9 max-w-3xl">
      <div>
        <p className="text-white/55 text-sm font-body mb-1">Quando o cliente não pode marcar</p>
        <h1 className="font-heading text-3xl tracking-wide text-white">FOLGAS E BLOQUEIOS</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-white/40" /></div>
      ) : failed ? (
        <button type="button" onClick={() => void reload()} className="text-sm font-body text-red-300 underline">Não carregou os bloqueios. Tentar de novo</button>
      ) : (
        <>
          {aptsFailed && <p role="alert" className="text-sm font-body text-orange-300">Não deu pra conferir quem já está marcado. Olhe a Agenda antes de bloquear.</p>}
          {!isAdmin && (
            <p className="text-sm font-body text-white/60">
              {mine.length ? 'Você bloqueia a sua própria agenda. Dias de funcionamento são com o dono ou admin.' : 'Seu login não está ligado a um barbeiro da equipe. Peça pro dono ou admin criar o bloqueio.'}
            </p>
          )}

          <section aria-labelledby="dias-h">
            <h2 id="dias-h" className={heading}>Dias de funcionamento</h2>
            <p className="text-white/50 text-sm font-body mt-1.5">{isAdmin ? 'Toque no dia pra abrir ou fechar a barbearia toda semana.' : 'Os dias riscados são os que a barbearia não abre.'}</p>
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mt-3">
              {WEEKDAY_SHORT.map((name, d) => {
                const isClosed = closed.some(b => b.weekdays?.[0] === d)
                return (
                  <button key={name} type="button" disabled={!isAdmin || busyDay !== null} aria-pressed={isClosed}
                    aria-label={`${name}: ${isClosed ? 'fechado' : 'aberto'}`} onClick={() => void toggleDay(d)}
                    className={`h-16 rounded-lg border font-body flex flex-col items-center justify-center gap-1 transition-colors disabled:cursor-default ${isClosed ? 'border-red-500/35 bg-red-500/10 text-red-300' : 'border-[#2a2a2a] bg-[#161616] text-white/85 enabled:hover:border-white/30'}`}>
                    <span className={`text-sm font-semibold ${isClosed ? 'line-through' : ''}`}>{name}</span>
                    <span className="text-[9px] sm:text-[10px] opacity-75">{busyDay === d ? '…' : isClosed ? 'Fechado' : 'Aberto'}</span>
                  </button>
                )
              })}
            </div>
            {closed.map(b => <div key={b.id}>{affectedList(b.id, affectedBy(b, apts, today))}</div>)}
          </section>

          <section aria-labelledby="pausas-h">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="pausas-h" className={`${heading} flex items-center gap-2`}><Coffee className="w-3.5 h-3.5" />Pausas que se repetem</h2>
              {addButton('weekly', 'Nova pausa')}
            </div>
            {weekly.length ? <ul className="mt-2">{weekly.map(row)}</ul> : empty('Nenhuma pausa. Cadastre o almoço pra ninguém marcar em cima dele.')}
          </section>

          <section aria-labelledby="datas-h">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="datas-h" className={`${heading} flex items-center gap-2`}><CalendarOff className="w-3.5 h-3.5" />Datas bloqueadas</h2>
              {addButton('dates', 'Bloquear datas')}
            </div>
            {dated.length ? <ul className="mt-2">{dated.map(row)}</ul> : empty('Nada bloqueado de hoje em diante. Use pra feriado, férias ou uma consulta.')}
          </section>
        </>
      )}

      <BlockDialog mode={mode} barbershopId={barbershop.id} today={today} barbers={manageable} wholeShop={isAdmin}
        onClose={() => setMode(null)} onSave={add} />
    </div>
  )
}

export default DashboardFolgas
