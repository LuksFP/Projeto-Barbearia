// Financeiro › Faturamento x Lucro.
// Resumo do período, gráfico mês a mês (barras: faturamento e custos; linha:
// lucro — um eixo só, tudo em R$) e "para onde foi o dinheiro" no mês
// escolhido (toque numa barra). Cores validadas no skill dataviz contra o
// fundo #141414: faturamento #B08E38, custos #9A7FE0, lucro #2FA7A0.
import { useState } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { categoryLabel, type ProfitMonth } from '@/lib/profit'

const C = { revenue: '#B08E38', costs: '#9A7FE0', profit: '#2FA7A0' }
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const brl0 = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const kfmt = (n: number) => (Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(Math.abs(n) >= 10000 ? 0 : 1).replace('.', ',')}k` : String(Math.round(n)))

interface TipProps { active?: boolean; payload?: { payload: ProfitMonth }[] }
const Tip = ({ active, payload }: TipProps) => {
  const m = active ? payload?.[0]?.payload : undefined
  if (!m) return null
  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] px-3 py-2 text-xs font-body shadow-xl min-w-[180px]">
      <p className="text-white/70 mb-1.5">{m.label}</p>
      {([['Faturamento', m.revenue, C.revenue], ['Custos', m.costs, C.costs], ['Lucro', m.profit, C.profit]] as const).map(([k, v, c]) => (
        <p key={k} className="flex items-center gap-2 py-0.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
          <span className="text-white/60 flex-1">{k}</span>
          <span className="text-white tabular-nums">{brl(v)}</span>
        </p>
      ))}
    </div>
  )
}

interface Props {
  months: ProfitMonth[]
  period: number
  showCommission: boolean
}

const ProfitSection = ({ months, period, showCommission }: Props) => {
  const [picked, setPicked] = useState<string | null>(null)
  const sel = months.find(m => m.month === picked) ?? months[months.length - 1]
  const sum = (k: keyof Pick<ProfitMonth, 'revenue' | 'costs' | 'profit'>) => months.reduce((t, m) => t + m[k], 0)
  const revenue = sum('revenue'), costs = sum('costs'), profit = sum('profit')
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : null

  if (!sel) return null

  const breakdown = [
    ...(showCommission ? [{ k: 'Comissões dos barbeiros', v: sel.commission }] : []),
    { k: 'Custo dos produtos vendidos', v: sel.productCost },
    ...Object.entries(sel.byCategory).map(([c, v]) => ({ k: categoryLabel(c), v })),
  ].filter(x => x.v > 0).sort((a, b) => b.v - a.v)

  return (
    <div className="p-6 rounded-xl bg-[#141414] border border-[#252525]">
      <p className="text-white/65 text-xs font-semibold uppercase tracking-widest font-body mb-4">Faturamento x lucro</p>

      {/* Resumo do período */}
      <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-6">
        <div>
          <p className="text-white/55 text-xs font-body">Faturamento ({period}m)</p>
          <p className="text-white text-lg sm:text-2xl font-semibold font-body tabular-nums mt-1">{brl0(revenue)}</p>
        </div>
        <div>
          <p className="text-white/55 text-xs font-body">Custos</p>
          <p className="text-white text-lg sm:text-2xl font-semibold font-body tabular-nums mt-1">{brl0(costs)}</p>
        </div>
        <div>
          <p className="text-white/55 text-xs font-body">Lucro{margin !== null ? ` · ${margin}% de margem` : ''}</p>
          <p className={`text-lg sm:text-2xl font-semibold font-body tabular-nums mt-1 ${profit < 0 ? 'text-red-300' : 'text-white'}`}>{brl0(profit)}</p>
        </div>
      </div>

      {/* Legenda (identidade não fica só na cor: nome ao lado de cada amostra) */}
      <div className="flex flex-wrap gap-4 mb-2 text-xs font-body text-white/65">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: C.revenue }} />Faturamento</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ background: C.costs }} />Custos</span>
        <span className="flex items-center gap-1.5"><span className="w-4 h-0.5 rounded" style={{ background: C.profit }} />Lucro</span>
      </div>
      <div className="h-[240px] -ml-2" role="img" aria-label="Faturamento, custos e lucro por mês">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={months} barGap={2} barCategoryGap="28%" margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            onClick={(s: { activeLabel?: string | number } | null) => {
              const m = months.find(x => x.label === s?.activeLabel)
              if (m) setPicked(m.month)
            }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={(l: string) => l.slice(0, 3)} />
            <YAxis tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} axisLine={false} tickLine={false} width={44} tickFormatter={kfmt} />
            <Tooltip content={<Tip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="revenue" name="Faturamento" fill={C.revenue} radius={[4, 4, 0, 0]} maxBarSize={22} cursor="pointer" />
            <Bar dataKey="costs" name="Custos" fill={C.costs} radius={[4, 4, 0, 0]} maxBarSize={22} cursor="pointer" />
            <Line dataKey="profit" name="Lucro" type="monotone" stroke={C.profit} strokeWidth={2}
              dot={{ r: 4, fill: C.profit, stroke: '#141414', strokeWidth: 2 }} activeDot={{ r: 5, stroke: '#141414', strokeWidth: 2 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Para onde foi o dinheiro no mês escolhido */}
      <div className="mt-5 border-t border-white/5 pt-4">
        <div className="flex flex-wrap items-baseline gap-x-3 mb-3">
          <p className="text-white text-sm font-semibold font-body mr-auto">{sel.label}: para onde foi o dinheiro</p>
          <p className="text-white/45 text-xs font-body">toque numa barra pra ver outro mês</p>
        </div>
        <dl className="grid gap-x-8 gap-y-1.5 sm:grid-cols-2 text-sm font-body">
          <div className="flex justify-between"><dt className="text-white/65">Serviços</dt><dd className="text-white tabular-nums">{brl(sel.services)}</dd></div>
          <div className="flex justify-between"><dt className="text-white/65">Loja</dt><dd className="text-white tabular-nums">{brl(sel.store)}</dd></div>
          {breakdown.map(b => (
            <div key={b.k} className="flex justify-between"><dt className="text-white/65">− {b.k}</dt><dd className="text-white/85 tabular-nums">{brl(b.v)}</dd></div>
          ))}
          <div className="flex justify-between sm:col-span-2 border-t border-white/10 pt-2 mt-1">
            <dt className="text-white font-semibold">Lucro do mês</dt>
            <dd className={`font-semibold tabular-nums ${sel.profit < 0 ? 'text-red-300' : 'text-white'}`}>{brl(sel.profit)}</dd>
          </div>
        </dl>
        {sel.expenses === 0 && (
          <p className="text-white/45 text-xs font-body mt-3">Nenhuma despesa lançada nesse mês: o lucro está sem aluguel, contas etc. Lance abaixo.</p>
        )}
      </div>
    </div>
  )
}

export default ProfitSection
