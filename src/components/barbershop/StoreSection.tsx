// Loja no site da barbearia: o cliente vê os produtos e reserva pra retirar,
// sem precisar marcar horário. Paga na barbearia. O estoque desce na hora.
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Minus, Plus, ShoppingBag, Loader2, CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { orderErrorMessage, type PublicProduct } from '@/repositories/publicStoreRepository'
import { placeOrder } from '@/lib/placeOrder'

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const CONTACT_KEY = 'barberos:client-contact'
function savedContact(): { name: string; phone: string } {
  try {
    const raw = localStorage.getItem(CONTACT_KEY)
    const v: unknown = raw ? JSON.parse(raw) : null
    if (v && typeof v === 'object') {
      const o = v as { name?: unknown; phone?: unknown }
      return { name: typeof o.name === 'string' ? o.name : '', phone: typeof o.phone === 'string' ? o.phone : '' }
    }
  } catch { /* sem contato salvo */ }
  return { name: '', phone: '' }
}

interface Props {
  barbershopId: string
  barbershopName: string
  products: PublicProduct[]
  primary: string
  onOrdered: () => void
}

const ProductDialog = ({ product, barbershopId, barbershopName, primary, onClose, onOrdered }: {
  product: PublicProduct
  barbershopId: string
  barbershopName: string
  primary: string
  onClose: () => void
  onOrdered: () => void
}) => {
  const [photo, setPhoto] = useState(0)
  const [qty, setQty] = useState(1)
  const [name, setName] = useState(() => savedContact().name)
  const [phone, setPhone] = useState(() => savedContact().phone)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const soldOut = product.available === 0
  const phoneOk = phone.replace(/\D/g, '').length >= 10
  const canSend = !soldOut && name.trim().length > 0 && phoneOk && !sending

  const submit = async () => {
    if (!canSend) return
    setSending(true)
    setError('')
    try {
      await placeOrder(barbershopId, {
        items: [{ productId: product.id, quantity: qty }],
        clientName: name.trim(),
        clientPhone: phone,
      })
      try { localStorage.setItem(CONTACT_KEY, JSON.stringify({ ...savedContact(), name: name.trim(), phone: phone.trim() })) } catch { /* ok */ }
      setDone(true)
      onOrdered()
    } catch (err: unknown) {
      setError(orderErrorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="bg-[#0f0f0f] border-[#262626] text-white max-w-md max-h-[92dvh] overflow-y-auto p-0 gap-0">
        {product.imageUrls.length > 0 && (
          <div>
            <img src={product.imageUrls[photo]} alt={product.name} className="w-full aspect-square object-cover" />
            {product.imageUrls.length > 1 && (
              <div className="flex gap-2 px-5 pt-3">
                {product.imageUrls.map((u, i) => (
                  <button key={u} type="button" onClick={() => setPhoto(i)} aria-label={`Foto ${i + 1}`}
                    className="w-12 h-12 rounded-md overflow-hidden border-2"
                    style={{ borderColor: i === photo ? primary : 'transparent' }}>
                    <img src={u} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="p-5 space-y-4">
          <div>
            <DialogTitle className="text-white text-lg font-semibold font-body leading-snug">{product.name}</DialogTitle>
            <DialogDescription className="text-white/55 text-sm font-body mt-1">
              {product.description || product.category}
            </DialogDescription>
            <p className="font-heading text-2xl tracking-wide mt-2" style={{ color: primary }}>{brl(product.price)}</p>
          </div>

          {done ? (
            <div className="rounded-lg border p-4 text-center" style={{ borderColor: primary + '55' }}>
              <CheckCircle2 className="w-7 h-7 mx-auto mb-2" style={{ color: primary }} />
              <p className="text-white font-body font-semibold">Reservado!</p>
              <p className="text-white/60 text-sm font-body mt-1">
                {qty}× {product.name} separado pra você na {barbershopName}. É só retirar e pagar lá.
              </p>
            </div>
          ) : soldOut ? (
            <p className="text-red-300 text-sm font-body">Esgotado no momento.</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm font-body">Quantidade</span>
                <div className="flex items-center gap-1">
                  <button type="button" aria-label="Menos um" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}
                    className="w-10 h-10 rounded-md border border-[#2e2e2e] flex items-center justify-center text-white/70 disabled:opacity-30">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center text-white text-lg font-body tabular-nums" aria-live="polite">{qty}</span>
                  <button type="button" aria-label="Mais um" onClick={() => setQty(q => Math.min(product.available, q + 1))} disabled={qty >= product.available}
                    className="w-10 h-10 rounded-md border border-[#2e2e2e] flex items-center justify-center text-white/70 disabled:opacity-30">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <input value={name} onChange={e => setName(e.target.value.slice(0, 80))} placeholder="Seu nome" aria-label="Seu nome" autoComplete="name"
                  className="w-full bg-[#161616] border border-[#252525] rounded-lg px-4 py-3 text-white text-base sm:text-sm font-body placeholder:text-white/30 focus:outline-none focus:border-[#3a3a3a]" />
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="WhatsApp com DDD" aria-label="WhatsApp com DDD" inputMode="tel" autoComplete="tel"
                  className="w-full bg-[#161616] border border-[#252525] rounded-lg px-4 py-3 text-white text-base sm:text-sm font-body placeholder:text-white/30 focus:outline-none focus:border-[#3a3a3a]" />
              </div>
              {error && <p className="text-red-400 text-sm font-body" role="alert">{error}</p>}
              <button type="button" onClick={() => void submit()} disabled={!canSend}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-lg font-body font-bold text-sm disabled:opacity-40"
                style={{ backgroundColor: primary, color: '#0a0a0a' }}>
                <span className="flex items-center gap-2">{sending && <Loader2 className="w-4 h-4 animate-spin" />}Reservar pra retirar</span>
                <span className="tabular-nums">{brl(product.price * qty)}</span>
              </button>
              <p className="text-white/40 text-[11px] font-body text-center -mt-1">Sem pagar agora: você paga na barbearia quando for buscar.</p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

const StoreSection = ({ barbershopId, barbershopName, products, primary, onOrdered }: Props) => {
  const [open, setOpen] = useState<PublicProduct | null>(null)

  // Estoque mudou (outro pedido): mantém a janela com o produto atualizado
  useEffect(() => {
    if (open) setOpen(prev => (prev ? products.find(p => p.id === prev.id) ?? prev : prev))
  }, [products]) // eslint-disable-line react-hooks/exhaustive-deps

  if (products.length === 0) return null

  return (
    <section id="loja" className="py-24 bg-[#0d0d0d]">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} className="mb-12 max-w-xl">
          <h2 className="font-heading text-4xl md:text-5xl tracking-wider text-white">LOJA</h2>
          <p className="text-white/55 text-sm font-body mt-3">
            O que a gente usa na cadeira, pra você levar pra casa. Reserva aqui e retira na barbearia, com ou sem horário marcado.
          </p>
        </motion.div>
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8">
          {products.map(p => {
            const soldOut = p.available === 0
            return (
              <li key={p.id}>
                <button type="button" onClick={() => setOpen(p)} className="group w-full text-left">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-[#161616] border border-[#232323] group-hover:border-[#363636] transition-colors">
                    {p.imageUrls[0]
                      ? <img src={p.imageUrls[0]} alt="" loading="lazy" className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${soldOut ? 'grayscale opacity-50' : ''}`} />
                      : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-8 h-8 text-white/15" /></div>}
                    {soldOut && (
                      <span className="absolute top-2 left-2 text-[10px] font-body font-semibold px-2 py-0.5 rounded bg-black/80 text-red-300">Esgotado</span>
                    )}
                  </div>
                  <p className="text-white/85 text-sm font-body mt-2.5 leading-snug line-clamp-2">{p.name}</p>
                  <p className="text-sm font-body font-semibold mt-0.5" style={{ color: soldOut ? 'rgba(255,255,255,0.35)' : primary }}>{brl(p.price)}</p>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      {open && (
        <ProductDialog
          product={open}
          barbershopId={barbershopId}
          barbershopName={barbershopName}
          primary={primary}
          onClose={() => setOpen(null)}
          onOrdered={onOrdered}
        />
      )}
    </section>
  )
}

export default StoreSection
