import { useEffect, useState } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import { appointmentRepository } from '@/repositories/appointmentRepository'
import { isDemoMode, getDemoPlan, getDemoFinancials } from '@/lib/demo'
import { toast } from '@/hooks/use-toast'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  TrendingUp, TrendingDown, DollarSign, Scissors, Users,
  Download, Loader2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import type { MonthRevenue } from '@/types/tenant'

type Period = 3 | 6 | 12

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
  const { barbershop } = useTenant()
  const [period, setPeriod] = useState<Period>(6)
  const [loading, setLoading] = useState(true)
  const [byMonth, setByMonth] = useState<MonthRevenue[]>([])
  const [byBarber, setByBarber] = useState<{ barberId: string; barberName: string; total: number; count: number }[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [avgTicket, setAvgTicket] = useState(0)

  useEffect(() => {
    if (isDemoMode()) {
      const plan = getDemoPlan()
      const months = plan ? getDemoFinancials(plan) : []
      setByMonth(months)
      const total = months.reduce((s, m) => s + m.total, 0)
      setTotalRevenue(total)
      setTotalCount(months.reduce((s, m) => s + Object.values(m.byCategory).reduce((a, b) => a + b, 0) / 40, 0))
      setAvgTicket(total > 0 ? total / Math.max(1, months.length * 3) : 0)
      setByBarber([])
      setLoading(false)
      return
    }
    if (!barbershop) return
    setLoading(true)
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
      .finally(() => setLoading(false))
  }, [barbershop?.id, period]) // eslint-disable-line react-hooks/exhaustive-deps

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
        <div className="flex items-center justify-center py-20 text-white/30">
          <Loader2 className="w-6 h-6 animate-spin mr-3" />
          <span className="font-body text-sm">Carregando dados...</span>
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
              Receita mensal
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
