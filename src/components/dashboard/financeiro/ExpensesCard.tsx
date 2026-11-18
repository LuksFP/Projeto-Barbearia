// Financeiro › Despesas: o dono lança o que gastou (aluguel, luz, água,
// insumos…). "Todo mês" lança uma vez só e conta em todos os meses seguintes
// até encerrar. A lista mostra o mês escolhido.
import { useMemo, useState } from 'react'
import { Plus, Trash2, Repeat, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { errorText } from '@/lib/errors'
import { EXPENSE_CATEGORIES, categoryLabel, expenseHitsMonth, type Expense, type ExpenseCategory } from '@/lib/profit'
import type { ExpenseInput } from '@/repositories/expenseRepository'

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const monthName = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]}/${ym.slice(2, 4)}`

interface Props {
  expenses: Expense[]
  months: { month: string; label: string }[]
  onCreate: (input: ExpenseInput) => Promise<void>
  onRemove: (id: string) => Promise<void>
  onEndRecurring: (id: string) => Promise<void>
}

const ExpensesCard = ({ expenses, months, onCreate, onRemove, onEndRecurring }: Props) => {
  const today = new Date().toLocaleDateString('sv-SE')
  const [month, setMonth] = useState(today.slice(0, 7))
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('contas')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [recurring, setRecurring] = useState(false)
  const [saving, setSaving] = useState(false)
  const [armed, setArmed] = useState<string | null>(null)

  const value = Number(amount.replace(/\./g, '').replace(',', '.'))
  const canSave = description.trim().length > 0 && value > 0 && value < 1_000_000 && !!date && !saving

  const inMonth = useMemo(
    () => expenses.filter(e => expenseHitsMonth(e, month)).sort((a, b) => Number(b.recurring) - Number(a.recurring) || b.amount - a.amount),
    [expenses, month],
  )
  const monthTotal = inMonth.reduce((t, e) => t + e.amount, 0)

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      await onCreate({ description: description.trim(), category, amount: Math.round(value * 100) / 100, date, recurring })
      setDescription(''); setAmount(''); setRecurring(false)
      setMonth(date.slice(0, 7))
    } catch (err: unknown) {
      toast({ title: 'Não deu pra salvar a despesa', description: errorText(err) || undefined, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const act = async (e: Expense, kind: 'remove' | 'end') => {
    const key = `${kind}-${e.id}`
    if (armed !== key) { setArmed(key); return }
    setArmed(null)
    try {
      if (kind === 'remove') await onRemove(e.id)
      else await onEndRecurring(e.id)
    } catch (err: unknown) {
      toast({ title: 'Não deu certo', description: errorText(err) || undefined, variant: 'destructive' })
    }
  }

  const field = 'w-full bg-[#101010] border border-[#262626] rounded-md px-3 py-2.5 text-white text-base sm:text-sm font-body placeholder:text-white/35 focus:outline-none focus:border-amber-500/50'
  const monthOptions = [...new Set([today.slice(0, 7), ...months.map(m => m.month)])].sort().reverse()

  return (
    <div className="p-6 rounded-xl bg-[#141414] border border-[#252525]">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-5">
        <p className="text-white/65 text-xs font-semibold uppercase tracking-widest font-body mr-auto">Despesas</p>
        <p className="text-white/50 text-xs font-body">Aluguel, luz, água, produtos… tudo que saiu do caixa</p>
      </div>

      {/* Lançar */}
      <div className="grid gap-3 sm:grid-cols-[1fr_140px_150px]">
        <div>
          <label htmlFor="exp-desc" className="block text-white/55 text-xs font-body mb-1">O que foi</label>
          <input id="exp-desc" value={description} onChange={e => setDescription(e.target.value.slice(0, 80))}
            placeholder="Ex.: Conta de luz" className={field} onKeyDown={e => { if (e.key === 'Enter') void save() }} />
        </div>
        <div>
          <label htmlFor="exp-amount" className="block text-white/55 text-xs font-body mb-1">Valor (R$)</label>
          <input id="exp-amount" value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
            inputMode="decimal" placeholder="0,00" className={`${field} tabular-nums`} onKeyDown={e => { if (e.key === 'Enter') void save() }} />
        </div>
        <div>
          <label htmlFor="exp-date" className="block text-white/55 text-xs font-body mb-1">Data</label>
          <input id="exp-date" type="date" value={date} onChange={e => setDate(e.target.value)} className={field} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Tipo de despesa">
        {EXPENSE_CATEGORIES.map(c => (
          <button key={c.id} type="button" role="radio" aria-checked={category === c.id} title={c.hint}
            onClick={() => setCategory(c.id)}
            className={`px-2.5 py-1 rounded-full text-xs font-body border transition-colors ${category === c.id ? 'bg-amber-500/15 border-amber-500/50 text-amber-300' : 'border-[#2a2a2a] text-white/60 hover:text-white'}`}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-body text-white/75 cursor-pointer select-none">
          <input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} className="w-4 h-4 accent-amber-500" />
          Repete todo mês <span className="text-white/45 text-xs">(aluguel, internet…)</span>
        </label>
        <button type="button" onClick={() => void save()} disabled={!canSave}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold font-body bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-40">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}Lançar despesa
        </button>
      </div>

      {/* Lista do mês */}
      <div className="mt-6 border-t border-white/5 pt-4">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <label htmlFor="exp-month" className="text-white/55 text-xs font-body">Mês</label>
          <select id="exp-month" value={month} onChange={e => setMonth(e.target.value)}
            className="bg-[#101010] border border-[#262626] rounded-md px-2 py-1 text-white text-sm font-body">
            {monthOptions.map(m => <option key={m} value={m}>{monthName(m)}</option>)}
          </select>
          <p className="ml-auto text-sm font-body text-white/60">Total do mês <span className="text-white font-semibold tabular-nums ml-1">{brl(monthTotal)}</span></p>
        </div>
        {inMonth.length === 0 ? (
          <p className="text-white/45 text-sm font-body py-4">Nenhuma despesa lançada em {monthName(month)}.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {inMonth.map(e => (
              <li key={e.id} className="py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="min-w-0 flex-1">
                  <p className="text-white/90 text-sm font-body truncate">{e.description}</p>
                  <p className="text-white/45 text-xs font-body">
                    {categoryLabel(e.category)}
                    {e.recurring
                      ? <> · <Repeat className="inline w-3 h-3 -mt-0.5" /> todo mês desde {monthName(e.date.slice(0, 7))}{e.endsOn ? ` até ${monthName(e.endsOn.slice(0, 7))} (exclusive)` : ''}</>
                      : <> · {new Date(e.date + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</>}
                  </p>
                </div>
                <span className="text-white text-sm font-semibold font-body tabular-nums">{brl(e.amount)}</span>
                {e.recurring && !e.endsOn && (
                  <button type="button" onClick={() => void act(e, 'end')} onBlur={() => setArmed(null)}
                    className={`px-2 py-1 rounded-md text-xs font-body border ${armed === `end-${e.id}` ? 'border-amber-500/50 text-amber-300 bg-amber-500/10' : 'border-[#2a2a2a] text-white/50 hover:text-white'}`}>
                    {armed === `end-${e.id}` ? 'Toque de novo: para no mês que vem' : 'Encerrar'}
                  </button>
                )}
                <button type="button" onClick={() => void act(e, 'remove')} onBlur={() => setArmed(null)}
                  aria-label={`Apagar ${e.description}`}
                  className={`px-2 py-1 rounded-md text-xs font-body border flex items-center gap-1 ${armed === `remove-${e.id}` ? 'border-red-500/50 text-red-300 bg-red-500/10' : 'border-[#2a2a2a] text-white/45 hover:text-red-300'}`}>
                  <Trash2 className="w-3.5 h-3.5" />{armed === `remove-${e.id}` ? (e.recurring ? 'Apaga de todos os meses' : 'Apagar?') : ''}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default ExpensesCard
