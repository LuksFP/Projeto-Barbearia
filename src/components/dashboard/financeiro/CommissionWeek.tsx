// Financeiro › Comissão da semana (segunda a domingo): quanto cada barbeiro tem
// pra receber e o botão "Marcar como pago". Só dono/admin, plano com comissão.
// Se depois de pagar entrar atendimento novo na semana, mostra a diferença.
import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Check, Copy, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { appointmentRepository } from '@/repositories/appointmentRepository'
import { commissionRepository, type Payout } from '@/repositories/commissionRepository'
import { isRealBarbershopId } from '@/lib/placeOrder'
import { weekEnd, weekLabel, weekStart } from '@/lib/week'

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const r2 = (n: number) => Math.round(n * 100) / 100

interface Barber { id: string; name: string; commissionPercent?: number; active?: boolean }
interface Props {
  barbershopId: string
  barbers: Barber[]
  /** Demo: receita do período por barbeiro, pra estimar a semana */
  demoByBarber?: { barberId: string; total: number; count: number }[]
  demoWeeks?: number
}

interface Row { barber: Barber; revenue: number; count: number; pct: number; amount: number; payout?: Payout }

const CommissionWeek = ({ barbershopId, barbers, demoByBarber = [], demoWeeks = 26 }: Props) => {
  const [offset, setOffset] = useState(-1) // semana passada: é a que se fecha
  const [rows, setRows] = useState<Row[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const start = weekStart(offset)

  const load = useCallback(async () => {
    setRows(null)
    try {
      const demo = !isRealBarbershopId(barbershopId)
      const byBarber: Record<string, { revenue: number; count: number }> = demo
        ? Object.fromEntries(demoByBarber.map(b => [b.barberId, { revenue: r2(b.total / demoWeeks), count: Math.max(1, Math.round(b.count / demoWeeks)) }]))
        : await appointmentRepository.revenueByBarber(barbershopId, start, weekEnd(start))
      const payouts = await commissionRepository.listWeek(barbershopId, start)
      const list = barbers
        .filter(b => byBarber[b.id] || payouts.some(p => p.barberId === b.id))
        .map(b => {
          const v = byBarber[b.id] ?? { revenue: 0, count: 0 }
          const pct = b.commissionPercent ?? 50
          return { barber: b, revenue: r2(v.revenue), count: v.count, pct, amount: r2(v.revenue * pct / 100), payout: payouts.find(p => p.barberId === b.id) }
        })
        .sort((a, b) => b.amount - a.amount)
      setRows(list)
    } catch {
      setRows([])
      toast({ title: 'Não deu pra carregar a comissão da semana', variant: 'destructive' })
    }
  }, [barbershopId, barbers, start, demoByBarber, demoWeeks])

  useEffect(() => { void load() }, [load])

  const pay = async (r: Row) => {
    setBusy(r.barber.id)
    try {
      const payout = await commissionRepository.markPaid(barbershopId, { barberId: r.barber.id, weekStart: start, revenue: r.revenue, amount: r.amount })
      setRows(prev => prev?.map(x => x.barber.id === r.barber.id ? { ...x, payout } : x) ?? prev)
    } catch {
      toast({ title: 'Não deu pra marcar como pago', variant: 'destructive' })
    } finally { setBusy(null) }
  }
  const undo = async (r: Row) => {
    setBusy(r.barber.id)
    try {
      await commissionRepository.unmark(barbershopId, r.barber.id, start)
      setRows(prev => prev?.map(x => x.barber.id === r.barber.id ? { ...x, payout: undefined } : x) ?? prev)
    } catch {
      toast({ title: 'Não deu pra desfazer', variant: 'destructive' })
    } finally { setBusy(null) }
  }

  const copy = async () => {
    if (!rows?.length) return
    const text = [`Comissões da semana ${weekLabel(start)}`, ...rows.map(r => `${r.barber.name}: ${r.count} atend. · ${brl(r.revenue)} × ${r.pct}% = ${brl(r.amount)}${r.payout ? ' (pago)' : ''}`)].join('\n')
    try { await navigator.clipboard.writeText(text); toast({ title: 'Resumo copiado', description: 'Cole no WhatsApp da equipe.' }) }
    catch { toast({ title: 'Não deu pra copiar', variant: 'destructive' }) }
  }

  const total = rows?.reduce((t, r) => t + r.amount, 0) ?? 0
  const paid = rows?.reduce((t, r) => t + (r.payout?.amount ?? 0), 0) ?? 0

  return (
    <div className="p-6 rounded-xl bg-[#141414] border border-amber-500/15">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <p className="text-white/65 text-xs font-semibold uppercase tracking-widest font-body mr-auto">Comissão da semana</p>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Semana anterior" onClick={() => setOffset(o => o - 1)} className="p-1.5 rounded-md border border-[#2a2a2a] text-white/60 hover:text-white"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-white text-sm font-body tabular-nums px-2 min-w-[118px] text-center">{weekLabel(start)}</span>
          <button type="button" aria-label="Próxima semana" onClick={() => setOffset(o => Math.min(0, o + 1))} disabled={offset >= 0} className="p-1.5 rounded-md border border-[#2a2a2a] text-white/60 hover:text-white disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
        </div>
        {!!rows?.length && (
          <button type="button" onClick={() => void copy()} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-body border border-[#2a2a2a] text-white/60 hover:text-white">
            <Copy className="w-3.5 h-3.5" />Copiar resumo
          </button>
        )}
      </div>

      {rows === null ? (
        <Loader2 className="w-4 h-4 animate-spin text-white/40" />
      ) : rows.length === 0 ? (
        <p className="text-white/45 text-sm font-body">Nenhum atendimento concluído nessa semana.</p>
      ) : (
        <>
          <ul className="divide-y divide-white/5">
            {rows.map(r => {
              const diff = r.payout ? r2(r.amount - r.payout.amount) : 0
              return (
                <li key={r.barber.id} className="py-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-body">{r.barber.name}</p>
                    <p className="text-white/50 text-xs font-body tabular-nums">{r.count} atendimentos · {brl(r.revenue)} × {r.pct}%</p>
                  </div>
                  <span className="text-amber-300 text-sm font-semibold font-body tabular-nums">{brl(r.amount)}</span>
                  {r.payout ? (
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs font-body text-emerald-300">
                        <Check className="w-3.5 h-3.5" />Pago {new Date(r.payout.paidAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        {diff !== 0 && <span className="text-amber-200/90"> · {diff > 0 ? `faltam ${brl(diff)}` : `pago ${brl(-diff)} a mais`}</span>}
                      </span>
                      <button type="button" onClick={() => void undo(r)} disabled={busy === r.barber.id} className="text-[11px] text-white/40 hover:text-white/70 font-body underline underline-offset-2">desfazer</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => void pay(r)} disabled={busy === r.barber.id || r.amount <= 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold font-body bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-40">
                      {busy === r.barber.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Marcar como pago
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="flex flex-wrap justify-between gap-2 border-t border-white/10 pt-3 mt-1 text-sm font-body">
            <span className="text-white/60">Total da semana <b className="text-white tabular-nums ml-1">{brl(total)}</b></span>
            <span className="text-white/60">Já pago <b className="text-emerald-300 tabular-nums ml-1">{brl(paid)}</b> · falta <b className="text-white tabular-nums">{brl(Math.max(0, r2(total - paid)))}</b></span>
          </div>
        </>
      )}
    </div>
  )
}

export default CommissionWeek
