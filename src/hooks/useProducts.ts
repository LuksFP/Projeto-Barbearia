// Estado da loja no painel: catálogo + pedidos (do mês e reservas em aberto).
// A venda nasce no site do cliente; aqui a equipe marca "retirou" ou cancela.
// Real: Supabase (estoque é mexido pelo banco). Demo: localStorage com
// exemplos, mesmas regras reproduzidas aqui — e o site demo (/b/atlas) grava
// os pedidos no mesmo lugar, então dá pra ver o fluxo inteiro sem banco.
import { errorText, planLimitError, planLimitMessage } from '@/lib/errors'
import { useCallback, useEffect, useState } from 'react'
import { getDemoBarbershop, isDemoMode } from '@/lib/demo'
import {
  productRepository,
  type OrderItem,
  type OrderStatus,
  type Product,
  type ProductInput,
  type ProductSale,
} from '@/repositories/productRepository'
import type { PublicProduct, StoreMode } from '@/repositories/publicStoreRepository'
import { bumpLimit, hasFullStore, storeLimitMessage } from '@/lib/storePlan'
import type { SaasPlan } from '@/types/saas'

export const monthStartISO = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1).toISOString()

interface DemoState {
  products: Product[]
  sales: ProductSale[]
  /** Chaves de Configurações no demo (no banco: barbershops.store_enabled/bump_enabled) */
  storeEnabled?: boolean
  bumpEnabled?: boolean
}

/** Plano da barbearia demo (mendes = Básico, corvo = Pro, atlas = Premium). */
export function demoPlanOf(bsId: string): SaasPlan | null {
  for (const plan of ['basic', 'pro', 'premium'] as const) {
    if (getDemoBarbershop(plan).id === bsId) return plan
  }
  return null
}

const DEMO_KEY_SUFFIX: Partial<Record<SaasPlan, string>> = { basic: ':basico', pro: ':pro' }
const demoKey = (bsId: string) => `barberos:loja2:${bsId}${DEMO_KEY_SUFFIX[demoPlanOf(bsId) ?? 'premium'] ?? ''}`

function demoSeed(bsId: string): DemoState {
  const p = (id: string, name: string, category: string, price: number, cost: number, stock: number, description = ''): Product => ({
    id, barbershopId: bsId, name, description, category, price, cost, stock, lowStockAt: 2,
    imageUrls: [], visibleOnSite: true, inBump: true, active: true,
  })
  const products = [
    p('demo-p1', 'Pomada efeito matte 120g', 'Cabelo', 45, 22, 8, 'Fixação média, sem brilho.'),
    p('demo-p2', 'Óleo para barba 30ml', 'Barba', 38, 15, 2, 'Amacia e perfuma a barba.'),
    p('demo-p3', 'Balm pós-barba', 'Barba', 32, 14, 0),
    p('demo-p4', 'Shampoo anticaspa 250ml', 'Cabelo', 29, 12, 5),
    p('demo-p5', 'Pente de madeira', 'Acessórios', 18, 6, 12),
  ]
  const now = Date.now()
  const line = (orderId: string, prod: Product, quantity: number, hoursAgo: number, client: string, status: OrderStatus, withBooking: boolean): ProductSale => ({
    id: `${orderId}-${prod.id}`, orderId, productId: prod.id, productName: prod.name, quantity,
    unitPrice: prod.price, unitCost: prod.cost, total: quantity * prod.price,
    clientName: client, clientPhone: '11987654321', appointmentId: withBooking ? 'demo-apt' : null, status,
    createdAt: new Date(now - hoursAgo * 3600_000).toISOString(),
  })
  const plan = demoPlanOf(bsId)
  if (plan === 'basic') {
    return { products: [products[0]], sales: [line('demo-o1', products[0], 1, 3, 'Rafael Souza', 'reservado', true)] }
  }
  if (plan === 'pro') {
    const three = [products[0], products[1], products[4]]
    return {
      products: three,
      sales: [
        line('demo-o1', products[0], 1, 3, 'Rafael Souza', 'reservado', true),
        line('demo-o2', products[1], 2, 26, 'Marcos Lima', 'retirado', true),
      ],
    }
  }
  return {
    products,
    sales: [
      line('demo-o1', products[0], 1, 3, 'Rafael Souza', 'reservado', true),
      line('demo-o1', products[4], 1, 3, 'Rafael Souza', 'reservado', true),
      line('demo-o2', products[1], 2, 26, 'Marcos Lima', 'retirado', false),
      line('demo-o3', products[3], 1, 50, 'Bruno Alves', 'retirado', true),
    ],
  }
}

function loadDemo(bsId: string): DemoState {
  try {
    const raw = localStorage.getItem(demoKey(bsId))
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && 'products' in parsed && 'sales' in parsed) {
        const st = parsed as DemoState
        // Estado salvo antes do "Leve junto" configurável: todo produto entra
        return { ...st, products: st.products.map(p => ({ ...p, inBump: p.inBump ?? true })) }
      }
    }
  } catch {
    // corrompido: volta pros exemplos
  }
  return demoSeed(bsId)
}

const saveDemo = (bsId: string, s: DemoState) => {
  try { localStorage.setItem(demoKey(bsId), JSON.stringify(s)) } catch { /* sem localStorage */ }
}

/** Erros do banco que fazem sentido pro barbeiro; o resto vira mensagem genérica. */
export function productErrorMessage(err: unknown): string {
  const plan = planLimitMessage(err)
  if (plan) return plan
  const msg = errorText(err)
  if (/cancelado não volta|Mudança de status/.test(msg)) return msg
  if (/row-level security|violates row-level|42501|permission denied/.test(msg)) return 'Só o dono ou admin da barbearia pode fazer isso.'
  if (/Upload falhou|Imagem muito grande|Arquivo inválido|ler essa imagem/.test(msg)) return msg
  return 'Não deu certo. Tente de novo em instantes.'
}

const visibleSales = (sales: ProductSale[]) => {
  const since = monthStartISO()
  return sales.filter(x => x.createdAt >= since || x.status === 'reservado')
}

export function useProducts(barbershopId: string | undefined) {
  const demo = isDemoMode()
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<ProductSale[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!barbershopId) return
    if (demo) {
      const s = loadDemo(barbershopId)
      setProducts(s.products.filter(p => p.active))
      setSales(visibleSales(s.sales))
      setLoading(false)
      return
    }
    const [p, s] = await Promise.all([
      productRepository.list(barbershopId),
      productRepository.listSales(barbershopId, monthStartISO()),
    ])
    setProducts(p)
    setSales(s)
    setLoading(false)
  }, [barbershopId, demo])

  useEffect(() => {
    reload().catch(() => setLoading(false))
    // Pedido novo do site: aparece quando o barbeiro volta pra aba/app
    const onVisible = () => { if (document.visibilityState === 'visible') void reload().catch(() => {}) }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [reload])

  // Demo: aplica a mudança no estado salvo e recarrega a tela
  const mutateDemo = (fn: (s: DemoState) => DemoState) => {
    if (!barbershopId) return
    const next = fn(loadDemo(barbershopId))
    saveDemo(barbershopId, next)
    setProducts(next.products.filter(p => p.active))
    setSales(visibleSales(next.sales))
  }

  const save = async (input: ProductInput, id?: string): Promise<Product> => {
    if (!barbershopId) throw new Error('sem barbearia')
    if (demo) {
      const plan = demoPlanOf(barbershopId)
      const limit = bumpLimit(plan)
      if (!id && limit !== null && loadDemo(barbershopId).products.filter(p => p.active).length >= limit) {
        throw planLimitError(storeLimitMessage(plan))
      }
      const before = loadDemo(barbershopId).products.find(p => p.id === id)
      const product: Product = { id: id ?? `demo-${crypto.randomUUID()}`, barbershopId, active: true, inBump: before?.inBump ?? true, ...input }
      mutateDemo(s => ({
        ...s,
        products: id ? s.products.map(p => (p.id === id ? product : p)) : [...s.products, product],
      }))
      return product
    }
    const saved = id ? await productRepository.update(id, input) : await productRepository.create(barbershopId, input)
    setProducts(prev => {
      const rest = prev.filter(p => p.id !== saved.id)
      return [...rest, saved].sort((a, b) => a.name.localeCompare(b.name))
    })
    return saved
  }

  /** Exclui; se o produto já teve pedido, só tira da loja (o histórico aponta pra ele). */
  const remove = async (id: string): Promise<'deleted' | 'archived'> => {
    if (demo) {
      let result: 'deleted' | 'archived' = 'deleted'
      mutateDemo(s => {
        const sold = s.sales.some(x => x.productId === id)
        result = sold ? 'archived' : 'deleted'
        return {
          ...s,
          products: sold ? s.products.map(p => (p.id === id ? { ...p, active: false } : p)) : s.products.filter(p => p.id !== id),
        }
      })
      return result
    }
    const result = await productRepository.remove(id)
    setProducts(prev => prev.filter(p => p.id !== id))
    return result
  }

  /** Liga/desliga o produto no "Leve junto no dia". */
  const setInBump = async (id: string, inBump: boolean) => {
    if (demo) {
      mutateDemo(s => ({ ...s, products: s.products.map(p => (p.id === id ? { ...p, inBump } : p)) }))
      return
    }
    await productRepository.setInBump(id, inBump)
    setProducts(prev => prev.map(p => (p.id === id ? { ...p, inBump } : p)))
  }

  /** Retirou (reservado → retirado) ou cancelou (estoque volta). */
  const setOrderStatus = async (orderId: string, status: 'retirado' | 'cancelado') => {
    if (demo) {
      mutateDemo(s => {
        const back = new Map<string, number>()
        const sales = s.sales.map(x => {
          if (x.orderId !== orderId) return x
          if (status === 'retirado' && x.status === 'reservado') return { ...x, status }
          if (status === 'cancelado' && x.status !== 'cancelado') {
            back.set(x.productId, (back.get(x.productId) ?? 0) + x.quantity)
            return { ...x, status }
          }
          return x
        })
        return { ...s, sales, products: s.products.map(p => ({ ...p, stock: p.stock + (back.get(p.id) ?? 0) })) }
      })
      return
    }
    await productRepository.setOrderStatus(orderId, status)
    await reload() // estoque novo vem do banco
  }

  return { products, sales, loading, demo, save, remove, setInBump, setOrderStatus, reload }
}

// ─── Demo do site do cliente ─────────────────────────────────────────────────

/** Chaves de Configurações no demo. */
export function demoStoreSettings(bsId: string): { storeEnabled: boolean; bumpEnabled: boolean } {
  const s = loadDemo(bsId)
  return { storeEnabled: s.storeEnabled ?? true, bumpEnabled: s.bumpEnabled ?? true }
}

export function saveDemoStoreSettings(bsId: string, next: { storeEnabled?: boolean; bumpEnabled?: boolean }) {
  saveDemo(bsId, { ...loadDemo(bsId), ...next })
}

/** Mesmas regras de public_store_mode / barbershop_bump_products. */
function demoRules(bsId: string) {
  const s = loadDemo(bsId)
  const plan = demoPlanOf(bsId)
  const { storeEnabled, bumpEnabled } = demoStoreSettings(bsId)
  const open = hasFullStore(plan) && storeEnabled
  const onSite = s.products.filter(p => p.active && p.visibleOnSite)
  const limit = bumpLimit(plan)
  const bumpIds = new Set(
    bumpEnabled ? onSite.filter(p => p.inBump).slice(0, limit ?? undefined).map(p => p.id) : [],
  )
  const mode: StoreMode = open ? 'loja' : bumpEnabled ? 'leve_junto' : 'nenhuma'
  return { s, open, onSite, bumpIds, mode }
}

export function demoPublicStore(bsId: string): { mode: StoreMode; products: PublicProduct[] } {
  const { open, onSite, bumpIds, mode } = demoRules(bsId)
  const products = onSite
    .filter(p => open || bumpIds.has(p.id))
    .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    .map(p => ({
      id: p.id, name: p.name, description: p.description, category: p.category,
      price: p.price, imageUrls: p.imageUrls, available: Math.min(p.stock, 10), inBump: bumpIds.has(p.id),
    }))
  return { mode, products }
}

/** Mesmas regras do public_place_product_order: tudo ou nada, baixa estoque. */
export function demoPlaceOrder(bsId: string, input: { items: OrderItem[]; clientName: string; clientPhone: string; withBooking: boolean }): string {
  const { s, open, bumpIds } = demoRules(bsId)
  if (!open && !input.withBooking) throw new Error('Produto indisponível')
  const orderId = `demo-${crypto.randomUUID()}`
  const lines: ProductSale[] = []
  const stock = new Map(s.products.map(p => [p.id, p.stock]))
  for (const it of input.items) {
    const prod = s.products.find(p => p.id === it.productId && p.active && p.visibleOnSite && (open || bumpIds.has(p.id)))
    if (!prod) throw new Error('Produto indisponível')
    const left = stock.get(prod.id) ?? 0
    if (left < it.quantity) throw new Error(`Sem estoque suficiente: ${prod.name}`)
    stock.set(prod.id, left - it.quantity)
    lines.push({
      id: `${orderId}-${prod.id}`, orderId, productId: prod.id, productName: prod.name, quantity: it.quantity,
      unitPrice: prod.price, unitCost: prod.cost, total: it.quantity * prod.price,
      clientName: input.clientName, clientPhone: input.clientPhone.replace(/\D/g, ''),
      appointmentId: input.withBooking ? 'demo-apt' : null, status: 'reservado', createdAt: new Date().toISOString(),
    })
  }
  saveDemo(bsId, {
    ...s,
    products: s.products.map(p => ({ ...p, stock: stock.get(p.id) ?? p.stock })),
    sales: [...lines, ...s.sales],
  })
  return orderId
}

/** Demo do Financeiro: loja por mês. O mês atual usa os pedidos do demo;
 *  os anteriores são estimados a partir dos serviços (10–18% deles, lucro ~48%). */
export function demoStoreMonths(bsId: string, servicesByMonth: Array<{ month: string; total: number }>) {
  const current = new Date().toISOString().slice(0, 7)
  const demoSales = loadDemo(bsId).sales.filter(s => s.status !== 'cancelado')
  return servicesByMonth.map((m, i) => {
    if (m.month === current) {
      const mine = demoSales.filter(s => s.createdAt.slice(0, 7) === current)
      if (mine.length) {
        return {
          month: m.month,
          revenue: mine.reduce((a, s) => a + s.total, 0),
          profit: mine.reduce((a, s) => a + (s.unitCost === null ? 0 : (s.unitPrice - s.unitCost) * s.quantity), 0),
          items: mine.reduce((a, s) => a + s.quantity, 0),
          hasCost: mine.some(s => s.unitCost !== null),
        }
      }
    }
    const ratio = 0.1 + ((i * 37) % 9) / 100
    const revenue = Math.round(m.total * ratio)
    return { month: m.month, revenue, profit: Math.round(revenue * 0.48), items: Math.max(1, Math.round(revenue / 38)), hasCost: true }
  })
}
