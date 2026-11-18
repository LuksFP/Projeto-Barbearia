// Semana de segunda a domingo (fechamento de comissão).
const iso = (d: Date) => d.toLocaleDateString('sv-SE')

/** Segunda-feira da semana de `ref` (deslocada `offset` semanas). */
export function weekStart(offset = 0, ref = new Date()): string {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), 12)
  const dow = (d.getDay() + 6) % 7 // segunda = 0
  d.setDate(d.getDate() - dow + offset * 7)
  return iso(d)
}

export function weekEnd(start: string): string {
  const d = new Date(`${start}T12:00`)
  d.setDate(d.getDate() + 6)
  return iso(d)
}

export function weekLabel(start: string): string {
  const f = (s: string) => new Date(`${s}T12:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${f(start)} a ${f(weekEnd(start))}`
}
