// Ações extras do cartão do horário na Agenda:
//   - Concluído → "Pedir avaliação" (WhatsApp com o link do Google da barbearia)
//   - Cliente fixo → selo "Fixo · a cada N", "Confirmar no WhatsApp" (mensagem pronta) e
//     "Parar repetição"; sem série → "Repetir"
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Star, Repeat, Check, MessageCircle } from 'lucide-react'
import { buildOwnReviewRequest, buildReviewRequest, waUrl } from '@/lib/whatsapp'
import { recurrenceLabel } from '@/lib/recurrence'
import { buildFixedReminder } from '@/lib/reminders'
import type { Barbershop, BarbershopAppointment } from '@/types/tenant'

interface Props {
  apt: BarbershopAppointment
  shop: Barbershop
  reviewUrl: string
  onReminded: (apt: BarbershopAppointment) => Promise<void>
  onReviewRequested: (apt: BarbershopAppointment) => Promise<void>
  onRepeat: (apt: BarbershopAppointment) => void
  onStopSeries: (apt: BarbershopAppointment) => Promise<void>
  /** Avaliação no site ligada: link pro cliente dar a nota. */
  ownReviewUrl?: string
}

const btn = 'flex items-center gap-1.5 px-3 py-1 max-sm:h-11 rounded-md text-xs font-body font-semibold border transition-all'

const AppointmentExtras = ({ apt, shop, reviewUrl, onReminded, onReviewRequested, onRepeat, onStopSeries, ownReviewUrl }: Props) => {
  const shopName = shop.name
  const [armedStop, setArmedStop] = useState(false)
  const open = apt.status === 'pending' || apt.status === 'confirmed'
  const done = apt.status === 'done'
  const wa = reviewUrl ? waUrl(apt.clientPhone, buildReviewRequest(apt.clientName, shopName, reviewUrl)) : null

  // Fixo: mensagem pronta confirmando o horário de sempre
  const waFixed = apt.recurrenceId && open ? waUrl(apt.clientPhone, buildFixedReminder(apt, shop)) : null
  const sendFixed = () => {
    if (!waFixed) return
    window.open(waFixed, '_blank', 'noopener') // antes de qualquer await (bloqueio de pop-up)
    void onReminded(apt)
  }

  const waOwn = ownReviewUrl && done ? waUrl(apt.clientPhone, buildOwnReviewRequest(apt.clientName, shopName, ownReviewUrl)) : null

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
    // No celular "Repetir" e "Parar repetição" ficam no menu "⋯"
    <div className={`flex flex-wrap items-center gap-2 mt-2 pl-[74px] max-sm:pl-0 ${!done && !apt.recurrenceId ? 'max-sm:hidden' : ''}`}>
      {apt.recurrenceId && (
        <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-violet-400/30 bg-violet-400/10 text-violet-200 font-body">
          <Repeat className="w-3 h-3" />Fixo · {recurrenceLabel(apt.recurrenceEveryDays)}
        </span>
      )}

      {waFixed && (apt.remindedAt ? (
        <button type="button" onClick={sendFixed} className={`${btn} border-transparent text-white/55 hover:bg-white/[0.06] hover:text-white`} title="Mandar de novo">
          <Check className="w-3 h-3 text-emerald-400" />Mensagem enviada
        </button>
      ) : (
        <button type="button" onClick={sendFixed} className={`${btn} border-[#25D366]/40 bg-[#25D366]/10 text-[#5ee08f] hover:bg-[#25D366]/20`}>
          <MessageCircle className="w-3 h-3" />Confirmar no WhatsApp
        </button>
      ))}

      {done && (wa ? (
        apt.reviewRequestedAt ? (
          <button type="button" onClick={askReview} className={`${btn} border-transparent text-white/55 hover:bg-white/[0.06] hover:text-white`} title="Pedir de novo">
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

      {waOwn && (
        <a href={waOwn} target="_blank" rel="noopener noreferrer" className={`${btn} border-white/10 text-white/70 hover:text-amber-300`}>
          <Star className="w-3 h-3" />Pedir nota no site
        </a>
      )}

      {showRepeat && (
        <button type="button" onClick={() => onRepeat(apt)} className={`${btn} max-sm:hidden border-transparent text-white/55 hover:bg-white/[0.06] hover:text-white`}>
          <Repeat className="w-3 h-3" />Repetir
        </button>
      )}

      {apt.recurrenceId && open && (
        <button type="button" onClick={() => void stop()} onBlur={() => setArmedStop(false)}
          className={`${btn} max-sm:hidden ${armedStop ? 'border-red-500/50 bg-red-500/10 text-red-300' : 'border-transparent text-white/45 hover:bg-white/[0.06] hover:text-red-300'}`}>
          {armedStop ? 'Toque de novo: cancela os próximos' : 'Parar repetição'}
        </button>
      )}
    </div>
  )
}

export default AppointmentExtras
