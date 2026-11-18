// Como pagar, no site da barbearia, depois de agendar (corte + "Leve junto"
// num checkout só) ou de reservar pela sacola: "Pagar agora" (Mercado Pago)
// ou "Pagar no local". Só aparece se a barbearia conectou o Mercado Pago e
// deixou ligado; senão não renderiza nada e tudo segue pago na barbearia.
// O painel mostra a escolha: quem pagou online e quem paga no local.
import { useEffect, useState } from 'react'
import { Loader2, QrCode, Store, Check } from 'lucide-react'
import { onlinePaymentRepository } from '@/repositories/onlinePaymentRepository'
import { isRealBarbershopId } from '@/lib/placeOrder'

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

interface Props {
  barbershopId: string
  slug: string
  phone: string
  primary: string
  appointmentId?: string
  orderId?: string
  /** Total mostrado no botão (o cobrado sai do banco) */
  amount: number
  /** Onde paga quem não pagar agora: "na retirada" / "na barbearia" */
  laterHint: string
}

const PayOnline = ({ barbershopId, slug, phone, primary, appointmentId, orderId, amount, laterHint }: Props) => {
  const [available, setAvailable] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [local, setLocal] = useState(false)

  useEffect(() => {
    let alive = true
    void onlinePaymentRepository.paysOnline(barbershopId).then(ok => { if (alive) setAvailable(ok) })
    return () => { alive = false }
  }, [barbershopId])

  if (!available || amount <= 0 || (!appointmentId && !orderId)) return null

  const pay = async () => {
    setBusy(true)
    setError('')
    try {
      await onlinePaymentRepository.startCheckout({ barbershopId, slug, phone, appointmentId, orderId, amount })
      // sucesso = o navegador já está indo pro Mercado Pago
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Não deu pra abrir o pagamento agora.')
      setBusy(false)
    }
  }

  const demo = !isRealBarbershopId(barbershopId)

  if (local) {
    return (
      <div className="mt-5 border-t border-white/10 pt-5 text-center">
        <p className="flex items-center justify-center gap-2 text-white/80 text-sm font-body">
          <Check className="w-4 h-4" style={{ color: primary }} />Combinado: você paga {laterHint}.
        </p>
        <button type="button" onClick={() => setLocal(false)} className="mt-2 text-white/45 text-xs font-body underline underline-offset-4 hover:text-white/70">
          Mudei de ideia, quero pagar agora
        </button>
      </div>
    )
  }

  return (
    <div className="mt-5 text-left border-t border-white/10 pt-5">
      <p className="text-white/60 text-xs font-body text-center mb-3">Como você prefere pagar?</p>
      <div className="grid gap-2">
        <button type="button" onClick={() => void pay()} disabled={busy}
          className="w-full py-3.5 rounded-md font-body font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: primary, color: '#0a0a0a' }}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
          Pagar agora {brl(amount)} · Pix ou cartão
        </button>
        <button type="button" onClick={() => setLocal(true)} disabled={busy}
          className="w-full py-3 rounded-md font-body font-semibold text-sm flex items-center justify-center gap-2 border border-white/15 text-white/85 hover:border-white/30 disabled:opacity-50">
          <Store className="w-4 h-4" />Pagar {laterHint}
        </button>
      </div>
      <p className="text-white/45 text-xs font-body mt-2 text-center">
        {demo ? 'Demonstração: o pagamento é simulado.' : 'Pagamento online pelo Mercado Pago.'}
      </p>
      {error && <p role="alert" className="text-red-300 text-sm font-body mt-2 text-center">{error}</p>}
    </div>
  )
}

export default PayOnline
