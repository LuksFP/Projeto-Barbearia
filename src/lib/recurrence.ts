// Cliente fixo: datas da série a partir do horário base.
// 7/14/21/28 caem sempre no mesmo dia da semana; 15/30 são "quinzenal/mensal" corridos.
export const RECURRENCE_OPTIONS: { days: number; label: string }[] = [
  { days: 7, label: 'Toda semana' },
  { days: 14, label: 'A cada 2 semanas' },
  { days: 15, label: 'A cada 15 dias' },
  { days: 21, label: 'A cada 3 semanas' },
  { days: 28, label: 'A cada 4 semanas' },
  { days: 30, label: 'A cada 30 dias' },
]

export const recurrenceLabel = (days?: number) =>
  RECURRENCE_OPTIONS.find(o => o.days === days)?.label.toLowerCase() ?? (days ? `a cada ${days} dias` : '')

/**
 * Próximas `count` datas ('YYYY-MM-DD') depois de `baseDate`, de `everyDays`
 * em `everyDays`, pulando as que ficam antes de `minDate` (hoje). Repetir um
 * corte de semanas atrás não cria horário no passado: segue o mesmo ritmo e
 * começa da próxima data que ainda vem.
 */
export function seriesDates(baseDate: string, everyDays: number, count: number, minDate?: string): string[] {
  const out: string[] = []
  const d = new Date(`${baseDate}T12:00:00`)
  for (let i = 1; out.length < count && i < count + 400; i++) {
    const n = new Date(d)
    n.setDate(d.getDate() + everyDays * i)
    const iso = n.toLocaleDateString('sv-SE')
    if (!minDate || iso >= minDate) out.push(iso)
  }
  return out
}
