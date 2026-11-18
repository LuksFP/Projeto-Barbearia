// Ações extras do cartão do horário na Agenda:
//   - Concluído → "Pedir avaliação" (WhatsApp com o link do Google da barbearia)
//   - Cliente fixo → selo "Fixo · a cada N" e "Parar repetição"; sem série → "Repetir"
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Star, Repeat, Check } from 'lucide-react'
import { buildReviewRequest, waUrl } from '@/lib/whatsapp'
import { recurrenceLabel } from '@/lib/recurrence'
import type { BarbershopAppointment } from '@/types/tenant'

interface Props {
  apt: BarbershopAppointment
  shopName: string
  reviewUrl: string
  onReviewRequested: (apt: BarbershopAppointment) => Promise<void>
  onRepeat: (apt: BarbershopAppointment) => void
  onStopSeries: (apt: BarbershopAppointment) => Promise<void>
}

const btn = 'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-body font-semibold border transition-all'

const AppointmentExtras = ({ apt, shopName, reviewUrl, onReviewRequested, onRepeat, onStopSeries }: Props) => {
  const [armedStop, setArmedStop] = useState(false)
  const open = apt.status === 'pending' || apt.status === 'confirmed'
  const done = apt.status === 'done'
  const wa = reviewUrl ? waUrl(apt.clientPhone, buildReviewRequest(apt.clientName, shopName, reviewUrl)) : null

  const askReview = () => {
    if (!wa) return
    window.open(wa, '_blank', 'noopener') // abre antes de qualquer await (bloqueio de pop-up)
    void onReviewRequested(apt)
  }

  const stop = async () => {
    if (!armedStop) { setArmedStop(true); return }
    setArmedStop(false)
    await onStopSeries(apt)
  }

  const showRepeat = !apt.recurrenceId && (open || done)
  if (!done && !apt.recurrenceId && !showRepeat) return null

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2 pl-[74px]">
      {apt.recurrenceId && (
        <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-violet-400/30 bg-violet-400/10 text-violet-200 font-body">
          <Repeat className="w-3 h-3" />Fixo · {recurrenceLabel(apt.recurrenceEveryDays)}
        </span>
      )}

      {done && (wa ? (
        apt.reviewRequestedAt ? (
          <button type="button" onClick={askReview} className={`${btn} border-[#2a2a2a] text-white/55 hover:text-white`} title="Pedir de novo">
            <Check className="w-3 h-3 text-emerald-400" />Avaliação pedida
          </button>
        ) : (
          <button type="button" onClick={askReview} className={`${btn} border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20`}>
            <Star className="w-3 h-3" />Pedir avaliação
          </button>
        )
      ) : !apt.clientPhone ? null : (
        <Link to="/dashboard/configuracoes#avaliacoes" className="text-[11px] text-white/45 hover:text-amber-300 font-body underline underline-offset-2">
          Pedir avaliação no Google: cadastre o link
        </Link>
      ))}

      {showRepeat && (
        <button type="button" onClick={() => onRepeat(apt)} className={`${btn} border-[#2a2a2a] text-white/60 hover:text-white`}>
          <Repeat className="w-3 h-3" />Repetir
        </button>
      )}

      {apt.recurrenceId && open && (
        <button type="button" onClick={() => void stop()} onBlur={() => setArmedStop(false)}
          className={`${btn} ${armedStop ? 'border-red-500/50 bg-red-500/10 text-red-300' : 'border-[#2a2a2a] text-white/50 hover:text-red-300'}`}>
          {armedStop ? 'Toque de novo: cancela os próximos' : 'Parar repetição'}
        </button>
      )}
    </div>
  )
}

export default AppointmentExtras
