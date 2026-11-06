// Sacola da loja no site da barbearia. Fica salva no navegador por barbearia
// (o cliente fecha a aba e volta com a sacola cheia). Quantidade nunca passa do
// disponível; produto que sumiu da vitrine sai da sacola sozinho.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { PublicProduct } from '@/repositories/publicStoreRepository'

export interface BagLine {
  product: PublicProduct
  qty: number
}

interface BagCtx {
  lines: BagLine[]
  count: number
  subtotal: number
  qtyOf: (productId: string) => number
  add: (productId: string, qty?: number) => void
  setQty: (productId: string, qty: number) => void
  remove: (productId: string) => void
  clear: () => void
  isOpen: boolean
  open: () => void
  close: () => void
}

const Ctx = createContext<BagCtx | null>(null)

type Stored = Record<string, number>

const keyOf = (barbershopId: string) => `barberos:sacola:${barbershopId}`

function load(barbershopId: string): Stored {
  try {
    const raw = localStorage.getItem(keyOf(barbershopId))
    const v: unknown = raw ? JSON.parse(raw) : {}
    if (!v || typeof v !== 'object') return {}
    const out: Stored = {}
    for (const [k, n] of Object.entries(v as Record<string, unknown>)) {
      if (typeof n === 'number' && n > 0) out[k] = Math.floor(n)
    }
    return out
  } catch {
    return {}
  }
}

export const BagProvider = ({ barbershopId, products, children }: {
  barbershopId: string
  products: PublicProduct[]
  children: ReactNode
}) => {
  const [stored, setStored] = useState<Stored>(() => load(barbershopId))
  const [isOpen, setOpen] = useState(false)

  useEffect(() => { setStored(load(barbershopId)) }, [barbershopId])
  useEffect(() => {
    try { localStorage.setItem(keyOf(barbershopId), JSON.stringify(stored)) } catch { /* sem localStorage */ }
  }, [barbershopId, stored])

  const byId = useMemo(() => new Map(products.map(p => [p.id, p])), [products])

  // Linhas válidas: produto ainda à venda, com estoque, qtd até o disponível
  const lines = useMemo<BagLine[]>(() =>
    Object.entries(stored)
      .map(([id, qty]) => {
        const product = byId.get(id)
        return product && product.available > 0 ? { product, qty: Math.min(qty, product.available) } : null
      })
      .filter((l): l is BagLine => l !== null),
  [stored, byId])

  const clamp = useCallback((id: string, qty: number) => {
    const max = byId.get(id)?.available ?? 0
    return Math.max(0, Math.min(qty, max))
  }, [byId])

  const setQty = useCallback((id: string, qty: number) => {
    setStored(prev => {
      const next = { ...prev }
      const q = clamp(id, qty)
      if (q <= 0) delete next[id]
      else next[id] = q
      return next
    })
  }, [clamp])

  const value: BagCtx = {
    lines,
    count: lines.reduce((a, l) => a + l.qty, 0),
    subtotal: lines.reduce((a, l) => a + l.qty * l.product.price, 0),
    qtyOf: id => lines.find(l => l.product.id === id)?.qty ?? 0,
    add: (id, qty = 1) => setStored(prev => {
      const q = clamp(id, (prev[id] ?? 0) + qty)
      return q > 0 ? { ...prev, [id]: q } : prev
    }),
    setQty,
    remove: id => setStored(prev => { const n = { ...prev }; delete n[id]; return n }),
    clear: () => setStored({}),
    isOpen,
    open: () => setOpen(true),
    close: () => setOpen(false),
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useBag(): BagCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useBag fora do BagProvider')
  return v
}

export const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

/** Contato salvo do cliente (mesma chave do agendamento). */
export const CONTACT_KEY = 'barberos:client-contact'
export function savedContact(): { name: string; phone: string } {
  try {
    const raw = localStorage.getItem(CONTACT_KEY)
    const v: unknown = raw ? JSON.parse(raw) : null
    if (v && typeof v === 'object') {
      const o = v as { name?: unknown; phone?: unknown }
      return { name: typeof o.name === 'string' ? o.name : '', phone: typeof o.phone === 'string' ? o.phone : '' }
    }
  } catch { /* nada salvo */ }
  return { name: '', phone: '' }
}
export function rememberContact(name: string, phone: string) {
  try {
    const raw = localStorage.getItem(CONTACT_KEY)
    const prev: unknown = raw ? JSON.parse(raw) : {}
    localStorage.setItem(CONTACT_KEY, JSON.stringify({ ...(prev && typeof prev === 'object' ? prev : {}), name, phone }))
  } catch { /* ok */ }
}
