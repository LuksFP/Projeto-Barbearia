// Loja da barbearia (lado do barbeiro): catálogo, estoque e venda no balcão.
// Dono/admin cadastra e edita; qualquer um da equipe vende. A vitrine no site
// do cliente vem numa próxima etapa (flag visible_on_site já existe).

import { useMemo, useState } from 'react'
import { Plus, Pencil, Search, Package, Undo2 } from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
import { useProducts, productErrorMessage } from '@/hooks/useProducts'
import { toast } from '@/hooks/use-toast'
import ProductFormDialog from '@/components/dashboard/products/ProductFormDialog'
import SellDialog from '@/components/dashboard/products/SellDialog'
import type { Product, ProductSale } from '@/repositories/productRepository'

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const PAY_LABEL: Record<string, string> = { pix: 'Pix', dinheiro: 'Dinheiro', cartao: 'Cartão' }

type StockFilter = 'todos' | 'acabando' | 'esgotado'

const stockState = (p: Product): 'ok' | 'acabando' | 'esgotado' =>
  p.stock === 0 ? 'esgotado' : p.stock <= p.lowStockAt ? 'acabando' : 'ok'

const when = (iso: string) => {
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return sameDay ? `hoje ${time}` : `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${time}`
}

const DashboardProdutos = () => {
  const { barbershop, tenantUser, isAdmin } = useTenant()
  const { products, sales, loading, demo, save, remove, sell, reverseSale } = useProducts(barbershop?.id)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [stockFilter, setStockFilter] = useState<StockFilter>('todos')
  const [editing, setEditing] = useState<Product | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [selling, setSelling] = useState<Product | null>(null)
  const [reversing, setReversing] = useState<string | null>(null)

  const categories = useMemo(() => [...new Set(products.map(p => p.category))].sort(), [products])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter(p =>
      (!q || p.name.toLowerCase().includes(q)) &&
      (!category || p.category === category) &&
      (stockFilter === 'todos' || stockState(p) === stockFilter),
    )
  }, [products, query, category, stockFilter])

  const month = new Date().toLocaleDateString('pt-BR', { month: 'long' })
  const soldTotal = sales.reduce((a, s) => a + s.total, 0)
  const soldItems = sales.reduce((a, s) => a + s.quantity, 0)
  const withCost = sales.filter(s => s.unitCost !== null)
  const profit = withCost.reduce((a, s) => a + (s.unitPrice - (s.unitCost ?? 0)) * s.quantity, 0)
  const lowCount = products.filter(p => stockState(p) === 'acabando').length
  const outCount = products.filter(p => stockState(p) === 'esgotado').length

  if (!barbershop) return null

  const openNew = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (p: Product) => { setEditing(p); setFormOpen(true) }

  const doReverse = async (s: ProductSale) => {
    if (reversing !== s.id) { setReversing(s.id); return }
    try {
      await reverseSale(s)
      toast({ title: 'Venda estornada', description: `${s.quantity}× ${s.productName} voltou pro estoque.` })
    } catch (err: unknown) {
      toast({ title: 'Não deu pra estornar', description: productErrorMessage(err), variant: 'destructive' })
    } finally {
      setReversing(null)
    }
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-wrap items-end gap-4">
        <div className="mr-auto">
          <h1 className="font-heading text-3xl tracking-wide text-white">LOJA</h1>
          <p className="text-white/45 text-sm font-body mt-1">Produtos que você vende no balcão, com estoque que desce a cada venda.</p>
        </div>
        {isAdmin && (
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-amber-500 text-black text-sm font-semibold font-body hover:bg-amber-400 transition-colors">
            <Plus className="w-4 h-4" />Cadastrar produto
          </button>
        )}
      </div>

      {/* Resumo do mês numa linha só, com os alertas de estoque clicáveis */}
      {products.length > 0 && (
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-y border-[#1f1f1f] py-4">
          <p className="font-body text-sm text-white/50">
            Em {month}:{' '}
            <span className="font-heading text-2xl tracking-wide text-white align-baseline">{brl(soldTotal)}</span>{' '}
            em {soldItems} {soldItems === 1 ? 'item' : 'itens'}
            {withCost.length > 0 && <> · lucro <span className="text-emerald-400">{brl(profit)}</span></>}
          </p>
          <div className="flex gap-2 sm:ml-auto">
            {(['acabando', 'esgotado'] as const).map(f => {
              const n = f === 'acabando' ? lowCount : outCount
              if (n === 0) return null
              const on = stockFilter === f
              return (
                <button key={f} onClick={() => setStockFilter(on ? 'todos' : f)} aria-pressed={on}
                  className={`px-2.5 py-1 rounded text-xs font-body border transition-colors ${f === 'esgotado'
                    ? on ? 'bg-red-500/20 border-red-500/50 text-red-200' : 'border-red-500/30 text-red-300'
                    : on ? 'bg-amber-500/20 border-amber-500/50 text-amber-200' : 'border-amber-500/30 text-amber-300'}`}>
                  {n} {f === 'acabando' ? 'acabando' : n === 1 ? 'esgotado' : 'esgotados'}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {products.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar produto" aria-label="Buscar produto"
              className="w-full bg-[#141414] border border-[#262626] rounded-md pl-9 pr-3 py-2 text-base sm:text-sm text-white font-body placeholder:text-white/25 focus:outline-none focus:border-amber-500/40" />
          </div>
          {categories.length > 1 && [null, ...categories].map(c => (
            <button key={c ?? 'todas'} onClick={() => setCategory(c)} aria-pressed={category === c}
              className={`px-3 py-1.5 rounded-md text-xs font-body border transition-colors ${category === c ? 'border-amber-500/40 bg-amber-500/[0.1] text-amber-300' : 'border-[#262626] text-white/45 hover:text-white/75'}`}>
              {c ?? 'Todas'}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-white/30 text-sm font-body">Carregando a loja…</p>
      ) : products.length === 0 ? (
        <div className="py-12 max-w-sm">
          <Package className="w-7 h-7 text-amber-400/60 mb-3" />
          <p className="text-white/80 font-body">Nenhum produto na loja ainda.</p>
          <p className="text-white/40 text-sm font-body mt-1">
            {isAdmin
              ? 'Cadastre pomada, óleo, shampoo… com preço e estoque. Daí é só tocar em “Vender” no balcão.'
              : 'O dono da barbearia cadastra os produtos; depois você vende por aqui.'}
          </p>
          {isAdmin && (
            <button onClick={openNew} className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-md border border-amber-500/40 text-amber-300 text-sm font-body hover:bg-amber-500/10">
              <Plus className="w-4 h-4" />Cadastrar o primeiro
            </button>
          )}
        </div>
      ) : visible.length === 0 ? (
        <p className="text-white/35 text-sm font-body py-6">Nenhum produto com esse filtro.</p>
      ) : (
        <ul className="divide-y divide-[#1c1c1c]">
          {visible.map(p => {
            const st = stockState(p)
            return (
              <li key={p.id} className="flex items-center gap-3 sm:gap-4 py-3">
                <div className="w-12 h-12 rounded-md bg-[#181818] border border-[#242424] overflow-hidden shrink-0 flex items-center justify-center">
                  {p.imageUrls[0]
                    ? <img src={p.imageUrls[0]} alt="" loading="lazy" className="w-full h-full object-cover" />
                    : <span className="font-heading text-lg text-white/25">{p.name.slice(0, 1).toUpperCase()}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-body font-medium leading-snug line-clamp-2 break-words">{p.name}</p>
                  <p className="text-xs font-body mt-0.5">
                    <span className={`tabular-nums whitespace-nowrap ${st === 'esgotado' ? 'text-red-400' : st === 'acabando' ? 'text-amber-400' : 'text-white/45'}`}>
                      {st === 'esgotado' ? 'esgotado' : `${p.stock} em estoque`}
                    </span>
                    <span className="text-white/30"> · {p.category}{!p.visibleOnSite && ' · fora do site'}</span>
                  </p>
                </div>
                <p className="text-white text-sm font-body tabular-nums shrink-0">{brl(p.price)}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setSelling(p)} disabled={p.stock === 0}
                    className="px-3 py-2 rounded-md text-xs font-semibold font-body bg-amber-500/[0.12] border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    Vender
                  </button>
                  {isAdmin && (
                    <button onClick={() => openEdit(p)} aria-label={`Editar ${p.name}`} className="p-2 text-white/35 hover:text-white transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {sales.length > 0 && (
        <section>
          <h2 className="text-white text-sm font-semibold font-body mb-3">Vendas de {month}</h2>
          <ol className="space-y-1">
            {sales.slice(0, 30).map(s => (
              <li key={s.id} className="flex items-center gap-3 text-sm font-body py-1.5">
                <span className="text-white/30 text-xs tabular-nums w-16 sm:w-24 shrink-0 leading-snug">{when(s.createdAt)}</span>
                <span className="text-white/75 min-w-0 flex-1 line-clamp-2 break-words leading-snug">
                  {s.quantity}× {s.productName}
                  <span className="text-white/35"> · {s.sellerName}{s.paymentMethod && ` · ${PAY_LABEL[s.paymentMethod]}`}{s.clientName && ` · ${s.clientName}`}</span>
                </span>
                <span className="text-white tabular-nums shrink-0">{brl(s.total)}</span>
                {isAdmin && (
                  <button onClick={() => void doReverse(s)} onBlur={() => setReversing(r => (r === s.id ? null : r))}
                    aria-label={`Estornar venda de ${s.productName}`}
                    className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors ${reversing === s.id ? 'bg-red-500/15 text-red-300' : 'text-white/25 hover:text-white/60'}`}>
                    <Undo2 className="w-3.5 h-3.5" />{reversing === s.id && 'Estornar?'}
                  </button>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
        barbershopId={barbershop.id}
        categories={categories}
        demo={demo}
        onSave={save}
        onRemove={remove}
      />
      <SellDialog
        product={selling}
        sellerName={tenantUser?.name?.trim() || 'Equipe'}
        onClose={() => setSelling(null)}
        onSell={sell}
      />
    </div>
  )
}

export default DashboardProdutos
