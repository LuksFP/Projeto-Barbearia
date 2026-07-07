import { CalendarDays, CalendarClock, Clock, MessageCircle, Check, X, CheckCircle2, Loader2, BellRing } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTenant } from '@/contexts/TenantContext'
import { useReminders } from '@/hooks/useReminders'
import { buildReminderMessage, buildWhatsappUrl } from '@/lib/reminders'
import { toast } from '@/hooks/use-toast'
import type { Barbershop, BarbershopAppointment } from '@/types/tenant'

const STATUS = {
  pending:   { label: 'A confirmar', text: 'text-white/50', dot: 'bg-white/30' },
  confirmed: { label: 'Confirmado',  text: 'text-amber-400', dot: 'bg-amber-400' },
} as const

interface RowProps {
  apt: BarbershopAppointment
  barbershop: Barbershop
  reminded: boolean
  onRemind: () => void
  onConfirm: () => void
  onNoShow: () => void
}

const ReminderRow = ({ apt, barbershop, reminded, onRemind, onConfirm, onNoShow }: RowProps) => {
  const s = STATUS[apt.status as 'pending' | 'confirmed'] ?? STATUS.pending

  const sendWhatsapp = () => {
    if (!apt.clientPhone) {
      toast({ title: 'Cliente sem telefone', description: 'Não dá pra lembrar sem um número.', variant: 'destructive' })
      return
    }
    window.open(buildWhatsappUrl(apt.clientPhone, buildReminderMessage(apt, barbershop)), '_blank')
    onRemind()
  }

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-[#161616] border border-[#262626] hover:border-[#303030] transition-colors">
      {/* Horário */}
      <div className="w-14 shrink-0 text-center">
        <span className="font-heading text-lg text-white/80">{apt.time}</span>
      </div>
      <div className="w-px h-9 bg-white/[0.08] shrink-0" />

      {/* Cliente + serviço */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-white text-sm font-semibold font-body truncate">{apt.clientName}</p>
          {reminded && (
            <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-body shrink-0">
              <Check className="w-2.5 h-2.5" />lembrado
            </span>
          )}
        </div>
        <p className="text-white/40 text-xs font-body truncate">{apt.serviceName}{apt.barberName ? ` · ${apt.barberName}` : ''}</p>
      </div>

      {/* Status */}
      <div className={`shrink-0 flex items-center gap-1.5 text-xs font-body ${s.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={sendWhatsapp}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-body transition-colors ${
            reminded
              ? 'bg-white/5 border-[#2e2e2e] text-white/50 hover:text-white'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{reminded ? 'Lembrar de novo' : 'Lembrar'}</span>
        </button>
        {apt.status === 'pending' && (
          <button
            onClick={onConfirm}
            title="Marcar como confirmado"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 text-[#0a0a0a] hover:bg-amber-400 text-xs font-semibold font-body transition-colors"
          >
            <Check className="w-3.5 h-3.5" /><span className="hidden sm:inline">Confirmar</span>
          </button>
        )}
        <button
          onClick={onNoShow}
          title="Marcar falta / cancelar"
          className="p-1.5 rounded-lg text-white/30 hover:text-red-400 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

const Section = ({ title, icon: Icon, list, ...rest }: {
  title: string
  icon: typeof CalendarDays
  list: BarbershopAppointment[]
  barbershop: Barbershop
  reminded: string[]
  onRemind: (id: string) => void
  onConfirm: (id: string) => void
  onNoShow: (id: string) => void
}) => {
  if (list.length === 0) return null
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 px-1">
        <Icon className="w-3.5 h-3.5 text-amber-400/50" />
        <p className="text-white/30 text-xs font-semibold tracking-widest uppercase font-body">{title} · {list.length}</p>
      </div>
      <div className="space-y-2">
        {list.map(apt => (
          <ReminderRow
            key={apt.id}
            apt={apt}
            barbershop={rest.barbershop}
            reminded={rest.reminded.includes(apt.id)}
            onRemind={() => rest.onRemind(apt.id)}
            onConfirm={() => rest.onConfirm(apt.id)}
            onNoShow={() => rest.onNoShow(apt.id)}
          />
        ))}
      </div>
    </div>
  )
}

const DashboardLembretes = () => {
  const { barbershop } = useTenant()
  const {
    ready, upcoming, todayList, tomorrowList, pendingCount, remindedTodayCount,
    reminded, setStatus, markReminded,
  } = useReminders()

  if (!barbershop) return null

  const kpis = [
    { label: 'Hoje', value: todayList.length, icon: CalendarDays },
    { label: 'Amanhã', value: tomorrowList.length, icon: CalendarClock },
    { label: 'A confirmar', value: pendingCount, icon: Clock },
    { label: 'Lembrados hoje', value: `${remindedTodayCount}/${todayList.length}`, icon: BellRing },
  ]

  const confirm = (id: string) => { setStatus(id, 'confirmed'); toast({ title: 'Horário confirmado' }) }
  const noShow = (id: string) => { setStatus(id, 'cancelled'); toast({ title: 'Agendamento cancelado' }) }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <p className="text-white/30 text-sm font-body mb-1">Reduza faltas confirmando por WhatsApp</p>
        <h1 className="font-heading text-3xl tracking-wide text-white">LEMBRETES</h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <motion.div
            key={k.label}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="p-5 rounded-xl bg-[#161616] border border-[#262626]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/40 text-xs font-body">{k.label}</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/[0.15] border border-amber-500/25 flex items-center justify-center">
                <k.icon className="w-3.5 h-3.5 text-amber-400" />
              </div>
            </div>
            <p className="font-heading text-2xl text-white">{k.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Listas */}
      {!ready ? (
        <div className="flex items-center justify-center py-16 text-white/30"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : upcoming.length === 0 ? (
        <div className="text-center py-16 text-white/25 font-body text-sm">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-emerald-400/40" />
          Nenhum horário pra hoje ou amanhã. Tudo tranquilo por aqui.
        </div>
      ) : (
        <div className="space-y-6">
          <Section
            title="Hoje" icon={CalendarDays} list={todayList}
            barbershop={barbershop} reminded={reminded}
            onRemind={markReminded} onConfirm={confirm} onNoShow={noShow}
          />
          <Section
            title="Amanhã" icon={CalendarClock} list={tomorrowList}
            barbershop={barbershop} reminded={reminded}
            onRemind={markReminded} onConfirm={confirm} onNoShow={noShow}
          />
        </div>
      )}
    </div>
  )
}

export default DashboardLembretes
