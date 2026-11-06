// "Leve junto" no fim do agendamento: produtos da loja da barbearia que o
// cliente separa pra pegar no dia, pagando tudo lá. Só aparece com estoque.
import { Minus, Plus, ShoppingBag } from 'lucide-react'
import type { PublicProduct } from '@/repositories/publicStoreRepository'

interface Props {
  products: PublicProduct[]
  picked: Record<string, number>
  onChange: (next: Record<string, number>) => void
  primary: string
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const BookingBump = ({ products, picked, onChange, primary }: Props) => {
  // O que já está escolhido (ex.: veio da sacola) aparece primeiro
  const offer = products.filter(p => p.available > 0)
    .sort((a, b) => Number(!!picked[b.id]) - Number(!!picked[a.id]))
    .slice(0, Math.max(6, Object.keys(picked).length))
  if (offer.length === 0) return null

  const setQty = (id: string, qty: number) => {
    const next = { ...picked }
    if (qty <= 0) delete next[id]
    else next[id] = qty
    onChange(next)
  }

  return (
    <div className="mb-6 rounded-xl border p-4" style={{ borderColor: primary + '40', backgroundColor: primary + '0a' }}>
      <p className="flex items-center gap-2 text-white text-sm font-semibold font-body">
        <ShoppingBag className="w-4 h-4" style={{ color: primary }} />
        Leve junto no dia
      </p>
      <p className="text-white/55 text-xs font-body mt-0.5 mb-3">A gente separa e você paga tudo na barbearia, junto com o corte.</p>
      <ul className="space-y-2">
        {offer.map(p => {
          const qty = picked[p.id] ?? 0
          return (
            <li key={p.id} className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-md overflow-hidden bg-[#1a1a1a] border border-[#262626] shrink-0 flex items-center justify-center">
                {p.imageUrls[0]
                  ? <img src={p.imageUrls[0]} alt="" loading="lazy" className="w-full h-full object-cover" />
                  : <ShoppingBag className="w-4 h-4 text-white/30" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white/85 text-sm font-body leading-snug line-clamp-2">{p.name}</p>
                <p className="text-xs font-body" style={{ color: primary }}>{brl(p.price)}</p>
              </div>
              {qty === 0 ? (
                <button type="button" onClick={() => setQty(p.id, 1)}
                  className="px-3 py-2 rounded-md text-xs font-semibold font-body border shrink-0"
                  style={{ borderColor: primary + '66', color: primary }}>
                  Adicionar
                </button>
              ) : (
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" aria-label={`Menos ${p.name}`} onClick={() => setQty(p.id, qty - 1)}
                    className="w-8 h-8 rounded-md border border-[#2e2e2e] text-white/70 flex items-center justify-center">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-white text-sm font-body tabular-nums" aria-live="polite">{qty}</span>
                  <button type="button" aria-label={`Mais ${p.name}`} onClick={() => setQty(p.id, Math.min(p.available, qty + 1))} disabled={qty >= p.available}
                    className="w-8 h-8 rounded-md border border-[#2e2e2e] text-white/70 flex items-center justify-center disabled:opacity-30">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default BookingBump
