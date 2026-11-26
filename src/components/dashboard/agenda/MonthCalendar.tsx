import { ChevronLeft, ChevronRight } from 'lucide-react'
import { monthCells, shiftMonth } from '@/lib/month'

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

interface Props {
  selected: string
  today: string
  /** Horários não cancelados por data (já com o filtro de barbeiro). */
  counts: Record<string, number>
  onSelect: (date: string) => void
}

const MonthCalendar = ({ selected, today, counts, onSelect }: Props) => {
  const month = selected.slice(0, 7)
  const name = new Date(`${month}-01T12:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const total = Object.entries(counts).reduce((t, [d, n]) => (d.startsWith(month) ? t + n : t), 0)
  // Mês de hoje abre em hoje; os outros, no dia 1
  const go = (delta: number) => {
    const next = shiftMonth(month, delta)
    onSelect(today.startsWith(next) ? today : `${next}-01`)
  }
  const arrow = 'w-9 h-9 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors'

  return (
    <div className="rounded-2xl bg-[#141414] border border-[#262626] p-3 sm:p-4">
      <div className="flex items-center gap-1 mb-4">
        <p className="mr-auto pl-1 font-heading text-2xl tracking-wide text-white first-letter:uppercase">{name}</p>
        {selected !== today && (
          <button onClick={() => onSelect(today)} className="mr-1 text-xs font-body font-semibold px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors">
            Hoje
          </button>
        )}
        <button onClick={() => go(-1)} aria-label="Mês anterior" className={arrow}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button onClick={() => go(1)} aria-label="Próximo mês" className={arrow}>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-body text-white/45 pb-2">
        {WEEKDAYS.map(d => <span key={d}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {monthCells(month).map((date, i) => {
          if (!date) return <div key={`fora-${i}`} />
          const n = counts[date] ?? 0
          const isSelected = date === selected
          const isToday = date === today
          const past = date < today
          const label = new Date(`${date}T12:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
          return (
            <button
              key={date}
              onClick={() => onSelect(date)}
              aria-pressed={isSelected}
              aria-current={isToday ? 'date' : undefined}
              aria-label={`${label}: ${n} ${n === 1 ? 'horário' : 'horários'}`}
              className={`min-w-0 h-14 sm:h-16 flex flex-col items-center justify-center gap-1 rounded-xl font-body transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400 ${
                isSelected ? 'bg-amber-500' : isToday ? 'ring-1 ring-inset ring-amber-500/70 hover:bg-white/[0.06]' : 'hover:bg-white/[0.06]'
              }`}
            >
              <span className={`text-base leading-none tabular-nums ${
                isSelected ? 'text-[#0a0a0a] font-bold' : isToday ? 'text-amber-400 font-bold' : past ? 'text-white/35' : 'text-white/90 font-medium'
              }`}>
                {Number(date.slice(8))}
              </span>
              <span className={`h-4 text-[11px] leading-4 tabular-nums ${
                isSelected ? 'text-[#0a0a0a] font-semibold' : past ? 'text-white/35' : 'text-amber-400'
              }`}>
                {n > 0 && <>{n}<span className="hidden sm:inline"> {n === 1 ? 'horário' : 'horários'}</span></>}
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-3 pt-3 border-t border-[#222] pl-1 text-xs font-body text-white/45">
        {total} {total === 1 ? 'horário' : 'horários'} no mês, sem contar cancelados
      </p>
    </div>
  )
}

export default MonthCalendar
