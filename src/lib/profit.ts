// Faturamento x lucro do Financeiro.
//   faturamento = serviços (concluídos + faltas pagas online) + loja
//   custos      = custo dos produtos vendidos + comissões + despesas lançadas
//   lucro       = faturamento − custos
// Despesa fixa conta todo mês a partir do mês de `date` até `endsOn` (exclusivo).

export type ExpenseCategory = 'aluguel' | 'contas' | 'insumos' | 'salarios' | 'marketing' | 'impostos' | 'manutencao' | 'outros'

export const EXPENSE_CATEGORIES: { id: ExpenseCategory; label: string; hint: string }[] = [
  { id: 'aluguel', label: 'Aluguel', hint: 'Aluguel, condomínio' },
  { id: 'contas', label: 'Contas', hint: 'Luz, água, internet, telefone' },
  { id: 'insumos', label: 'Insumos', hint: 'Lâminas, toalhas, produtos de uso' },
  { id: 'salarios', label: 'Salários', hint: 'Fixo de recepção, limpeza…' },
  { id: 'marketing', label: 'Marketing', hint: 'Anúncios, panfletos' },
  { id: 'impostos', label: 'Impostos', hint: 'MEI/DAS, taxas' },
  { id: 'manutencao', label: 'Manutenção', hint: 'Cadeira, máquina, reforma' },
  { id: 'outros', label: 'Outros', hint: '' },
]

export const categoryLabel = (c: string) => EXPENSE_CATEGORIES.find(x => x.id === c)?.label ?? 'Outros'

export interface Expense {
  id: string
  description: string
  category: ExpenseCategory
  amount: number
  date: string            // 'YYYY-MM-DD'
  recurring: boolean
  endsOn: string | null   // 'YYYY-MM-DD' (exclusivo) — só fixa
}

const ym = (d: string) => d.slice(0, 7)

/** A despesa conta no mês 'YYYY-MM'? */
export function expenseHitsMonth(e: Expense, month: string): boolean {
  if (!e.recurring) return ym(e.date) === month
  if (month < ym(e.date)) return false
  return !e.endsOn || month < ym(e.endsOn)
}

export interface ProfitMonth {
  month: string
  label: string
  revenue: number        // serviços + loja
  services: number
  store: number
  productCost: number
  commission: number
  expenses: number
  byCategory: Record<string, number>   // despesas lançadas por categoria
  costs: number          // productCost + commission + expenses
  profit: number
}

export function buildProfitMonths(input: {
  months: { month: string; label: string; total: number }[]
  store: { month: string; revenue: number; profit: number; hasCost: boolean }[]
  expenses: Expense[]
  commissionByMonth: Record<string, number>
}): ProfitMonth[] {
  return input.months.map(m => {
    const st = input.store.find(s => s.month === m.month)
    const store = st?.revenue ?? 0
    // Sem custo cadastrado não dá pra saber: conta 0 (o lucro da loja fica otimista)
    const productCost = st && st.hasCost ? Math.max(0, st.revenue - st.profit) : 0
    const commission = input.commissionByMonth[m.month] ?? 0
    const byCategory: Record<string, number> = {}
    for (const e of input.expenses) {
      if (expenseHitsMonth(e, m.month)) byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount
    }
    const expenses = Object.values(byCategory).reduce((a, b) => a + b, 0)
    const revenue = m.total + store
    const costs = productCost + commission + expenses
    const r2 = (n: number) => Math.round(n * 100) / 100
    return {
      month: m.month, label: m.label,
      revenue: r2(revenue), services: r2(m.total), store: r2(store),
      productCost: r2(productCost), commission: r2(commission), expenses: r2(expenses),
      byCategory, costs: r2(costs), profit: r2(revenue - costs),
    }
  })
}
