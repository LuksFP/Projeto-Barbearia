import { useEffect, useState } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import { appointmentRepository } from '@/repositories/appointmentRepository'
import { isDemoMode, getDemoPlan, getDemoFinancials } from '@/lib/demo'
import { supabase } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid,
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, Scissors, Users,
  Download, Loader2, Sparkles,
} from 'lucide-react'
import { motion } from 'framer-motion'
import type { MonthRevenue } from '@/types/tenant'

type Period = 3 | 6 | 12

// Insight de IA (gerado pela edge function financeiro-insights / Groq)
type Insight = { tone: 'positivo' | 'alerta' | 'neutro'; text: string }

const INSIGHT_TTL = 1000 * 60 * 60 * 3 // 3h de cache local

// Hash simples e estável dos números, pra invalidar o cache quando mudarem
function hashNumbers(obj: unknown) {
  const s = JSON.stringify(obj)
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return String(h >>> 0)
}

const CATEGORY_COLORS: Record<string, string> = {
  Corte:       '#C9A84C',
  Barba:       '#3B82F6',
  Combo:       '#a855f7',
  Coloração:   '#10b981',
  Sobrancelha: '#f43f5e',
  Tratamento:  '#06b6d4',
  Outros:      '#6b7280',
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtK(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(Math.round(n))
}

function pct(a: number, b: number) {
  if (b === 0) return 0
  return Math.round(((a - b) / b) * 100)
}

// ─── Tooltip customizado ──────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs font-body shadow-xl">
      <p className="text-white/50 mb-1">{label}</p>
      <p className="text-amber-400 font-semibold">R$ {fmt(payload[0].value)}</p>
    </div>
  )
}

// ─── Exportar CSV ─────────────────────────────────────────────────────────────

function exportCSV(months: MonthRevenue[]) {
  const header = 'Mês,Receita Total,Corte,Barba,Combo,Coloração,Outros'
  const rows = months.map(m => {
    const cats = ['Corte', 'Barba', 'Combo', 'Coloração', 'Outros']
    return [
      m.label,
      m.total.toFixed(2),
      ...cats.map(c => (m.byCategory[c] ?? 0).toFixed(2)),
    ].join(',')
  })
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `financeiro-${new Date().toISOString().slice(0, 7)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Página ───────────────────────────────────────────────────────────────────

const DashboardFinanceiro = () => {
  const { barbershop, barbers } = useTenant()
  const [period, setPeriod] = useState<Period>(6)
  // fetching = true apenas na primeira carga; refreshing = true nas subsequentes (mantém dados visíveis)
  const [fetching, setFetching] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [byMonth, setByMonth] = useState<MonthRevenue[]>([])
  const [byBarber, setByBarber] = useState<{ barberId: string; barberName: string; total: number; count: number }[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [avgTicket, setAvgTicket] = useState(0)
  const hasData = byMonth.length > 0

  // Insights de IA — exclusivo Pro/Premium
  const [insights, setInsights] = useState<Insight[]>([])
  const [insightsLoading, setInsightsLoading] = useState(false)
  const aiEnabled = barbershop?.plan === 'pro' || barbershop?.plan === 'premium'

  useEffect(() => {
    if (isDemoMode()) {
      const plan = getDemoPlan()
      const months = (plan ? getDemoFinancials(plan) : []).slice(-period)
      setByMonth(months)
      const total = months.reduce((s, m) => s + m.total, 0)
      setTotalRevenue(total)
      setTotalCount(Math.round(months.reduce((s, m) => s + Object.values(m.byCategory).reduce((a, b) => a + b, 0) / 40, 0)))
      setAvgTicket(total > 0 ? total / Math.max(1, months.length * 3) : 0)
      // Demo: distribui a receita entre os barbeiros (shares decrescentes)
      const active = barbers.filter(b => b.active)
      const weightSum = active.reduce((s, _, i) => s + (active.length - i), 0) || 1
      setByBarber(active.map((b, i) => {
        const share = (active.length - i) / weightSum
        const bt = Math.round(total * share)
        return { barberId: b.id, barberName: b.name, total: bt, count: Math.max(1, Math.round(bt / 45)) }
      }))
      setFetching(false)
      return
    }
    if (!barbershop) return

    // Se já tem dados, faz refresh discreto (sem apagar o conteúdo)
    if (hasData) setRefreshing(true)
    else setFetching(true)

    appointmentRepository
      .getFinancials(barbershop.id, period)
      .then(d => {
        setByMonth(d.byMonth)
        setByBarber(d.byBarber)
        setTotalRevenue(d.totalRevenue)
        setTotalCount(d.totalCount)
        setAvgTicket(d.avgTicket)
      })
      .catch(() => toast({ title: 'Erro ao carregar financeiro', variant: 'destructive' }))
      .finally(() => { setFetching(false); setRefreshing(false) })
  }, [barbershop?.id, period]) // eslint-disable-line react-hooks/exhaustive-deps

  // Gera os insights de IA quando os números mudam (só Pro/Premium)
  useEffect(() => {
    if (!aiEnabled || byMonth.length === 0) { setInsights([]); return }

    // Demo: insights mockados, sem chamar a API
    if (isDemoMode()) {
      setInsights([
        { tone: 'positivo', text: 'Seu faturamento vem crescendo nos últimos meses — mantenha o que está funcionando.' },
        { tone: 'neutro', text: 'Cortes puxam a maior parte da receita; combos têm espaço pra crescer.' },
        { tone: 'alerta', text: 'Há meses com queda pontual — vale promover horários ociosos para equilibrar.' },
      ])
      return
    }

    const payload = { months: period, totalRevenue, avgTicket, totalCount, byMonth, byBarber }
    const cacheKey = `bo:insights:${barbershop?.id}:${period}:${hashNumbers({ byMonth, byBarber })}`

    // Cache local — evita rechamar a IA com os mesmos números
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const { at, data } = JSON.parse(cached)
        if (Date.now() - at < INSIGHT_TTL && Array.isArray(data)) { setInsights(data); return }
      }
    } catch { /* cache inválido — ignora */ }

    let cancelled = false
    setInsightsLoading(true)
    supabase.functions
      .invoke('financeiro-insights', { body: payload })
      .then(({ data, error }) => {
        if (cancelled) return
        const list: Insight[] = (!error && Array.isArray(data?.insights)) ? data.insights : []
        setInsights(list)
        if (list.length) {
          try { localStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), data: list })) } catch { /* quota — ignora */ }
        }
      })
      .finally(() => { if (!cancelled) setInsightsLoading(false) })

    return () => { cancelled = true }
  }, [byMonth, byBarber, totalRevenue, avgTicket, totalCount, period, aiEnabled, barbershop?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const loading = fetching

  const lastMonth  = byMonth[byMonth.length - 1]
  const prevMonth  = byMonth[byMonth.length - 2]
  const monthDelta = lastMonth && prevMonth ? pct(lastMonth.total, prevMonth.total) : null

  // Categorias consolidadas
  const allCategories = [...new Set(byMonth.flatMap(m => Object.keys(m.byCategory)))]
  const byCategory = allCategories.map(cat => ({
    cat,
    total: byMonth.reduce((s, m) => s + (m.byCategory[cat] ?? 0), 0),
    color: CATEGORY_COLORS[cat] ?? '#6b7280',
  })).sort((a, b) => b.total - a.total)
  const catMax = byCategory[0]?.total ?? 1

  const comparisonData = lastMonth && prevMonth
    ? allCategories.map(cat => ({
        cat,
        [prevMonth.label]: prevMonth.byCategory[cat] ?? 0,
        [lastMonth.label]: lastMonth.byCategory[cat] ?? 0,
      }))
    : []

  return (
    <div className="space-y-7 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-white/30 text-sm font-body mb-1">Visão financeira</p>
          <h1 className="font-heading text-3xl tracking-wide text-white">FINANCEIRO</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Seletor de período */}
          <div className="flex items-center bg-[#141414] border border-[#252525] rounded-lg p-0.5">
            {([3, 6, 12] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded text-xs font-body transition-all ${
                  period === p
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'text-white/35 hover:text-white/60'
                }`}
              >
                {p}m
              </button>
            ))}
          </div>
          {refreshing && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400/60" />
          )}
          <button
            onClick={() => exportCSV(byMonth)}
            disabled={byMonth.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2a2a2a] text-white/40 hover:text-white hover:border-[#333] text-xs font-body transition-all disabled:opacity-30"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>
      </div>

      {loading ? (
        /* Skeleton — primeira carga */
        <div className="space-y-6 animate-pulse">
          {/* KPI skeletons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-white/[0.04] border border-white/5" />
            ))}
          </div>
          {/* Chart skeleton */}
          <div className="h-56 rounded-2xl bg-white/[0.04] border border-white/5" />
          {/* Bottom skeletons */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="h-40 rounded-2xl bg-white/[0.04] border border-white/5" />
            <div className="h-40 rounded-2xl bg-white/[0.04] border border-white/5" />
          </div>
        </div>
      ) : byMonth.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <DollarSign className="w-10 h-10 text-white/10 mb-4" />
          <p className="text-white/40 font-body text-sm">Nenhum agendamento concluído no período.</p>
          <p className="text-white/20 font-body text-xs mt-1">
            Conclua agendamentos na Agenda para ver os dados aqui.
          </p>
        </div>
      ) : (
        <>
          {/* Resumo de IA — exclusivo Pro/Premium */}
          {aiEnabled && (insightsLoading || insights.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-xl bg-gradient-to-br from-amber-500/[0.07] to-[#141414] border border-amber-500/20"
            >
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <p className="text-white/70 text-xs font-semibold uppercase tracking-widest font-body">
                  Resumo do mês · IA
                </p>
                {insightsLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400/60" />}
              </div>
              {insightsLoading && insights.length === 0 ? (
                <p className="text-white/40 text-sm font-body">Analisando seus números…</p>
              ) : (
                <ul className="space-y-2">
                  {insights.map((ins, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm font-body text-white/75">
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                        ins.tone === 'positivo' ? 'bg-emerald-400'
                        : ins.tone === 'alerta' ? 'bg-red-400'
                        : 'bg-white/40'
                      }`} />
                      {ins.text}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}

          {/* KPIs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {[
              {
                label: `Receita (${period}m)`,
                value: `R$ ${fmt(totalRevenue)}`,
                icon: DollarSign,
                sub: monthDelta !== null
                  ? `${monthDelta >= 0 ? '+' : ''}${monthDelta}% vs mês anterior`
                  : undefined,
                subColor: monthDelta !== null
                  ? (monthDelta >= 0 ? 'text-emerald-400' : 'text-red-400')
                  : undefined,
              },
              {
                label: 'Atendimentos',
                value: totalCount,
                icon: Scissors,
                sub: `${period} meses`,
              },
              {
                label: 'Ticket médio',
                value: `R$ ${fmt(avgTicket)}`,
                icon: TrendingUp,
                sub: 'por atendimento',
              },
              {
                label: lastMonth?.label ?? 'Mês atual',
                value: lastMonth ? `R$ ${fmt(lastMonth.total)}` : '—',
                icon: monthDelta !== null && monthDelta >= 0 ? TrendingUp : TrendingDown,
                sub: monthDelta !== null
                  ? `${monthDelta >= 0 ? '+' : ''}${monthDelta}% vs anterior`
                  : 'mês atual',
                subColor: monthDelta !== null
                  ? (monthDelta >= 0 ? 'text-emerald-400' : 'text-red-400')
                  : undefined,
              },
            ].map((kpi, i) => (
              <motion.div
                key={kpi.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="p-5 rounded-xl bg-[#141414] border border-[#252525]"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white/40 text-xs font-body">{kpi.label}</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <kpi.icon className="w-4 h-4 text-amber-400" />
                  </div>
                </div>
                <p className="font-heading text-2xl text-white mb-1">{kpi.value}</p>
                {kpi.sub && (
                  <p className={`text-xs font-body ${kpi.subColor ?? 'text-white/30'}`}>{kpi.sub}</p>
                )}
              </motion.div>
            ))}
          </motion.div>

          {/* Gráfico de barras mensais */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-xl bg-[#141414] border border-[#252525]"
          >
            <p className="text-white/40 text-xs font-semibold uppercase tracking-widest font-body mb-6">
              Receita por mês
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byMonth} barSize={28} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'inherit' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => v.slice(0, 3)}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: 'inherit' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={fmtK}
                  width={38}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {byMonth.map((entry, i) => (
                    <Cell
                      key={entry.month}
                      fill={i === byMonth.length - 1 ? '#C9A84C' : 'rgba(255,255,255,0.12)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Gráfico de tendência */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.23 }}
            className="p-6 rounded-xl bg-[#141414] border border-[#252525]"
          >
            <p className="text-white/40 text-xs font-semibold uppercase tracking-widest font-body mb-6">
              Tendência de crescimento
            </p>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={byMonth} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#C9A84C" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11, fontFamily: 'inherit' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => v.slice(0, 3)}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: 'inherit' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={fmtK}
                  width={38}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(201,168,76,0.3)', strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#C9A84C"
                  strokeWidth={2}
                  fill="url(#gradRevenue)"
                  dot={{ fill: '#C9A84C', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#C9A84C', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Comparação mensal por categoria */}
          {comparisonData.length > 0 && lastMonth && prevMonth && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26 }}
              className="p-6 rounded-xl bg-[#141414] border border-[#252525]"
            >
              <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
                <p className="text-white/40 text-xs font-semibold uppercase tracking-widest font-body">
                  Comparação mensal por categoria
                </p>
                <div className="flex items-center gap-4 text-xs font-body">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-white/20 inline-block" />
                    <span className="text-white/40">{prevMonth.label}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                    <span className="text-white/60">{lastMonth.label}</span>
                  </span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart
                  data={comparisonData}
                  barCategoryGap="30%"
                  barGap={3}
                  margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
                >
                  <XAxis
                    dataKey="cat"
                    tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'inherit' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: 'inherit' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={fmtK}
                    width={38}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs font-body shadow-xl">
                          <p className="text-white/50 mb-1">{label}</p>
                          {payload.map((p, i) => {
                            const delta = payload[1] && i === 1
                              ? pct(p.value as number, (payload[0].value as number))
                              : null
                            return (
                              <div key={i} className="flex items-center justify-between gap-4">
                                <span style={{ color: p.color }}>{p.name}:</span>
                                <span className="text-white/80 font-semibold">R$ {fmt(p.value as number)}</span>
                                {delta !== null && (
                                  <span className={delta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                    {delta >= 0 ? '+' : ''}{delta}%
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )
                    }}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Bar dataKey={prevMonth.label} fill="rgba(255,255,255,0.15)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey={lastMonth.label} fill="#C9A84C" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Por categoria */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="p-6 rounded-xl bg-[#141414] border border-[#252525] space-y-4"
            >
              <p className="text-white/40 text-xs font-semibold uppercase tracking-widest font-body">
                Por categoria
              </p>
              {byCategory.length === 0 && (
                <p className="text-white/20 text-sm font-body">Sem dados.</p>
              )}
              {byCategory.map(({ cat, total, color }) => (
                <div key={cat} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-body">
                    <span className="text-white/55 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      {cat}
                    </span>
                    <span className="text-white/70">R$ {fmt(total)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#1f1f1f] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(total / catMax) * 100}%`, backgroundColor: color, opacity: 0.75 }}
                    />
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Por barbeiro */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 rounded-xl bg-[#141414] border border-[#252525] space-y-4"
            >
              <p className="text-white/40 text-xs font-semibold uppercase tracking-widest font-body">
                Por barbeiro
              </p>
              {byBarber.length === 0 && (
                <p className="text-white/20 text-sm font-body">Sem dados de barbeiros.</p>
              )}
              {byBarber.map((b, i) => {
                const barMax = byBarber[0]?.total ?? 1
                return (
                  <div key={b.barberId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-body">
                      <span className="text-white/55 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                          <Users className="w-2.5 h-2.5 text-amber-400" />
                        </span>
                        {b.barberName}
                      </span>
                      <div className="text-right">
                        <span className="text-white/70">R$ {fmt(b.total)}</span>
                        <span className="text-white/25 ml-2">({b.count} atend.)</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#1f1f1f] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(b.total / barMax) * 100}%`,
                          background: `hsl(${(i * 47) % 360}, 60%, 55%)`,
                          opacity: 0.7,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </motion.div>
          </div>

          {/* Comissões por barbeiro */}
          {byBarber.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 rounded-xl bg-[#141414] border border-amber-500/15"
            >
              <div className="flex items-center justify-between mb-5">
                <p className="text-white/40 text-xs font-semibold uppercase tracking-widest font-body">Comissões</p>
                <a href="/dashboard/equipe" className="text-amber-400/60 hover:text-amber-400 text-xs font-body transition-colors">Ajustar % na Equipe →</a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-body">
                  <thead>
                    <tr className="border-b border-[#252525] text-white/30 text-xs">
                      <th className="text-left pb-3 pr-4">Barbeiro</th>
                      <th className="text-right pb-3 pr-4">Receita</th>
                      <th className="text-right pb-3 pr-4">%</th>
                      <th className="text-right pb-3 pr-4">Comissão</th>
                      <th className="text-right pb-3">Casa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byBarber.map(b => {
                      const barber = barbers.find(x => x.id === b.barberId)
                      const pct = barber?.commissionPercent ?? 50
                      const commission = b.total * pct / 100
                      return (
                        <tr key={b.barberId} className="border-b border-[#1c1c1c]">
                          <td className="py-2.5 pr-4 text-white/70">{b.barberName}</td>
                          <td className="py-2.5 pr-4 text-right text-white/50">R$ {fmt(b.total)}</td>
                          <td className="py-2.5 pr-4 text-right text-white/40">{pct}%</td>
                          <td className="py-2.5 pr-4 text-right text-amber-400 font-semibold">R$ {fmt(Math.round(commission))}</td>
                          <td className="py-2.5 text-right text-white/50">R$ {fmt(Math.round(b.total - commission))}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    {(() => {
                      const totalComm = byBarber.reduce((s, b) => {
                        const pct = barbers.find(x => x.id === b.barberId)?.commissionPercent ?? 50
                        return s + b.total * pct / 100
                      }, 0)
                      const totalRev = byBarber.reduce((s, b) => s + b.total, 0)
                      return (
                        <tr className="border-t border-[#2a2a2a] text-xs">
                          <td className="pt-3 pr-4 text-white/40 uppercase tracking-wide">Total</td>
                          <td className="pt-3 pr-4 text-right text-white/60">R$ {fmt(totalRev)}</td>
                          <td className="pt-3 pr-4"></td>
                          <td className="pt-3 pr-4 text-right text-amber-400 font-bold">R$ {fmt(Math.round(totalComm))}</td>
                          <td className="pt-3 text-right text-white/60">R$ {fmt(Math.round(totalRev - totalComm))}</td>
                        </tr>
                      )
                    })()}
                  </tfoot>
                </table>
              </div>
              <p className="text-white/25 text-[11px] font-body mt-4">
                Comissão = receita gerada pelo barbeiro (atendimentos concluídos) × % configurado. "Casa" é o que fica pra barbearia.
              </p>
            </motion.div>
          )}

          {/* Tabela mensal detalhada */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="p-6 rounded-xl bg-[#141414] border border-[#252525]"
          >
            <p className="text-white/40 text-xs font-semibold uppercase tracking-widest font-body mb-5">
              Detalhamento mensal
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-body">
                <thead>
                  <tr className="border-b border-[#252525]">
                    <th className="text-left text-white/30 text-xs pb-3 pr-4">Mês</th>
                    <th className="text-right text-white/30 text-xs pb-3 pr-4">Receita</th>
                    {allCategories.map(cat => (
                      <th key={cat} className="text-right text-white/20 text-xs pb-3 pr-4 hidden md:table-cell">
                        {cat}
                      </th>
                    ))}
                    <th className="text-right text-white/30 text-xs pb-3">vs anterior</th>
                  </tr>
                </thead>
                <tbody>
                  {[...byMonth].reverse().map((m, i) => {
                    const prev = [...byMonth].reverse()[i + 1]
                    const delta = prev ? pct(m.total, prev.total) : null
                    return (
                      <tr key={m.month} className="border-b border-[#1a1a1a] last:border-0">
                        <td className="py-3 pr-4 text-white/70">{m.label}</td>
                        <td className="py-3 pr-4 text-right text-white font-medium">R$ {fmt(m.total)}</td>
                        {allCategories.map(cat => (
                          <td key={cat} className="py-3 pr-4 text-right text-white/40 hidden md:table-cell">
                            {m.byCategory[cat] ? `R$ ${fmt(m.byCategory[cat])}` : '—'}
                          </td>
                        ))}
                        <td className={`py-3 text-right text-xs ${
                          delta === null ? 'text-white/20'
                          : delta >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {delta !== null ? `${delta >= 0 ? '+' : ''}${delta}%` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}
    </div>
  )
}

export default DashboardFinanceiro
