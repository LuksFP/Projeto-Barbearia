import { useMemo, useState } from 'react'
import { Users, Crown, Clock, MessageCircle, Check, CheckCircle2, AlarmClock } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTenant } from '@/contexts/TenantContext'
import {
  daysSince, humanizeDays, buildReactivationMessage, buildWhatsappUrl,
  loadContacted, toggleContacted,
} from '@/lib/reactivation'
import { toast } from '@/hooks/use-toast'
import type { Barbershop, BarbershopClient } from '@/types/tenant'

const THRESHOLDS = [30, 45, 60, 90] as const

interface DormantClient {
  client: BarbershopClient
  days: number
}

interface RowProps {
  item: DormantClient
  barbershop: Barbershop
  contacted: boolean
  onContact: () => void
}

const DormantRow = ({ item, barbershop, contacted, onContact }: RowProps) => {
  const { client, days } = item
  const isVip = client.membershipType === 'vip'

  const sendWhatsapp = () => {
    if (!client.phone) {
      toast({ title: 'Cliente sem telefone', description: 'Não dá pra chamar sem um número.', variant: 'destructive' })
      return
    }
    window.open(buildWhatsappUrl(client.phone, buildReactivationMessage(client, barbershop)), '_blank')
    onContact()
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 p-4 rounded-xl border transition-colors ${
      contacted ? 'bg-[#131313] border-[#222]' : 'bg-[#161616] border-[#262626] hover:border-[#303030]'
    }`}>
      {/* Cliente */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0 text-white/60 text-xs font-heading">
          {client.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white text-sm font-semibold font-body truncate">{client.name}</p>
            {isVip && (
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-body shrink-0">
                <Crown className="w-2.5 h-2.5" />VIP
              </span>
            )}
            {contacted && (
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-body shrink-0">
                <Check className="w-2.5 h-2.5" />contatado
              </span>
            )}
          </div>
          <p className="text-white/40 text-xs font-body truncate">
            {client.totalVisits} {client.totalVisits === 1 ? 'visita' : 'visitas'} no total
          </p>
        </div>
      </div>

      {/* Ausência */}
      <div className="text-right shrink-0">
        <p className={`font-heading text-base leading-none ${days >= 60 ? 'text-red-400' : 'text-white/70'}`}>
          {humanizeDays(days)}
        </p>
        <p className="text-white/30 text-xs font-body mt-1">sem vir</p>
      </div>

      {/* Ação */}
      <div className="shrink-0">
        <button
          onClick={sendWhatsapp}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-body transition-colors ${
            contacted
              ? 'bg-white/5 border-[#2e2e2e] text-white/50 hover:text-white'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          {contacted ? 'Chamar de novo' : 'Chamar de volta'}
        </button>
      </div>
    </div>
  )
}

const DashboardReativar = () => {
  const { barbershop, clients } = useTenant()
  const [threshold, setThreshold] = useState<number>(30)
  const [contacted, setContacted] = useState<string[]>(() => barbershop ? loadContacted(barbershop.id) : [])

  const dormant = useMemo<DormantClient[]>(() => {
    const now = new Date()
    return clients
      .map(c => ({ client: c, days: daysSince(c.lastVisit, now) }))
      .filter((x): x is DormantClient => x.days !== null && x.days >= threshold && x.client.totalVisits > 0)
      .sort((a, b) => b.days - a.days)
  }, [clients, threshold])

  const markContacted = (id: string) => {
    if (!barbershop) return
    setContacted(toggleContacted(barbershop.id, id))
  }

  if (!barbershop) return null

  const vipCount = dormant.filter(d => d.client.membershipType === 'vip').length
  const over60 = dormant.filter(d => d.days >= 60).length
  const contactedCount = dormant.filter(d => contacted.includes(d.client.id)).length

  const kpis = [
    { label: 'Sumidos', value: dormant.length, icon: Users, color: 'text-amber-400' },
    { label: 'Há +60 dias', value: over60, icon: AlarmClock, color: 'text-red-400' },
    { label: 'VIPs sumidos', value: vipCount, icon: Crown, color: 'text-amber-400' },
    { label: 'Já contatados', value: `${contactedCount}/${dormant.length}`, icon: CheckCircle2, color: 'text-emerald-400' },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <p className="text-white/30 text-sm font-body mb-1">Traga de volta quem parou de vir</p>
        <h1 className="font-heading text-3xl tracking-wide text-white">REATIVAÇÃO</h1>
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
              <k.icon className={`w-4 h-4 ${k.color}`} />
            </div>
            <p className="font-heading text-2xl text-white">{k.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filtro de tempo */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-white/35 text-xs font-body flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />Sem vir há mais de:
        </span>
        {THRESHOLDS.map(t => (
          <button
            key={t}
            onClick={() => setThreshold(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-body transition-all ${
              threshold === t
                ? 'bg-amber-500/[0.12] border border-amber-500/30 text-amber-400'
                : 'border border-[#262626] text-white/45 hover:border-[#333] hover:text-white/70'
            }`}
          >
            {t} dias
          </button>
        ))}
      </div>

      {/* Lista */}
      {dormant.length === 0 ? (
        <div className="text-center py-16 text-white/25 font-body text-sm">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-emerald-400/40" />
          Ninguém sumido nesse período. Sua base está ativa!
        </div>
      ) : (
        <div className="space-y-2">
          {dormant.map(item => (
            <DormantRow
              key={item.client.id}
              item={item}
              barbershop={barbershop}
              contacted={contacted.includes(item.client.id)}
              onContact={() => markContacted(item.client.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default DashboardReativar
