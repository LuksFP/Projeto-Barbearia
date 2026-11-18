// "Pagar agora" no site da barbearia: depois de agendar (corte + "Leve junto"
// num checkout só) ou de reservar pela sacola. Só aparece se a barbearia
// conectou o Mercado Pago e deixou ligado; senão não renderiza nada e tudo
// segue "paga na barbearia".
import { useEffect, useState } from 'react'
import { Loader2, QrCode } from 'lucide-react'
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
  /** Texto de quem não pagar agora: "na retirada" / "na barbearia" */
  laterHint: string
}

const PayOnline = ({ barbershopId, slug, phone, primary, appointmentId, orderId, amount, laterHint }: Props) => {
  const [available, setAvailable] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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

  return (
    <div className="mt-5 text-left border-t border-white/10 pt-5">
      <button type="button" onClick={() => void pay()} disabled={busy}
        className="w-full py-3.5 rounded-md font-body font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ backgroundColor: primary, color: '#0a0a0a' }}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
        Pagar agora {brl(amount)} com Pix ou cartão
      </button>
      <p className="text-white/50 text-xs font-body mt-2 text-center">
        {isRealBarbershopId(barbershopId) ? `Pelo Mercado Pago. Se preferir, paga ${laterHint} mesmo.` : 'Demonstração: o pagamento é simulado.'}
      </p>
      {error && <p role="alert" className="text-red-300 text-sm font-body mt-2 text-center">{error}</p>}
    </div>
  )
}

export default PayOnline
