// Despesas da barbearia (Financeiro). Real: tabela expenses (só dono/admin,
// RLS). Demo (id não é uuid): localStorage, com despesas de exemplo.
import { supabase } from '@/lib/supabase'
import { isRealBarbershopId } from '@/lib/placeOrder'
import type { Expense, ExpenseCategory } from '@/lib/profit'

export interface ExpenseInput {
  description: string
  category: ExpenseCategory
  amount: number
  date: string
  recurring: boolean
}

const CATS: ExpenseCategory[] = ['aluguel', 'contas', 'insumos', 'salarios', 'marketing', 'impostos', 'manutencao', 'outros']
const asCategory = (c: string): ExpenseCategory => (CATS as string[]).includes(c) ? c as ExpenseCategory : 'outros'

// ── Demo ───────────────────────────────────────────────────────────────────
const demoKey = (bsId: string) => `barberos:despesas:${bsId}`
const monthsAgo = (n: number, day = 5) => {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - n); d.setDate(day)
  return d.toLocaleDateString('sv-SE')
}
function demoSeed(): Expense[] {
  return [
    { id: 'd-1', description: 'Aluguel do salão', category: 'aluguel', amount: 2800, date: monthsAgo(11, 10), recurring: true, endsOn: null },
    { id: 'd-2', description: 'Luz', category: 'contas', amount: 420, date: monthsAgo(11, 15), recurring: true, endsOn: null },
    { id: 'd-3', description: 'Internet', category: 'contas', amount: 119.9, date: monthsAgo(11, 20), recurring: true, endsOn: null },
    { id: 'd-4', description: 'DAS do MEI', category: 'impostos', amount: 76.9, date: monthsAgo(11, 20), recurring: true, endsOn: null },
    ...Array.from({ length: 12 }, (_, i): Expense => ({
      id: `d-ins-${i}`, description: 'Lâminas e toalhas', category: 'insumos',
      amount: 280 + ((i * 37) % 120), date: monthsAgo(i, 8), recurring: false, endsOn: null,
    })),
    { id: 'd-5', description: 'Anúncio no Instagram', category: 'marketing', amount: 300, date: monthsAgo(1, 3), recurring: false, endsOn: null },
    { id: 'd-6', description: 'Conserto da máquina', category: 'manutencao', amount: 180, date: monthsAgo(2, 22), recurring: false, endsOn: null },
  ]
}
function demoLoad(bsId: string): Expense[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(demoKey(bsId)) ?? 'null')
    if (Array.isArray(raw)) return raw as Expense[]
  } catch { /* storage bloqueado: usa o exemplo */ }
  const seed = demoSeed()
  demoSave(bsId, seed)
  return seed
}
function demoSave(bsId: string, list: Expense[]) {
  try { localStorage.setItem(demoKey(bsId), JSON.stringify(list)) } catch { /* ignora */ }
}

// ── Repositório ────────────────────────────────────────────────────────────
interface Row { id: string; description: string; category: string; amount: number | string; date: string; recurring: boolean; ends_on: string | null }
const fromRow = (r: Row): Expense => ({
  id: r.id, description: r.description, category: asCategory(r.category), amount: Number(r.amount),
  date: r.date, recurring: r.recurring, endsOn: r.ends_on,
})

export const expenseRepository = {
  /** Avulsas a partir de `from` + todas as fixas que ainda valem nesse período. */
  async list(barbershopId: string, from: string): Promise<Expense[]> {
    if (!isRealBarbershopId(barbershopId)) {
      return demoLoad(barbershopId).filter(e => e.recurring ? (!e.endsOn || e.endsOn > from) : e.date >= from)
    }
    const { data, error } = await supabase
      .from('expenses')
      .select('id, description, category, amount, date, recurring, ends_on')
      .eq('barbershop_id', barbershopId)
      .or(`date.gte.${from},and(recurring.eq.true,or(ends_on.is.null,ends_on.gt.${from}))`)
      .order('date', { ascending: false })
    if (error) throw error
    return (data ?? []).map(fromRow)
  },

  async create(barbershopId: string, input: ExpenseInput): Promise<Expense> {
    if (!isRealBarbershopId(barbershopId)) {
      const e: Expense = { id: `d-${crypto.randomUUID()}`, ...input, endsOn: null }
      demoSave(barbershopId, [e, ...demoLoad(barbershopId)])
      return e
    }
    const { data, error } = await supabase
      .from('expenses')
      .insert({ barbershop_id: barbershopId, ...input })
      .select('id, description, category, amount, date, recurring, ends_on')
      .single()
    if (error) throw error
    return fromRow(data)
  },

  async remove(barbershopId: string, id: string): Promise<void> {
    if (!isRealBarbershopId(barbershopId)) {
      demoSave(barbershopId, demoLoad(barbershopId).filter(e => e.id !== id))
      return
    }
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) throw error
  },

  /** Fixa para de contar a partir do mês que vem (o deste mês continua). */
  async endRecurring(barbershopId: string, id: string): Promise<string> {
    const next = new Date(); next.setDate(1); next.setMonth(next.getMonth() + 1)
    const endsOn = next.toLocaleDateString('sv-SE')
    if (!isRealBarbershopId(barbershopId)) {
      demoSave(barbershopId, demoLoad(barbershopId).map(e => e.id === id ? { ...e, endsOn } : e))
      return endsOn
    }
    const { error } = await supabase.from('expenses').update({ ends_on: endsOn }).eq('id', id)
    if (error) throw error
    return endsOn
  },
}
