// Financeiro: Serviços + Loja juntos (barras empilhadas) e a Loja sozinha
// (venda em barras, lucro em linha, mesma escala em R$ — nada de dois eixos).
// O gráfico só de serviços é o "Serviços por mês" que já existe na página.
//
// Cores validadas no fundo #141414 (scripts/validate_palette.js do skill de
// dataviz, modo escuro): serviços #B08E38, loja #5B8DEF, lucro #3FA58A — todas
// dentro da faixa de luminosidade e separadas pra daltonismo.

import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MonthRevenue } from '@/types/tenant'
import type { StoreMonth } from '@/repositories/productRepository'

const SERVICES = '#B08E38'
const STORE = '#5B8DEF'
const PROFIT = '#3FA58A'
const SURFACE = '#141414'

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const brlK = (n: number) => (n >= 1000 ? `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k` : String(Math.round(n)))

interface Row {
  month: string
  label: string
  services: number
  store: number
  profit: number
}

interface Props {
  servicesByMonth: MonthRevenue[]
  storeByMonth: StoreMonth[]
}

const axisTick = { fill: 'rgba(255,255,255,0.35)', fontSize: 11, fontFamily: 'inherit' }

const Swatch = ({ color, line = false }: { color: string; line?: boolean }) => (
  <span aria-hidden className={line ? 'inline-block w-3.5 h-0.5 rounded' : 'inline-block w-2.5 h-2.5 rounded-sm'} style={{ backgroundColor: color }} />
)

const TooltipBox = ({ active, payload, label, rows, mode }: {
  active?: boolean
  payload?: Array<{ payload: Row }>
  label?: string
  rows: Row[]
  mode: 'both' | 'store'
}) => {
  if (!active || !payload?.length) return null
  const r = payload[0].payload
  const hasProfit = mode === 'store' && rows.some(x => x.profit > 0)
  return (
    <div className="rounded-lg border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-xs font-body shadow-lg min-w-[150px]">
      <p className="text-white/50 mb-1.5">{label}</p>
      {mode === 'both' ? (
        <>
          <p className="flex items-center gap-2 text-white/80"><Swatch color={SERVICES} />Serviços <span className="ml-auto tabular-nums text-white">{brl(r.services)}</span></p>
          <p className="flex items-center gap-2 text-white/80 mt-1"><Swatch color={STORE} />Loja <span className="ml-auto tabular-nums text-white">{brl(r.store)}</span></p>
          <p className="flex items-center gap-2 text-white/50 mt-1.5 pt-1.5 border-t border-[#262626]">Total <span className="ml-auto tabular-nums text-white font-semibold">{brl(r.services + r.store)}</span></p>
        </>
      ) : (
        <>
          <p className="flex items-center gap-2 text-white/80"><Swatch color={STORE} />Vendido <span className="ml-auto tabular-nums text-white">{brl(r.store)}</span></p>
          {hasProfit && <p className="flex items-center gap-2 text-white/80 mt-1"><Swatch color={PROFIT} line />Lucro <span className="ml-auto tabular-nums text-white">{brl(r.profit)}</span></p>}
        </>
      )}
    </div>
  )
}

const StoreAndServicesCharts = ({ servicesByMonth, storeByMonth }: Props) => {
  const storeMap = new Map(storeByMonth.map(s => [s.month, s]))
  // Meses: os dos serviços + algum mês que só teve loja
  const months = [...new Set([...servicesByMonth.map(m => m.month), ...storeByMonth.map(s => s.month)])].sort()
  const label = (month: string) => {
    const svc = servicesByMonth.find(m => m.month === month)
    if (svc) return svc.label
    const d = new Date(`${month}-15T12:00:00`)
    const l = d.toLocaleDateString('pt-BR', { month: 'long' })
    return l.charAt(0).toUpperCase() + l.slice(1)
  }
  const rows: Row[] = months.map(month => ({
    month,
    label: label(month),
    services: servicesByMonth.find(m => m.month === month)?.total ?? 0,
    store: storeMap.get(month)?.revenue ?? 0,
    profit: storeMap.get(month)?.profit ?? 0,
  }))

  const totalServices = rows.reduce((a, r) => a + r.services, 0)
  const totalStore = rows.reduce((a, r) => a + r.store, 0)
  const total = totalServices + totalStore
  const totalProfit = rows.reduce((a, r) => a + r.profit, 0)
  const storeShare = total > 0 ? Math.round((totalStore / total) * 100) : 0
  const hasCost = storeByMonth.some(s => s.hasCost)
  const storeItems = storeByMonth.reduce((a, s) => a + s.items, 0)

  if (rows.length === 0) return null

  return (
    <>
      {/* Os dois juntos */}
      <section className="p-6 rounded-xl bg-[#141414] border border-[#252525]" aria-labelledby="fin-both">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-1">
          <h3 id="fin-both" className="text-white/40 text-xs font-semibold uppercase tracking-widest font-body">Serviços + Loja</h3>
          <p className="text-white text-sm font-body sm:ml-auto">
            <span className="font-heading text-xl tracking-wide">{brl(total)}</span>
            <span className="text-white/40"> no período</span>
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 mb-5 text-xs font-body text-white/60">
          <li className="flex items-center gap-1.5"><Swatch color={SERVICES} />Serviços <span className="text-white tabular-nums">{brl(totalServices)}</span></li>
          <li className="flex items-center gap-1.5"><Swatch color={STORE} />Loja <span className="text-white tabular-nums">{brl(totalStore)}</span><span className="text-white/35">({storeShare}% do total)</span></li>
        </ul>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={rows} barSize={28} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={v => String(v).slice(0, 3)} />
            <YAxis tick={{ ...axisTick, fill: 'rgba(255,255,255,0.22)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={brlK} width={38} tickCount={5} allowDecimals={false} />
            <Tooltip content={<TooltipBox rows={rows} mode="both" />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            {/* contorno da cor do fundo = 2px de respiro entre os segmentos */}
            <Bar dataKey="services" name="Serviços" stackId="a" fill={SERVICES} stroke={SURFACE} strokeWidth={2} />
            <Bar dataKey="store" name="Loja" stackId="a" fill={STORE} stroke={SURFACE} strokeWidth={2} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Só a loja */}
      <section className="p-6 rounded-xl bg-[#141414] border border-[#252525]" aria-labelledby="fin-store">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-1">
          <h3 id="fin-store" className="text-white/40 text-xs font-semibold uppercase tracking-widest font-body">Loja por mês</h3>
          {totalStore > 0 && (
            <p className="text-white/40 text-xs font-body sm:ml-auto">
              {storeItems} {storeItems === 1 ? 'item vendido' : 'itens vendidos'}
            </p>
          )}
        </div>
        {totalStore === 0 ? (
          <p className="text-white/35 text-sm font-body py-8">
            Nenhuma venda da loja nesse período.{' '}
            <Link to="/dashboard/loja" className="text-amber-300 underline underline-offset-4 decoration-amber-400/40">Abrir a Loja</Link>
          </p>
        ) : (
          <>
            <ul className="flex flex-wrap gap-x-5 gap-y-1 mb-5 text-xs font-body text-white/60">
              <li className="flex items-center gap-1.5"><Swatch color={STORE} />Vendido <span className="text-white tabular-nums">{brl(totalStore)}</span></li>
              {hasCost && (
                <li className="flex items-center gap-1.5"><Swatch color={PROFIT} line />Lucro <span className="text-white tabular-nums">{brl(totalProfit)}</span></li>
              )}
            </ul>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={v => String(v).slice(0, 3)} />
                <YAxis tick={{ ...axisTick, fill: 'rgba(255,255,255,0.22)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={brlK} width={38} tickCount={5} allowDecimals={false} />
                <Tooltip content={<TooltipBox rows={rows} mode="store" />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Bar dataKey="store" name="Vendido" fill={STORE} barSize={24} radius={[4, 4, 0, 0]} />
                {hasCost && (
                  <Line dataKey="profit" name="Lucro" type="monotone" stroke={PROFIT} strokeWidth={2}
                    dot={{ r: 4, fill: PROFIT, stroke: SURFACE, strokeWidth: 2 }} activeDot={{ r: 5, fill: PROFIT, stroke: SURFACE, strokeWidth: 2 }} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
            {!hasCost && (
              <p className="text-white/30 text-[11px] font-body mt-2">Preencha “quanto você pagou” nos produtos pra ver o lucro aqui.</p>
            )}
          </>
        )}
      </section>
    </>
  )
}

export default StoreAndServicesCharts
