import {
  CalendarDays, Users, TrendingUp, TrendingDown, Crown,
  Clock, CheckCircle2, AlertCircle, Globe, Link2,
  ExternalLink, PartyPopper, DollarSign,
} from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
import { useSaasAccount } from '@/contexts/SaasAccountContext'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { isDemoMode, getDemoPlan, getDemoFinancials } from '@/lib/demo'
import { appointmentRepository } from '@/repositories/appointmentRepository'
import type { MonthRevenue } from '@/types/tenant'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4 } }),
}

const STATUS_CONFIG = {
  done:      { label: 'Concluído', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle2 },
  confirmed: { label: 'Confirmado', color: 'text-amber-400',  bg: 'bg-amber-400/10',  icon: Clock },
  pending:   { label: 'Pendente',   color: 'text-white/40',   bg: 'bg-white/5',        icon: AlertCircle },
  cancelled: { label: 'Cancelado',  color: 'text-red-400',    bg: 'bg-red-400/10',     icon: AlertCircle },
}

const CATEGORY_COLORS: Record<string, string> = {
  Corte:     '#C9A84C',
  Barba:     '#3B82F6',
  Combo:     '#a855f7',
  Coloração: '#10b981',
}

function pct(a: number, b: number): number {
  if (b === 0) return 0
  return Math.round(((a - b) / b) * 100)
}

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0 })
}

// ─── Comparativo mensal ──────────────────────────────────────────────────────

const FinancialComparison = ({ months }: { months: MonthRevenue[] }) => {
  const current = months[months.length - 1]
  const previous = months[months.length - 2]
  if (!current || !previous) return null

  const delta = pct(current.total, previous.total)
  const isUp = delta >= 0

  // Projeção: abril tem ~13 dias de 30
  const projected = Math.round(current.total * (30 / 13))
  const projDelta = pct(projected, previous.total)
  const projUp = projDelta >= 0

  // Maior valor para escalar as barras
  const allCategories = [...new Set([
    ...Object.keys(current.byCategory),
    ...Object.keys(previous.byCategory),
  ])]
  const maxVal = Math.max(
    ...allCategories.flatMap(cat => [
      current.byCategory[cat] ?? 0,
      previous.byCategory[cat] ?? 0,
    ])
  )

  return (
    <div className="space-y-4">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Mês atual */}
        <div className="p-5 rounded-xl bg-[#161616] border border-[#262626]">
          <p className="text-white/30 text-xs font-body mb-3">{current.label} — parcial</p>
          <p className="font-heading text-3xl text-white mb-1">R$ {fmt(current.total)}</p>
          <div className={`flex items-center gap-1 text-xs font-body ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {isUp ? '+' : ''}{delta}% vs {previous.label}
          </div>
        </div>

        {/* Mês anterior */}
        <div className="p-5 rounded-xl bg-[#161616] border border-[#262626]">
          <p className="text-white/30 text-xs font-body mb-3">{previous.label} — fechado</p>
          <p className="font-heading text-3xl text-white/60 mb-1">R$ {fmt(previous.total)}</p>
          <p className="text-white/20 text-xs font-body">mês anterior</p>
        </div>

        {/* Projeção */}
        <div className="p-5 rounded-xl bg-[#161616] border border-amber-500/15">
          <p className="text-white/30 text-xs font-body mb-3">{current.label} — projeção</p>
          <p className="font-heading text-3xl text-amber-400 mb-1">R$ {fmt(projected)}</p>
          <div className={`flex items-center gap-1 text-xs font-body ${projUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {projUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {projUp ? '+' : ''}{projDelta}% projetado
          </div>
        </div>
      </div>

      {/* Barras por categoria */}
      <div className="p-5 rounded-xl bg-[#161616] border border-[#262626] space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-white/30 text-xs font-semibold tracking-widest uppercase font-body">Por categoria</p>
          <div className="flex items-center gap-4 text-xs font-body">
            <span className="flex items-center gap-1.5 text-white/40">
              <span className="w-2.5 h-2.5 rounded-sm bg-white/20 inline-block" />{previous.label}
            </span>
            <span className="flex items-center gap-1.5 text-white/70">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />{current.label}
            </span>
          </div>
        </div>

        {allCategories.map(cat => {
          const curr = current.byCategory[cat] ?? 0
          const prev = previous.byCategory[cat] ?? 0
          const color = CATEGORY_COLORS[cat] ?? '#6b7280'
          const catDelta = pct(curr, prev)
          return (
            <div key={cat} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-body">
                <span className="text-white/50">{cat}</span>
                <span className={catDelta >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}>
                  {catDelta >= 0 ? '+' : ''}{catDelta}%
                </span>
              </div>
              {/* Barra anterior */}
              <div className="h-1.5 rounded-full bg-[#2a2a2a] overflow-hidden">
                <div
                  className="h-full rounded-full bg-white/15 transition-all"
                  style={{ width: `${maxVal > 0 ? (prev / maxVal) * 100 : 0}%` }}
                />
              </div>
              {/* Barra atual */}
              <div className="h-2 rounded-full bg-[#2a2a2a] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${maxVal > 0 ? (curr / maxVal) * 100 : 0}%`,
                    backgroundColor: color,
                    opacity: 0.8,
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-body text-white/20">
                <span>R$ {fmt(prev)}</span>
                <span>R$ {fmt(curr)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Histórico 3 meses */}
      {months.length >= 3 && (
        <div className="p-5 rounded-xl bg-[#161616] border border-[#262626]">
          <p className="text-white/30 text-xs font-semibold tracking-widest uppercase font-body mb-4">Histórico</p>
          <div className="flex items-end gap-3 h-20">
            {months.map((m, i) => {
              const maxTotal = Math.max(...months.map(x => x.total))
              const heightPct = maxTotal > 0 ? (m.total / maxTotal) * 100 : 0
              const isLast = i === months.length - 1
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-body text-white/30">R$ {fmt(m.total)}</span>
                  <div className="w-full rounded-t flex items-end justify-center" style={{ height: 48 }}>
                    <div
                      className={`w-full rounded transition-all ${isLast ? 'bg-amber-500/70' : 'bg-white/10'}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-body text-white/25">{m.label.slice(0, 3)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Página ──────────────────────────────────────────────────────────────────

const DashboardOverview = () => {
  const { barbershop, memberships, appointments: todayApts, clients } = useTenant()
  const { account } = useSaasAccount()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [showSuccess, setShowSuccess] = useState(searchParams.get('checkout') === 'success')
  const [financialMonths, setFinancialMonths] = useState<MonthRevenue[]>([])

  useEffect(() => {
    if (!showSuccess) return
    navigate('/dashboard', { replace: true })
    const t = setTimeout(() => setShowSuccess(false), 6000)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Dados financeiros: demo usa mock, real busca do Supabase
  useEffect(() => {
    if (isDemoMode()) {
      const plan = getDemoPlan()
      setFinancialMonths(plan ? getDemoFinancials(plan) : [])
      return
    }
    if (!barbershop) return
    appointmentRepository
      .getMonthlyRevenue(barbershop.id)
      .then(setFinancialMonths)
      .catch(console.error)
  }, [barbershop?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const vipCount  = clients.filter(c => c.membershipType === 'vip').length
  const totalSubs = memberships.reduce((acc, m) => acc + m.subscriberCount, 0)
  const mrr       = memberships.reduce((acc, m) => acc + m.price * m.subscriberCount, 0)

  const currentMonth  = financialMonths[financialMonths.length - 1]
  const previousMonth = financialMonths[financialMonths.length - 2]
  const revDelta      = currentMonth && previousMonth ? pct(currentMonth.total, previousMonth.total) : null

  const stats = [
    { label: 'Agendamentos hoje', value: todayApts.length, icon: CalendarDays, delta: '+2 vs ontem' },
    { label: 'Clientes ativos',   value: clients.length,   icon: Users,        delta: '+1 esta semana' },
    { label: 'Assinantes VIP',    value: totalSubs,        icon: Crown,        delta: `${vipCount} clientes VIP` },
    {
      label: 'Receita este mês',
      value: currentMonth ? `R$ ${fmt(currentMonth.total)}` : `R$ ${fmt(mrr)}`,
      icon: DollarSign,
      delta: revDelta !== null
        ? `${revDelta >= 0 ? '+' : ''}${revDelta}% vs mês anterior`
        : 'recorrência mensal',
      deltaColor: revDelta !== null
        ? (revDelta >= 0 ? 'text-emerald-400' : 'text-red-400')
        : 'text-white/40',
    },
  ]

  const today = new Date()
  const dateLabel = today.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="space-y-8 max-w-5xl">

      {/* Banner sucesso pós-checkout */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
          >
            <PartyPopper className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="flex-1">
              <p className="text-emerald-400 text-sm font-semibold font-body">
                Plano {account?.plan ?? ''} ativado com sucesso!
              </p>
              <p className="text-emerald-400/60 text-xs font-body">Seu painel está pronto. Bem-vindo ao BarberOS.</p>
            </div>
            <button onClick={() => setShowSuccess(false)} className="text-emerald-400/40 hover:text-emerald-400 transition-colors text-xs">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <p className="text-white/30 text-sm font-body mb-1">Hoje — {dateLabel}</p>
        <h1 className="font-heading text-3xl tracking-wide text-white">
          BOM DIA, {barbershop?.logoText}
        </h1>
      </motion.div>

      {/* Site strip */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-[#161616] border border-[#262626]">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
          barbershop?.siteType === 'external'
            ? 'bg-blue-500/15 border border-blue-500/25'
            : 'bg-emerald-500/15 border border-emerald-500/25'
        }`}>
          {barbershop?.siteType === 'external'
            ? <Link2 className="w-3.5 h-3.5 text-blue-400" />
            : <Globe className="w-3.5 h-3.5 text-emerald-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white/70 text-sm font-body">
            {barbershop?.siteType === 'external'
              ? <>Site vinculado — <span className="text-white/50 font-mono text-xs">{barbershop?.customDomain || 'domínio não configurado'}</span></>
              : <>Site genérico — <span className="text-white/50 font-mono text-xs">barberos.io/b/{barbershop?.slug}</span></>}
          </p>
        </div>
        <a
          href={barbershop?.siteType === 'external' && barbershop.customDomain
            ? `https://${barbershop.customDomain}`
            : `/b/${barbershop?.slug}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-white/40 hover:text-white hover:border-[#333] text-xs font-body transition-all shrink-0"
        >
          <ExternalLink className="w-3 h-3" />
          Ver site
        </a>
        <a href="/dashboard/personalizar?tab=site" className="text-amber-400/70 hover:text-amber-400 text-xs font-body transition-colors shrink-0">
          Configurar →
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial="hidden" animate="visible" variants={fadeUp} custom={i + 1}
            className="p-5 rounded-xl bg-[#161616] border border-[#262626] hover:border-[#303030] transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/50 text-xs font-body">{stat.label}</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/[0.15] border border-amber-500/25 flex items-center justify-center">
                <stat.icon className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <p className="font-heading text-2xl text-white mb-1">{stat.value}</p>
            <p className={`text-xs font-body ${'deltaColor' in stat ? stat.deltaColor : 'text-white/40'}`}>
              {stat.delta}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Comparativo financeiro */}
      {financialMonths.length >= 2 && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading text-xl tracking-wide text-white">FINANCEIRO</h2>
            <a href="/dashboard/configuracoes" className="text-amber-400/70 hover:text-amber-400 text-xs font-body transition-colors">
              Configurações →
            </a>
          </div>
          <FinancialComparison months={financialMonths} />
        </motion.div>
      )}

      {/* Agenda de hoje */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-xl tracking-wide text-white">AGENDA DE HOJE</h2>
          <a href="/dashboard/agenda" className="text-amber-400/70 hover:text-amber-400 text-xs font-body transition-colors">
            Ver completa →
          </a>
        </div>
        <div className="space-y-2">
          {todayApts.length === 0 && (
            <p className="text-white/25 text-sm font-body text-center py-8">Nenhum agendamento hoje.</p>
          )}
          {todayApts.map((apt) => {
            const status = STATUS_CONFIG[apt.status]
            const StatusIcon = status.icon
            return (
              <div
                key={apt.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-[#161616] border border-[#262626] hover:bg-[#1c1c1c] hover:border-[#303030] transition-all"
              >
                <div className="w-14 shrink-0 text-center">
                  <span className="font-heading text-lg text-white/70">{apt.time}</span>
                </div>
                <div className="w-px h-10 bg-white/[0.08] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold font-body truncate">{apt.clientName}</p>
                  <p className="text-white/45 text-xs font-body">{apt.serviceName} · {apt.barberName}</p>
                </div>
                {apt.membershipType === 'vip' && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                    <Crown className="w-2.5 h-2.5" />VIP
                  </div>
                )}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-body ${status.bg} ${status.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {status.label}
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Clube VIP resumo */}
      {memberships.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={7}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading text-xl tracking-wide text-white">CLUBE VIP</h2>
            <a href="/dashboard/clube" className="text-amber-400/70 hover:text-amber-400 text-xs font-body transition-colors">
              Gerenciar →
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {memberships.map((mem) => (
              <div key={mem.id} className="p-5 rounded-xl bg-[#161616] border border-[#262626]">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-white font-semibold font-body">{mem.name}</h3>
                  <span className="text-amber-400 font-heading text-lg">R$ {mem.price}/mês</span>
                </div>
                {mem.barberName && (
                  <p className="text-white/30 text-xs font-body mb-3">Plano do barbeiro · {mem.barberName}</p>
                )}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full bg-[#2a2a2a] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${Math.min((mem.subscriberCount / 50) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-white/50 text-xs font-body shrink-0">{mem.subscriberCount} assinantes</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default DashboardOverview
