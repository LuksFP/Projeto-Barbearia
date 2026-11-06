// Estado da loja no painel: catálogo + vendas do mês corrente.
// Real: Supabase (estoque é baixado pelo banco). Demo: localStorage com
// exemplos, mesma regra de estoque reproduzida aqui.
import { useCallback, useEffect, useState } from 'react'
import { isDemoMode } from '@/lib/demo'
import {
  productRepository,
  type Product,
  type ProductInput,
  type ProductSale,
  type SaleInput,
} from '@/repositories/productRepository'

export const monthStartISO = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1).toISOString()

interface DemoState {
  products: Product[]
  sales: ProductSale[]
}

const demoKey = (bsId: string) => `barberos:loja:${bsId}`

function demoSeed(bsId: string): DemoState {
  const p = (id: string, name: string, category: string, price: number, cost: number, stock: number, description = ''): Product => ({
    id, barbershopId: bsId, name, description, category, price, cost, stock, lowStockAt: 2,
    imageUrls: [], visibleOnSite: true, active: true,
  })
  const products = [
    p('demo-p1', 'Pomada efeito matte 120g', 'Cabelo', 45, 22, 8, 'Fixação média, sem brilho.'),
    p('demo-p2', 'Óleo para barba 30ml', 'Barba', 38, 15, 2),
    p('demo-p3', 'Balm pós-barba', 'Barba', 32, 14, 0),
    p('demo-p4', 'Shampoo anticaspa 250ml', 'Cabelo', 29, 12, 5),
    p('demo-p5', 'Pente de madeira', 'Acessórios', 18, 6, 12),
  ]
  const now = Date.now()
  const sale = (id: string, prod: Product, quantity: number, hoursAgo: number, seller: string): ProductSale => ({
    id, productId: prod.id, productName: prod.name, quantity, unitPrice: prod.price, unitCost: prod.cost,
    total: quantity * prod.price, sellerName: seller, clientName: null, paymentMethod: 'pix',
    createdAt: new Date(now - hoursAgo * 3600_000).toISOString(),
  })
  return {
    products,
    sales: [
      sale('demo-s1', products[0], 1, 3, 'Diego Matos'),
      sale('demo-s2', products[1], 2, 26, 'Caio Brito'),
      sale('demo-s3', products[4], 1, 50, 'Diego Matos'),
    ],
  }
}

function loadDemo(bsId: string): DemoState {
  try {
    const raw = localStorage.getItem(demoKey(bsId))
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && 'products' in parsed && 'sales' in parsed) return parsed as DemoState
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
  const msg = err instanceof Error ? err.message : (err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : '')
  if (/Estoque insuficiente/.test(msg)) return 'Estoque insuficiente. Alguém pode ter vendido agora — confira o estoque.'
  if (/Preço acima/.test(msg)) return 'O valor não pode passar do preço do produto.'
  if (/row-level security|violates row-level|42501/.test(msg)) return 'Só o dono ou admin da barbearia pode fazer isso.'
  if (/Upload falhou|Imagem muito grande|Arquivo inválido/.test(msg)) return msg
  return 'Não deu certo. Tente de novo em instantes.'
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
      setSales(s.sales.filter(x => x.createdAt >= monthStartISO()))
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
  }, [reload])

  // Demo: aplica a mudança no estado salvo e recarrega a tela
  const mutateDemo = (fn: (s: DemoState) => DemoState) => {
    if (!barbershopId) return
    const next = fn(loadDemo(barbershopId))
    saveDemo(barbershopId, next)
    setProducts(next.products.filter(p => p.active))
    setSales(next.sales.filter(x => x.createdAt >= monthStartISO()))
  }

  const save = async (input: ProductInput, id?: string): Promise<Product> => {
    if (!barbershopId) throw new Error('sem barbearia')
    if (demo) {
      const product: Product = { id: id ?? `demo-${crypto.randomUUID()}`, barbershopId, active: true, ...input }
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

  /** Exclui; se o produto já vendeu, só tira da loja (o histórico aponta pra ele). */
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

  const sell = async (input: SaleInput) => {
    if (!barbershopId) return
    if (demo) {
      const prod = loadDemo(barbershopId).products.find(p => p.id === input.productId)
      if (!prod || prod.stock < input.quantity) throw new Error('Estoque insuficiente')
      if (input.unitPrice > prod.price) throw new Error('Preço acima do preço do produto')
      const sale: ProductSale = {
        id: `demo-${crypto.randomUUID()}`, productId: prod.id, productName: prod.name, quantity: input.quantity,
        unitPrice: input.unitPrice, unitCost: prod.cost, total: input.quantity * input.unitPrice,
        sellerName: input.sellerName, clientName: input.clientName, paymentMethod: input.paymentMethod,
        createdAt: new Date().toISOString(),
      }
      mutateDemo(s => ({
        products: s.products.map(p => (p.id === prod.id ? { ...p, stock: p.stock - input.quantity } : p)),
        sales: [sale, ...s.sales],
      }))
      return
    }
    await productRepository.sell(barbershopId, input)
    await reload() // estoque novo vem do banco
  }

  const reverseSale = async (sale: ProductSale) => {
    if (demo) {
      mutateDemo(s => ({
        products: s.products.map(p => (p.id === sale.productId ? { ...p, stock: p.stock + sale.quantity } : p)),
        sales: s.sales.filter(x => x.id !== sale.id),
      }))
      return
    }
    await productRepository.reverseSale(sale.id)
    await reload()
  }

  return { products, sales, loading, demo, save, remove, sell, reverseSale, reload }
}

/** Demo do Financeiro: loja por mês. O mês atual usa as vendas feitas no demo;
 *  os anteriores são estimados a partir dos serviços (10–18% deles, lucro ~48%). */
export function demoStoreMonths(bsId: string, servicesByMonth: Array<{ month: string; total: number }>) {
  const current = new Date().toISOString().slice(0, 7)
  const demoSales = loadDemo(bsId).sales
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
