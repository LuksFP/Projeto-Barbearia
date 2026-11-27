import { publicSiteLabel, publicSiteUrl } from '@/lib/siteUrl'
import {
  CalendarDays, Users, TrendingUp, TrendingDown, Crown,
  Clock, CheckCircle2, AlertCircle, Globe,
  ExternalLink, PartyPopper, DollarSign, Copy, Check,
} from 'lucide-react'
import { openOutsideApp } from '@/lib/pwaHead'
import { toast } from '@/hooks/use-toast'
import { useTenant, mapAppointment } from '@/contexts/TenantContext'
import { useSaasAccount } from '@/contexts/SaasAccountContext'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { isDemoMode, getDemoPlan, getDemoFinancials } from '@/lib/demo'
import { appointmentRepository } from '@/repositories/appointmentRepository'
import { useClubBilling } from '@/hooks/useClubBilling'
import { formatBRL, formatDueDate, membershipMonthly } from '@/lib/clubBilling'
import { localISO, shiftMonth } from '@/lib/month'
import { AlertTriangle, CalendarClock, Wallet, Repeat, MessageCircle } from 'lucide-react'
import { upsertDemoBooking } from '@/lib/demoBookings'
import { productRepository, type StoreMonth } from '@/repositories/productRepository'
import PlaqueGoal from '@/components/dashboard/PlaqueGoal'
import { buildFixedReminder } from '@/lib/reminders'
import { waUrl } from '@/lib/whatsapp'
import type { BarbershopAppointment } from '@/types/tenant'
import type { MonthRevenue } from '@/types/tenant'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4 } }),
}

const STATUS_CONFIG = {
  done:      { label: 'Concluído', color: 'text-emerald-400', bg: 'bg-emerald-400/10', icon: CheckCircle2 },
  confirmed: { label: 'Confirmado', color: 'text-amber-400',  bg: 'bg-amber-400/10',  icon: Clock },
  pending:   { label: 'Pendente',   color: 'text-white/65',   bg: 'bg-white/5',        icon: AlertCircle },
  cancelled: { label: 'Cancelado',  color: 'text-red-400',    bg: 'bg-red-400/10',     icon: AlertCircle },
  no_show:   { label: 'Faltou',     color: 'text-orange-300', bg: 'bg-orange-400/10',  icon: AlertCircle },
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

// "16,2 mil" em vez de "16.200" — cabe na barra estreita do histórico no celular.
function fmtCompact(n: number): string {
  return n.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })
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
          <p className="text-white/55 text-xs font-body mb-3">{current.label} — parcial</p>
          <p className="font-heading text-3xl text-white mb-1">R$ {fmt(current.total)}</p>
          <div className={`flex items-center gap-1 text-xs font-body ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {isUp ? '+' : ''}{delta}% vs {previous.label}
          </div>
        </div>

        {/* Mês anterior */}
        <div className="p-5 rounded-xl bg-[#161616] border border-[#262626]">
          <p className="text-white/55 text-xs font-body mb-3">{previous.label} — fechado</p>
          <p className="font-heading text-3xl text-white/75 mb-1">R$ {fmt(previous.total)}</p>
          <p className="text-white/45 text-xs font-body">mês anterior</p>
        </div>

        {/* Projeção */}
        <div className="p-5 rounded-xl bg-[#161616] border border-amber-500/15">
          <p className="text-white/55 text-xs font-body mb-3">{current.label} — projeção</p>
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
          <p className="text-white/55 text-xs font-semibold tracking-widest uppercase font-body">Por categoria</p>
          <div className="flex items-center gap-4 text-xs font-body">
            <span className="flex items-center gap-1.5 text-white/65">
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
                <span className="text-white/70">{cat}</span>
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
              <div className="flex justify-between text-[11px] font-body text-white/45">
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
          <p className="text-white/55 text-xs font-semibold tracking-widest uppercase font-body mb-4">Histórico</p>
          <div className="flex items-end gap-1.5 sm:gap-3 h-20">
            {months.map((m, i) => {
              const maxTotal = Math.max(...months.map(x => x.total))
              const heightPct = maxTotal > 0 ? (m.total / maxTotal) * 100 : 0
              const isLast = i === months.length - 1
              return (
                <div
                  key={m.month}
                  className={`flex-1 min-w-0 flex-col items-center gap-1.5 ${i < months.length - 6 ? 'hidden sm:flex' : 'flex'}`}
                >
                  <span className="text-[10px] font-body text-white/55 whitespace-nowrap">R$ {fmtCompact(m.total)}</span>
                  <div className="w-full rounded-t flex items-end justify-center" style={{ height: 48 }}>
                    <div
                      className={`w-full rounded transition-all ${isLast ? 'bg-amber-500/70' : 'bg-white/10'}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-body text-white/55">{m.label.slice(0, 3)}</span>
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
  const { barbershop, memberships, appointments: loadedApts, clients, isAdmin } = useTenant()
  // Só os de hoje (a demo carrega as próximas semanas junto, por causa dos fixos)
  const localToday = new Date().toLocaleDateString('sv-SE')
  const todayApts = loadedApts.filter(a => a.date === localToday).sort((a, b) => a.time.localeCompare(b.time))
  const [remindedNow, setRemindedNow] = useState<Set<string>>(new Set())
  const openFixed = (a: BarbershopAppointment) => !!a.recurrenceId && (a.status === 'pending' || a.status === 'confirmed')
  // Fixo de manhã (antes do meio-dia) aparece já no dia anterior: dá tempo de confirmar
  const tomorrowDate = new Date(); tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const localTomorrow = tomorrowDate.toLocaleDateString('sv-SE')
  const [tomorrowLoaded, setTomorrowLoaded] = useState<BarbershopAppointment[]>([])
  useEffect(() => {
    if (isDemoMode() || !barbershop) return
    appointmentRepository.listByBarbershop(barbershop.id, localTomorrow)
      .then(rows => setTomorrowLoaded(rows.map(mapAppointment)))
      .catch(() => setTomorrowLoaded([]))
  }, [barbershop?.id, localTomorrow]) // eslint-disable-line react-hooks/exhaustive-deps
  const tomorrowSource = isDemoMode() ? loadedApts : tomorrowLoaded
  const fixedTomorrowMorning = tomorrowSource
    .filter(a => a.date === localTomorrow && openFixed(a) && a.time.slice(0, 5) < '12:00')
    .sort((a, b) => a.time.localeCompare(b.time))
  const fixedToday = todayApts.filter(openFixed)
  const fixedList = [...fixedToday, ...fixedTomorrowMorning]
  const wasReminded = (a: BarbershopAppointment) => !!a.remindedAt || remindedNow.has(a.id)
  const sendFixed = (apt: BarbershopAppointment) => {
    const url = barbershop ? waUrl(apt.clientPhone, buildFixedReminder(apt, barbershop)) : null
    if (!url) return
    window.open(url, '_blank', 'noopener') // antes de qualquer await
    setRemindedNow(prev => new Set(prev).add(apt.id))
    const at = new Date().toISOString()
    if (isDemoMode()) { upsertDemoBooking({ ...apt, remindedAt: at }); return }
    appointmentRepository.setReminded(apt.id, true).catch(() => { /* o WhatsApp já abriu */ })
  }
  const { account } = useSaasAccount()
  const { billings, summary, ready: clubReady, subscriberCounts } = useClubBilling()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [showSuccess, setShowSuccess] = useState(searchParams.get('checkout') === 'success')
  const [financialMonths, setFinancialMonths] = useState<MonthRevenue[]>([])
  const [storeMonths, setStoreMonths] = useState<StoreMonth[]>([])
  const [copiedLink, setCopiedLink] = useState(false)

  // Todo plano tem site público com agendamento; sem plano, sem link
  const hasSite = !!account?.plan
  const publicUrl = publicSiteUrl(barbershop?.slug ?? '')

  const copyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopiedLink(true)
      toast({ title: 'Link copiado!', description: publicUrl })
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      toast({ title: 'Não foi possível copiar o link', variant: 'destructive' })
    }
  }

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
      .catch(() => toast({ title: 'Erro ao carregar dados financeiros', variant: 'destructive' }))
    // Loja entra no faturamento da placa (igual ao Financeiro)
    const from = new Date(); from.setMonth(from.getMonth() - 3); from.setDate(1)
    productRepository.salesByMonth(barbershop.id, from.toLocaleDateString('sv-SE'))
      .then(setStoreMonths)
      .catch(() => setStoreMonths([]))
  }, [barbershop?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Assinantes contados da lista de Cobranças do Clube
  const subsOf    = (m: (typeof memberships)[number]) => clubReady ? (subscriberCounts[m.id] ?? 0) : m.subscriberCount
  const totalSubs = memberships.reduce((acc, m) => acc + subsOf(m), 0)
  const mrr       = memberships.reduce((acc, m) => acc + membershipMonthly(m) * subsOf(m), 0)

  // Faturamento = serviços + loja, igual à placa e ao Financeiro. A lista só tem
  // meses com movimento: procura pelo mês, senão no dia 1º apareceria o mês passado.
  const thisMonth = localISO(new Date()).slice(0, 7)
  const lastMonth = shiftMonth(thisMonth, -1)
  const revenueOf = (ym: string) =>
    (financialMonths.find(m => m.month === ym)?.total ?? 0) + (storeMonths.find(s => s.month === ym)?.revenue ?? 0)
  const revNow    = revenueOf(thisMonth)
  const revPrev   = revenueOf(lastMonth)
  const revDelta  = revPrev > 0 ? pct(revNow, revPrev) : null
  const revenueMonths = [...new Set([...financialMonths.map(m => m.month), ...storeMonths.map(s => s.month)])]
    .sort()
    .map(month => ({ month, total: revenueOf(month) }))

  // Legendas dos cartões: só contas feitas com o que já está carregado (nada fixo no código)
  const toConfirm = todayApts.filter(a => a.status === 'pending').length
  const aptsNote = todayApts.length === 0
    ? 'nenhum horário hoje'
    : toConfirm > 0 ? `${toConfirm} a confirmar` : 'todos confirmados'
  const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
  const recentClients = clients.filter(c => c.lastVisit && new Date(c.lastVisit).getTime() >= monthAgo).length
  const activePlans = memberships.filter(m => m.active).length
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

  const stats = [
    { label: 'Agendamentos hoje', value: todayApts.length, icon: CalendarDays, delta: aptsNote },
    { label: 'Clientes', value: clients.length, icon: Users, delta: recentClients === 0 ? 'nenhum veio nos últimos 30 dias' : `${plural(recentClients, 'veio', 'vieram')} nos últimos 30 dias` },
    { label: 'Assinantes VIP', value: totalSubs, icon: Crown, delta: activePlans === 0 ? 'nenhum plano criado' : totalSubs > 0 ? `R$ ${fmt(mrr)}/mês em ${plural(activePlans, 'plano', 'planos')}` : `em ${plural(activePlans, 'plano', 'planos')}` },
    {
      label: 'Receita este mês',
      value: `R$ ${fmt(revNow)}`,
      icon: DollarSign,
      delta: revDelta !== null
        ? `${revDelta >= 0 ? '+' : ''}${revDelta}% vs mês anterior`
        : 'serviços concluídos + loja',
      deltaColor: revDelta !== null
        ? (revDelta >= 0 ? 'text-emerald-400' : 'text-red-400')
        : 'text-white/65',
    },
  ]

  const today = new Date()
  const dateLabel = today.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

  // Alerta de cobranças: atrasadas, vencendo hoje ou perto de vencer (≤3 dias)
  const alertList = billings.filter(b =>
    b.status === 'overdue' || b.status === 'today' || (b.status === 'due-soon' && b.daysUntil <= 3)
  )
  const hasOverdue = summary.overdueCount > 0
  const alertParts: string[] = []
  if (summary.overdueCount > 0) alertParts.push(`${summary.overdueCount} atrasada${summary.overdueCount > 1 ? 's' : ''}`)
  if (summary.todayCount > 0) alertParts.push(`${summary.todayCount} vencendo hoje`)
  const soon3 = billings.filter(b => b.status === 'due-soon' && b.daysUntil <= 3).length
  if (soon3 > 0) alertParts.push(`${soon3} perto de vencer`)

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
        <p className="text-white/55 text-sm font-body mb-1">Hoje — {dateLabel}</p>
        <h1 className="font-heading text-3xl tracking-wide text-white">
          BOM DIA, {barbershop?.logoText}
        </h1>
      </motion.div>

      {/* Alerta de cobranças do clube perto de vencer / atrasadas */}
      <AnimatePresence>
        {alertList.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`p-4 rounded-xl border ${
              hasOverdue ? 'bg-red-500/[0.07] border-red-500/25' : 'bg-amber-500/[0.07] border-amber-500/25'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                hasOverdue ? 'bg-red-500/15 border border-red-500/25' : 'bg-amber-500/15 border border-amber-500/25'
              }`}>
                <AlertTriangle className={`w-4 h-4 ${hasOverdue ? 'text-red-400' : 'text-amber-400'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold font-body ${hasOverdue ? 'text-red-400' : 'text-amber-400'}`}>
                  Mensalidades do clube — {alertParts.join(' · ')}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {alertList.slice(0, 5).map(b => {
                    const hint = b.status === 'overdue' ? `${b.daysLate}d atraso`
                      : b.status === 'today' ? 'hoje' : `em ${b.daysUntil}d`
                    return (
                      <span
                        key={b.sub.id}
                        className={`text-xs font-body px-2 py-0.5 rounded-full border ${
                          b.status === 'overdue'
                            ? 'bg-red-500/10 border-red-500/20 text-red-300'
                            : 'bg-white/[0.04] border-white/10 text-white/75'
                        }`}
                      >
                        {b.sub.name.split(' ')[0]} · {hint}
                      </span>
                    )
                  })}
                  {alertList.length > 5 && (
                    <span className="text-xs font-body px-2 py-0.5 text-white/65">+{alertList.length - 5}</span>
                  )}
                </div>
              </div>
              <a
                href="/dashboard/clube"
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-body transition-colors ${
                  hasOverdue
                    ? 'bg-red-500 text-white hover:bg-red-400'
                    : 'bg-amber-500 text-[#0a0a0a] hover:bg-amber-400'
                }`}
              >
                Cobrar agora →
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Site strip */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-[#161616] border border-[#262626]">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-emerald-500/15 border border-emerald-500/25">
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-[12rem]">
          <p className="text-white/70 text-sm font-body break-words">
            Seu site — <span className="text-white/70 font-mono text-xs break-all">{publicSiteLabel(barbershop?.slug ?? '')}</span>
          </p>
        </div>
        {hasSite && (
          <button
            onClick={copyPublicLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-white/65 hover:text-white hover:border-[#333] text-xs font-body transition-all shrink-0"
          >
            {copiedLink
              ? <><Check className="w-3 h-3 text-emerald-400" />Copiado</>
              : <><Copy className="w-3 h-3" />Copiar link</>}
          </button>
        )}
        <a
          href={`/b/${barbershop?.slug}`}
          target="_blank" rel="noopener noreferrer"
          onClick={openOutsideApp}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#2a2a2a] text-white/65 hover:text-white hover:border-[#333] text-xs font-body transition-all shrink-0"
        >
          <ExternalLink className="w-3 h-3" />
          Ver site
        </a>
        <a href="/dashboard/personalizar?tab=site" className="text-amber-400/70 hover:text-amber-400 text-xs font-body transition-colors shrink-0">
          Configurar →
        </a>
      </div>

      {/* Clientes fixos de hoje: lembrar de confirmar no WhatsApp */}
      {fixedList.length > 0 && (
        <div className="p-4 rounded-xl border border-violet-400/25 bg-violet-400/[0.06]">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="flex items-center gap-2 text-violet-200 text-sm font-semibold font-body">
              <Repeat className="w-4 h-4" />
              {fixedToday.length === 0
                ? (fixedList.length === 1 ? 'Cliente fixo amanhã cedo' : `${fixedList.length} clientes fixos amanhã cedo`)
                : fixedTomorrowMorning.length === 0
                  ? (fixedList.length === 1 ? 'Cliente fixo hoje' : `${fixedList.length} clientes fixos hoje`)
                  : `${fixedList.length} clientes fixos · hoje e amanhã cedo`}
              <span className="text-white/50 font-normal">· manda uma mensagem confirmando</span>
            </p>
            <a href="/dashboard/fixos" className="text-violet-200/70 hover:text-violet-200 text-xs font-body shrink-0">Ver fixos →</a>
          </div>
          <div className="space-y-2">
            {fixedList.map(apt => (
              <div key={apt.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-[#141414] border border-[#262626] px-3 py-2">
                <span className="w-14 shrink-0 leading-tight">
                  <span className="block font-heading text-lg text-white tabular-nums">{apt.time.slice(0, 5)}</span>
                  {apt.date !== localToday && <span className="block text-[11px] font-body font-semibold text-amber-300">amanhã</span>}
                </span>
                <div className="flex-1 min-w-[10rem]">
                  <p className="text-white text-sm font-semibold font-body">{apt.clientName}</p>
                  <p className="text-white/55 text-xs font-body">{apt.serviceName} · {apt.barberName}</p>
                </div>
                {wasReminded(apt) ? (
                  <button type="button" onClick={() => sendFixed(apt)} title="Mandar de novo"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-body font-semibold border border-[#2a2a2a] text-white/55 hover:text-white">
                    <Check className="w-3 h-3 text-emerald-400" />Mensagem enviada
                  </button>
                ) : apt.clientPhone ? (
                  <button type="button" onClick={() => sendFixed(apt)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-body font-semibold border border-[#25D366]/40 bg-[#25D366]/10 text-[#5ee08f] hover:bg-[#25D366]/20">
                    <MessageCircle className="w-3 h-3" />Confirmar no WhatsApp
                  </button>
                ) : (
                  <span className="text-white/40 text-xs font-body">sem WhatsApp cadastrado</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial="hidden" animate="visible" variants={fadeUp} custom={i + 1}
            className="p-5 rounded-xl bg-[#161616] border border-[#262626] hover:border-[#303030] transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/70 text-xs font-body">{stat.label}</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/[0.15] border border-amber-500/25 flex items-center justify-center">
                <stat.icon className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <p className="font-heading text-2xl text-white mb-1">{stat.value}</p>
            <p className={`text-xs font-body ${'deltaColor' in stat ? stat.deltaColor : 'text-white/65'}`}>
              {stat.delta}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Placa dos R$ 10 mil */}
      {barbershop && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5}>
          <PlaqueGoal
            barbershopId={barbershop.id}
            shopName={barbershop.name}
            canClaim={isAdmin}
            months={revenueMonths}
          />
        </motion.div>
      )}

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
            <p className="text-white/55 text-sm font-body text-center py-8">Nenhum agendamento hoje.</p>
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
                  <p className="text-white/65 text-xs font-body">{apt.serviceName} · {apt.barberName}</p>
                </div>
                {apt.recurrenceId && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-400/10 border border-violet-400/30 text-violet-200 text-xs">
                    <Repeat className="w-2.5 h-2.5" />Fixo
                  </div>
                )}
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

      {/* Vencimentos do clube */}
      {billings.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={7}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading text-xl tracking-wide text-white">VENCIMENTOS DO CLUBE</h2>
            <a href="/dashboard/clube" className="text-amber-400/70 hover:text-amber-400 text-xs font-body transition-colors">
              Ver cobranças →
            </a>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Atrasados', value: summary.overdueCount, icon: AlertTriangle, color: 'text-red-400', ring: summary.overdueCount > 0 ? 'border-red-500/25 bg-red-500/[0.05]' : 'border-[#262626] bg-[#161616]' },
              { label: 'A vencer (7 dias)', value: summary.dueSoonCount + summary.todayCount, icon: CalendarClock, color: 'text-amber-400', ring: 'border-[#262626] bg-[#161616]' },
              { label: 'Recebido no mês', value: formatBRL(summary.received), icon: Wallet, color: 'text-emerald-400', ring: 'border-[#262626] bg-[#161616]' },
            ].map((c) => (
              <div key={c.label} className={`p-5 rounded-xl border ${c.ring}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white/65 text-xs font-body">{c.label}</span>
                  <c.icon className={`w-4 h-4 ${c.color}`} />
                </div>
                <p className="font-heading text-2xl text-white">{c.value}</p>
              </div>
            ))}
          </div>

          {/* Próximos a resolver */}
          {billings.filter(b => b.status !== 'paid').length > 0 && (
            <div className="rounded-xl bg-[#161616] border border-[#262626] divide-y divide-white/[0.04]">
              {billings.filter(b => b.status !== 'paid').slice(0, 4).map(b => {
                const color = b.status === 'overdue' ? 'text-red-400' : b.status === 'today' ? 'text-amber-400' : 'text-blue-400'
                const hint = b.status === 'overdue' ? `${b.daysLate}d em atraso` : b.status === 'today' ? 'vence hoje' : `em ${b.daysUntil}d`
                return (
                  <div key={b.sub.id} className="flex items-center gap-3 p-3.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${b.status === 'overdue' ? 'bg-red-400' : b.status === 'today' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-body truncate">{b.sub.name}</p>
                      <p className="text-white/60 text-xs font-body">{b.membership?.name ?? '—'} · {formatDueDate(b.dueDate)}</p>
                    </div>
                    <span className="text-white/75 text-sm font-body shrink-0">{formatBRL(b.amount)}</span>
                    <span className={`text-xs font-body shrink-0 ${color}`}>{hint}</span>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      )}

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
                  <p className="text-white/55 text-xs font-body mb-3">Plano do barbeiro · {mem.barberName}</p>
                )}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full bg-[#2a2a2a] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${Math.min((subsOf(mem) / 50) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-white/70 text-xs font-body shrink-0">{subsOf(mem)} assinantes</span>
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
