// Datas do calendário mensal da Agenda. Tudo em horário local:
// toISOString() usa UTC e depois das 21h no Brasil já cairia no dia seguinte.
const pad = (n: number) => String(n).padStart(2, '0')

export const localISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** `month` no formato 'YYYY-MM'. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  return localISO(new Date(y, m - 1 + delta, 1)).slice(0, 7)
}

/** Semanas de segunda a domingo; `null` são as casas fora do mês. */
export function monthCells(month: string): (string | null)[] {
  const [y, m] = month.split('-').map(Number)
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7
  const total = new Date(y, m, 0).getDate()
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: total }, (_, i) => `${month}-${pad(i + 1)}`),
  ]
  while (cells.length % 7) cells.push(null)
  return cells
}
