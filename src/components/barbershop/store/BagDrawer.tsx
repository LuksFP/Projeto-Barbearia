// Gaveta da sacola: itens, quantidade, subtotal e "finalizar" (reserva pra
// retirar — nome + WhatsApp). Não tem pagamento online: paga na barbearia.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Minus, Plus, ShoppingBag, Trash2, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { placeOrder } from '@/lib/placeOrder'
import { orderErrorMessage } from '@/repositories/publicStoreRepository'
import { brl, rememberContact, savedContact, useBag } from './bag'
import ProductImage from './ProductImage'

interface Props {
  barbershopId: string
  barbershopName: string
  address: string
  slug: string
  primary: string
  onOrdered: () => void
}

type Stage = 'bag' | 'checkout' | 'done'

const BagDrawer = ({ barbershopId, barbershopName, address, slug, primary, onOrdered }: Props) => {
  const bag = useBag()
  const [stage, setStage] = useState<Stage>('bag')
  const [name, setName] = useState(() => savedContact().name)
  const [phone, setPhone] = useState(() => savedContact().phone)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState<{ items: string; total: number } | null>(null)

  const phoneOk = phone.replace(/\D/g, '').length >= 10
  const canSend = name.trim().length > 0 && phoneOk && bag.lines.length > 0 && !sending

  const onOpenChange = (o: boolean) => {
    if (o) bag.open()
    else {
      bag.close()
      // Fechou depois de reservar: a próxima abertura começa do zero
      if (stage === 'done') { setStage('bag'); setReceipt(null) }
      if (stage === 'checkout') setStage('bag')
      setError('')
    }
  }

  const submit = async () => {
    if (!canSend) return
    setSending(true)
    setError('')
    try {
      await placeOrder(barbershopId, {
        items: bag.lines.map(l => ({ productId: l.product.id, quantity: l.qty })),
        clientName: name.trim(),
        clientPhone: phone,
      })
      rememberContact(name.trim(), phone.trim())
      setReceipt({ items: bag.lines.map(l => `${l.qty}× ${l.product.name}`).join(', '), total: bag.subtotal })
      bag.clear()
      setStage('done')
      onOrdered()
    } catch (err: unknown) {
      setError(orderErrorMessage(err))
    } finally {
      setSending(false)
    }
  }

  const field = 'w-full bg-[#161616] border border-[#262626] rounded-md px-4 py-3 text-white text-base sm:text-sm font-body placeholder:text-white/35 focus:outline-none focus:border-[#444]'

  return (
    <Sheet open={bag.isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-[#0d0d0d] border-l border-[#222] text-white p-0 flex flex-col gap-0">
        <div className="px-5 pt-5 pb-4 border-b border-[#1e1e1e]">
          {stage === 'checkout' && (
            <button type="button" onClick={() => setStage('bag')} className="flex items-center gap-1 text-white/55 hover:text-white text-xs font-body mb-2">
              <ArrowLeft className="w-3.5 h-3.5" />Voltar pra sacola
            </button>
          )}
          <SheetTitle className="text-white font-body text-lg font-semibold">
            {stage === 'done' ? 'Reserva feita' : stage === 'checkout' ? 'Finalizar reserva' : `Sacola${bag.count ? ` (${bag.count})` : ''}`}
          </SheetTitle>
          <SheetDescription className="text-white/55 text-xs font-body mt-0.5">
            Retire na {barbershopName} e pague lá. Nada é cobrado agora.
          </SheetDescription>
        </div>

        {stage === 'done' && receipt ? (
          <div className="flex-1 overflow-y-auto px-5 py-8 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: primary }} />
            <p className="text-white font-body font-semibold">Separado pra você!</p>
            <p className="text-white/65 text-sm font-body mt-2">{receipt.items}</p>
            <p className="text-white text-lg font-body font-semibold mt-3 tabular-nums">{brl(receipt.total)}</p>
            <p className="text-white/55 text-sm font-body mt-4 leading-relaxed">
              É só passar na barbearia{address ? <> ({address})</> : null} e pagar na retirada. Se mudar de ideia, avisa pelo WhatsApp.
            </p>
            <Link to={`/b/${slug}#agendar`} onClick={() => onOpenChange(false)}
              className="inline-block mt-6 text-sm font-body underline underline-offset-4" style={{ color: primary }}>
              Aproveitar e marcar um horário
            </Link>
          </div>
        ) : bag.lines.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <ShoppingBag className="w-10 h-10 text-white/15 mb-3" />
            <p className="text-white/80 font-body">Sua sacola está vazia</p>
            <Link to={`/b/${slug}/loja`} onClick={() => onOpenChange(false)}
              className="mt-4 px-4 py-2.5 rounded-md text-sm font-body font-semibold" style={{ backgroundColor: primary, color: '#0a0a0a' }}>
              Ver a loja
            </Link>
          </div>
        ) : stage === 'bag' ? (
          <ul className="flex-1 overflow-y-auto divide-y divide-[#1c1c1c] px-5">
            {bag.lines.map(({ product: p, qty }) => (
              <li key={p.id} className="py-4 flex gap-3">
                <Link to={`/b/${slug}/loja/${p.id}`} onClick={() => onOpenChange(false)}
                  className="w-20 h-24 shrink-0 rounded-md overflow-hidden bg-[#161616] flex items-center justify-center">
                  <ProductImage product={p} primary={primary} compact />
                </Link>
                <div className="min-w-0 flex-1 flex flex-col">
                  <div className="flex gap-2">
                    <p className="text-white/90 text-sm font-body leading-snug flex-1 min-w-0">{p.name}</p>
                    <button type="button" onClick={() => bag.remove(p.id)} aria-label={`Tirar ${p.name} da sacola`} className="text-white/35 hover:text-red-300 p-1 -m-1 h-fit">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-white/50 text-xs font-body mt-0.5 tabular-nums">{brl(p.price)} cada</p>
                  <div className="mt-auto pt-2 flex items-center justify-between">
                    <div className="flex items-center border border-[#2a2a2a] rounded-md">
                      <button type="button" aria-label={`Menos ${p.name}`} onClick={() => bag.setQty(p.id, qty - 1)}
                        className="w-8 h-8 flex items-center justify-center text-white/70"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="w-7 text-center text-sm font-body tabular-nums" aria-live="polite">{qty}</span>
                      <button type="button" aria-label={`Mais ${p.name}`} onClick={() => bag.setQty(p.id, qty + 1)} disabled={qty >= p.available}
                        className="w-8 h-8 flex items-center justify-center text-white/70 disabled:opacity-30"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    <span className="text-white text-sm font-body font-semibold tabular-nums">{brl(p.price * qty)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            <ul className="text-sm font-body text-white/70 space-y-1">
              {bag.lines.map(l => (
                <li key={l.product.id} className="flex gap-2">
                  <span className="flex-1 min-w-0">{l.qty}× {l.product.name}</span>
                  <span className="tabular-nums">{brl(l.qty * l.product.price)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-3 pt-2">
              <div>
                <label htmlFor="bag-name" className="block text-white/60 text-xs font-body mb-1.5">Seu nome</label>
                <input id="bag-name" value={name} onChange={e => setName(e.target.value.slice(0, 80))} autoComplete="name" className={field} />
              </div>
              <div>
                <label htmlFor="bag-phone" className="block text-white/60 text-xs font-body mb-1.5">WhatsApp com DDD</label>
                <input id="bag-phone" value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" className={field} />
                {phone && !phoneOk && <p className="text-red-300 text-xs font-body mt-1">Coloque o DDD e o número completo.</p>}
              </div>
            </div>
            {error && <p role="alert" className="text-red-300 text-sm font-body">{error}</p>}
          </div>
        )}

        {stage !== 'done' && bag.lines.length > 0 && (
          <div className="border-t border-[#1e1e1e] px-5 py-4 space-y-3 bg-[#0d0d0d]">
            <div className="flex items-baseline justify-between font-body">
              <span className="text-white/60 text-sm">Total a pagar na retirada</span>
              <span className="text-white text-xl font-semibold tabular-nums">{brl(bag.subtotal)}</span>
            </div>
            {stage === 'bag' ? (
              <button type="button" onClick={() => setStage('checkout')}
                className="w-full py-3.5 rounded-md font-body font-bold text-sm" style={{ backgroundColor: primary, color: '#0a0a0a' }}>
                Reservar pra retirar
              </button>
            ) : (
              <button type="button" onClick={() => void submit()} disabled={!canSend}
                className="w-full py-3.5 rounded-md font-body font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ backgroundColor: primary, color: '#0a0a0a' }}>
                {sending && <Loader2 className="w-4 h-4 animate-spin" />}Confirmar reserva
              </button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default BagDrawer
