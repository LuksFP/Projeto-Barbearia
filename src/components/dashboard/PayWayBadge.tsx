// Selo "como o cliente paga" na Agenda e na Loja: Pago online, Pagando agora…,
// Paga no local (ou na retirada) e Estornado. Só aparece quando a barbearia
// recebe online — sem isso todo mundo paga no local e o selo vira ruído.
import { BadgeCheck, Loader2, Store } from 'lucide-react'
import { PAYMENT_METHOD, payWay, type OnlinePayment } from '@/repositories/onlinePaymentRepository'

interface Props {
  payment: OnlinePayment | undefined
  /** Texto de quem não pagou online: "Paga no local", "Pagou na retirada"… */
  localLabel: string
  size?: 'sm' | 'xs'
}

const PayWayBadge = ({ payment, localLabel, size = 'xs' }: Props) => {
  const way = payWay(payment)
  const cls = size === 'sm' ? 'text-xs px-2 py-0.5 rounded-full' : 'text-[11px] px-1.5 py-0.5 rounded'
  if (way === 'online') {
    return (
      <span className={`flex items-center gap-1 border font-body text-sky-300 border-sky-500/40 bg-sky-500/10 ${cls}`}>
        <BadgeCheck className="w-3 h-3" />
        Pago online{payment?.method && PAYMENT_METHOD[payment.method] ? ` · ${PAYMENT_METHOD[payment.method]}` : ''}
      </span>
    )
  }
  if (way === 'pagando') {
    return (
      <span className={`flex items-center gap-1 border font-body text-amber-200 border-amber-400/30 bg-amber-400/5 ${cls}`}>
        <Loader2 className="w-3 h-3 animate-spin" />Pagando agora…
      </span>
    )
  }
  if (way === 'estornado') {
    return <span className={`border font-body text-white/45 border-white/15 ${cls}`}>Estornado</span>
  }
  return (
    <span className={`flex items-center gap-1 border font-body text-white/60 border-white/15 ${cls}`}>
      <Store className="w-3 h-3" />{localLabel}
    </span>
  )
}

export default PayWayBadge
