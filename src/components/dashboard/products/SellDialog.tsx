// Registrar venda no balcão: quantidade, preço (com desconto, nunca acima do
// de tabela), forma de pagamento e cliente opcional. O banco baixa o estoque.
import { useEffect, useState } from 'react'
import { Minus, Plus, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { productErrorMessage } from '@/hooks/useProducts'
import type { PaymentMethod, Product, SaleInput } from '@/repositories/productRepository'

interface Props {
  product: Product | null
  sellerName: string
  onClose: () => void
  onSell: (input: SaleInput) => Promise<void>
}

const PAYMENTS: Array<{ id: PaymentMethod; label: string }> = [
  { id: 'pix', label: 'Pix' },
  { id: 'dinheiro', label: 'Dinheiro' },
  { id: 'cartao', label: 'Cartão' },
]

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const SellDialog = ({ product, sellerName, onClose, onSell }: Props) => {
  const [qty, setQty] = useState(1)
  const [price, setPrice] = useState('')
  const [payment, setPayment] = useState<PaymentMethod>('pix')
  const [client, setClient] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!product) return
    setQty(1)
    setPrice(String(product.price).replace('.', ','))
    setPayment('pix')
    setClient('')
  }, [product])

  if (!product) return null

  const unit = Number(price.replace(',', '.'))
  const priceOk = price.trim() !== '' && unit >= 0 && unit <= product.price
  const discount = priceOk && unit < product.price ? product.price - unit : 0
  const total = priceOk ? unit * qty : 0

  const submit = async () => {
    if (!priceOk || saving) return
    setSaving(true)
    try {
      await onSell({
        productId: product.id,
        quantity: qty,
        unitPrice: Math.round(unit * 100) / 100,
        sellerName,
        clientName: client.trim() || null,
        paymentMethod: payment,
      })
      toast({
        title: 'Venda registrada',
        description: `${qty}× ${product.name} · ${brl(total)} — sobram ${product.stock - qty} no estoque`,
      })
      onClose()
    } catch (err: unknown) {
      toast({ title: 'Venda não registrada', description: productErrorMessage(err), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="bg-[#111] border-[#262626] text-white max-w-sm p-5 sm:p-6">
        <DialogTitle className="font-heading text-2xl tracking-wide">VENDER</DialogTitle>
        <DialogDescription className="text-white/60 text-sm font-body -mt-2">
          {product.name} <span className="text-white/35">· {product.stock} em estoque</span>
        </DialogDescription>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-white/45 text-xs font-body">Quantidade</span>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Menos uma" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}
                className="w-10 h-10 rounded-md border border-[#2a2a2a] flex items-center justify-center text-white/70 disabled:opacity-30">
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center font-heading text-2xl tabular-nums" aria-live="polite">{qty}</span>
              <button type="button" aria-label="Mais uma" onClick={() => setQty(q => Math.min(product.stock, q + 1))} disabled={qty >= product.stock}
                className="w-10 h-10 rounded-md border border-[#2a2a2a] flex items-center justify-center text-white/70 disabled:opacity-30">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="sell-price" className="block text-white/45 text-xs font-body mb-1.5">Preço por unidade (R$)</label>
            <input id="sell-price" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)}
              className="w-full bg-[#161616] border border-[#272727] rounded-lg px-3 py-2.5 text-base sm:text-sm font-body focus:outline-none focus:border-amber-500/50" />
            {!priceOk && price.trim() !== '' && (
              <p className="text-red-400 text-[11px] font-body mt-1">Máximo {brl(product.price)} (preço do produto)</p>
            )}
            {discount > 0 && <p className="text-amber-300/80 text-[11px] font-body mt-1">Desconto de {brl(discount)} por unidade</p>}
          </div>

          <div>
            <span className="block text-white/45 text-xs font-body mb-1.5">Pagamento</span>
            <div className="flex gap-1.5">
              {PAYMENTS.map(p => (
                <button key={p.id} type="button" onClick={() => setPayment(p.id)} aria-pressed={payment === p.id}
                  className={`flex-1 py-2 rounded-md text-xs font-body border transition-colors ${payment === p.id ? 'border-amber-500/50 bg-amber-500/[0.12] text-amber-300' : 'border-[#2a2a2a] text-white/50'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="sell-client" className="block text-white/45 text-xs font-body mb-1.5">Cliente <span className="text-white/25">(opcional)</span></label>
            <input id="sell-client" value={client} onChange={e => setClient(e.target.value.slice(0, 80))} placeholder="Quem levou"
              className="w-full bg-[#161616] border border-[#272727] rounded-lg px-3 py-2.5 text-base sm:text-sm font-body placeholder:text-white/20 focus:outline-none focus:border-amber-500/50" />
          </div>

          <button type="button" onClick={() => void submit()} disabled={!priceOk || saving}
            className="w-full flex items-center justify-between px-4 py-3 rounded-md bg-amber-500 text-black font-body font-semibold hover:bg-amber-400 disabled:opacity-40 transition-colors">
            <span className="flex items-center gap-2">{saving && <Loader2 className="w-4 h-4 animate-spin" />}Registrar venda</span>
            <span className="font-heading text-xl tracking-wide tabular-nums">{brl(total)}</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SellDialog
