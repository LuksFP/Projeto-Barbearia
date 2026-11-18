// /b/:slug/pagamento/:paymentId — volta do checkout do Mercado Pago (corte
// e/ou produtos).
// O status vem do banco (gravado pelo webhook), não da URL de volta: o MP às
// vezes volta antes do webhook chegar, então pergunta de novo por ~1 min.
import { useEffect, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react'
import type { PublicSiteOutletCtx } from '@/layouts/PublicSiteLayout'
import { onlinePaymentRepository, type PaymentCheck } from '@/repositories/onlinePaymentRepository'

const POLL_MS = 4000
const POLL_MAX = 15

const PaymentReturnPage = () => {
  const { barbershop } = useOutletContext<PublicSiteOutletCtx>()
  const { paymentId = '' } = useParams()
  const [check, setCheck] = useState<PaymentCheck | 'erro' | null>(null)
  const [tries, setTries] = useState(0)
  const primary = barbershop.primaryColor

  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    let n = 0
    const check = async () => {
      try {
        const c = await onlinePaymentRepository.status(paymentId)
        if (!alive) return
        setCheck(c)
        const s = c.status
        n += 1
        setTries(n)
        if ((s === 'pendente' || s === null) && n < POLL_MAX) timer = setTimeout(() => void check(), POLL_MS)
      } catch {
        if (alive) setCheck('erro')
      }
    }
    void check()
    return () => { alive = false; if (timer) clearTimeout(timer) }
  }, [paymentId])

  const status = check === 'erro' ? 'erro' : check?.status ?? null
  const waiting = (status === 'pendente' || status === null) && tries < POLL_MAX && check !== 'erro'
  const appt = check !== 'erro' && !!check?.hasAppointment
  const order = check !== 'erro' && !!check?.hasOrder
  const paidText = appt && order
    ? 'Corte e produtos pagos. É só aparecer no horário: os produtos estarão separados.'
    : appt ? 'Seu horário está pago. É só aparecer na hora marcada.'
      : `Seu pedido está pago e separado. É só retirar na ${barbershop.name}.`
  const laterText = appt
    ? 'Nada foi cobrado. Seu horário continua marcado e você paga na barbearia.'
    : 'Nada foi cobrado. Seus produtos continuam reservados: dá pra pagar na retirada.'

  const view = status === 'pago'
    ? { icon: <CheckCircle2 className="w-12 h-12" style={{ color: primary }} />, title: 'Pagamento aprovado!', text: paidText }
    : status === 'recusado'
      ? { icon: <XCircle className="w-12 h-12 text-red-300" />, title: 'Pagamento não aprovado', text: laterText }
      : status === 'estornado'
        ? { icon: <XCircle className="w-12 h-12 text-white/40" />, title: 'Pedido estornado', text: 'O valor foi devolvido pelo Mercado Pago.' }
        : waiting
          ? { icon: <Loader2 className="w-12 h-12 animate-spin text-white/50" />, title: 'Confirmando o pagamento…', text: 'Pix costuma confirmar em segundos. Pode deixar esta página aberta.' }
          : { icon: <Clock className="w-12 h-12 text-amber-300" />, title: 'Pagamento ainda não confirmado', text: `Se você pagou, a barbearia vê assim que o Mercado Pago confirmar. Se não, ${appt ? 'seu horário continua marcado e você paga na barbearia' : 'seus produtos continuam reservados e você paga na retirada'}.` }

  return (
    <section className="min-h-[70vh] flex items-center justify-center px-4 py-24">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-5">{view.icon}</div>
        <h1 className="font-heading text-3xl text-white tracking-wide">{view.title}</h1>
        <p className="text-white/60 text-sm font-body mt-3 leading-relaxed">{view.text}</p>
        {barbershop.address && <p className="text-white/40 text-xs font-body mt-4">{barbershop.address}</p>}
        <div className="mt-8 flex flex-col items-center gap-3">
          {!appt && (
            <Link to={`/b/${barbershop.slug}#agendar`} className="text-sm font-body underline underline-offset-4" style={{ color: primary }}>
              Marcar um horário
            </Link>
          )}
          <Link to={`/b/${barbershop.slug}`} className="text-white/45 text-xs font-body hover:text-white/70">Voltar pro site</Link>
        </div>
      </div>
    </section>
  )
}

export default PaymentReturnPage
