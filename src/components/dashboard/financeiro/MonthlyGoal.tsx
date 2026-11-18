// Financeiro › Meta do mês: o dono define quanto quer faturar e acompanha a
// barra. Mostra a projeção no ritmo atual e quantos atendimentos faltam
// (pelo ticket médio). Faturamento = serviços + loja do mês corrente.
import { useState } from 'react'
import { Target, Pencil, Check, X } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const brl0 = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

interface Props {
  goal: number | null
  revenue: number        // faturado no mês até agora
  avgTicket: number
  canEdit: boolean
  onSave: (goal: number | null) => Promise<void>
}

const MonthlyGoal = ({ goal, revenue, avgTicket, canEdit, onSave }: Props) => {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(goal ? String(goal) : '')
  const [saving, setSaving] = useState(false)

  const now = new Date()
  const day = now.getDate()
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const month = MONTHS[now.getMonth()]

  if (!goal && !canEdit) return null

  const save = async (v: number | null) => {
    setSaving(true)
    try { await onSave(v); setEditing(false) }
    catch { toast({ title: 'Não deu pra salvar a meta', variant: 'destructive' }) }
    finally { setSaving(false) }
  }
  const parsed = Number(value.replace(/\./g, '').replace(',', '.'))

  const editor = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-white/60 text-sm font-body">R$</span>
      <input autoFocus value={value} onChange={e => setValue(e.target.value.replace(/[^\d.,]/g, ''))} inputMode="decimal" placeholder="15000"
        aria-label={`Meta de ${month}`}
        onKeyDown={e => { if (e.key === 'Enter' && parsed > 0) void save(parsed); if (e.key === 'Escape') setEditing(false) }}
        className="w-36 bg-[#101010] border border-[#262626] rounded-md px-3 py-2 text-white text-base sm:text-sm font-body tabular-nums focus:outline-none focus:border-amber-500/50" />
      <button type="button" onClick={() => void save(parsed)} disabled={!(parsed > 0) || saving}
        className="flex items-center gap-1 px-3 py-2 rounded-md text-sm font-semibold font-body bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-40">
        <Check className="w-4 h-4" />Salvar
      </button>
      {goal && <button type="button" onClick={() => void save(null)} disabled={saving} className="text-xs text-white/45 hover:text-red-300 font-body">tirar meta</button>}
      <button type="button" aria-label="Cancelar" onClick={() => setEditing(false)} className="p-2 text-white/45 hover:text-white"><X className="w-4 h-4" /></button>
    </div>
  )

  if (!goal) {
    return (
      <div className="p-5 rounded-xl border border-dashed border-amber-500/25 bg-amber-500/[0.03] flex flex-wrap items-center gap-4">
        <Target className="w-5 h-5 text-amber-400" />
        <div className="flex-1 min-w-[200px]">
          <p className="text-white text-sm font-semibold font-body">Meta de {month}</p>
          <p className="text-white/55 text-xs font-body">Defina quanto quer faturar no mês e acompanhe a barra aqui.</p>
        </div>
        {editing ? editor : (
          <button type="button" onClick={() => setEditing(true)} className="px-4 py-2 rounded-md text-sm font-semibold font-body bg-amber-500 text-black hover:bg-amber-400">Definir meta</button>
        )}
      </div>
    )
  }

  const pct = Math.min(100, Math.round((revenue / goal) * 100))
  const projected = day > 0 ? (revenue / day) * days : revenue
  const missing = Math.max(0, goal - revenue)
  const visits = avgTicket > 0 ? Math.ceil(missing / avgTicket) : null
  const onTrack = projected >= goal
  // Onde deveria estar hoje se o mês fosse linear
  const pace = Math.round((day / days) * 100)

  return (
    <div className="p-6 rounded-xl bg-[#141414] border border-[#252525]">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Target className="w-4 h-4 text-amber-400" />
        <p className="text-white/65 text-xs font-semibold uppercase tracking-widest font-body mr-auto">Meta de {month}</p>
        {canEdit && !editing && (
          <button type="button" onClick={() => { setValue(String(goal)); setEditing(true) }} className="flex items-center gap-1 text-xs text-white/50 hover:text-white font-body">
            <Pencil className="w-3.5 h-3.5" />Mudar meta
          </button>
        )}
      </div>
      {editing ? editor : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-white text-2xl font-semibold font-body tabular-nums">{brl0(revenue)}</p>
            <p className="text-white/55 text-sm font-body">de {brl0(goal)} · {pct}%</p>
          </div>
          <div className="relative mt-3 h-3 rounded-full bg-white/[0.06] overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Meta de ${month}`}>
            <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
            {/* marca de onde o mês "deveria" estar hoje */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-white/50" style={{ left: `${pace}%` }} title={`Dia ${day} de ${days}`} />
          </div>
          <p className="text-white/45 text-[11px] font-body mt-1.5">Traço branco: dia {day} de {days} do mês</p>
          <p className={`text-sm font-body mt-3 ${revenue >= goal ? 'text-emerald-300' : onTrack ? 'text-white/75' : 'text-amber-200'}`}>
            {revenue >= goal
              ? `Meta batida! ${brl0(revenue - goal)} acima.`
              : <>No ritmo atual o mês fecha em <b className="tabular-nums">{brl0(projected)}</b>
                {onTrack ? ', acima da meta.' : <>. Faltam <b className="tabular-nums">{brl0(missing)}</b>{visits ? <> (uns {visits} atendimentos)</> : null}.</>}</>}
          </p>
        </>
      )}
    </div>
  )
}

export default MonthlyGoal
