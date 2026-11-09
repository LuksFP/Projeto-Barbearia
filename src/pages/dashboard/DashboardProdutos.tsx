// Loja da barbearia (lado do barbeiro): catálogo, estoque e os pedidos que
// chegam do site do cliente (reserva avulsa ou "leve junto" no agendamento).
// Dono/admin cadastra e edita; a equipe marca retirado ou cancela.
// Básico: 1 produto, Pro: até 3 — oferecidos no fim do agendamento ("Leve
// junto"; o banco trava o resto). Premium: loja completa no site. As chaves
// e a escolha do "Leve junto" ficam em Configurações › Vendas no site.

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Search, Package, ArrowUpRight } from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
import { useSaasAccount } from '@/contexts/SaasAccountContext'
import { useProducts, productErrorMessage } from '@/hooks/useProducts'
import { bumpLimit, hasFullStore } from '@/lib/storePlan'
import { toast } from '@/hooks/use-toast'
import ProductFormDialog from '@/components/dashboard/products/ProductFormDialog'
import OrdersList, { groupOrders } from '@/components/dashboard/products/OrdersList'
import type { Product } from '@/repositories/productRepository'

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

type StockFilter = 'todos' | 'acabando' | 'esgotado'

const stockState = (p: Product): 'ok' | 'acabando' | 'esgotado' =>
  p.stock === 0 ? 'esgotado' : p.stock <= p.lowStockAt ? 'acabando' : 'ok'

const DashboardProdutos = () => {
  const { barbershop, isAdmin } = useTenant()
  const { account } = useSaasAccount()
  const fullStore = hasFullStore(account?.plan)
  const limit = bumpLimit(account?.plan)
  const planName = account?.plan === 'pro' ? 'Pro' : 'Básico'
  const { products, sales, loading, demo, save, remove, setOrderStatus } = useProducts(barbershop?.id)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [stockFilter, setStockFilter] = useState<StockFilter>('todos')
  const [editing, setEditing] = useState<Product | null>(null)
  const [formOpen, setFormOpen] = useState(false)

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
  // Venda conta na hora do pedido (como no Financeiro); cancelado não conta
  const monthSince = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const counted = sales.filter(s => s.status !== 'cancelado' && s.createdAt >= monthSince)
  const soldTotal = counted.reduce((a, s) => a + s.total, 0)
  const soldItems = counted.reduce((a, s) => a + s.quantity, 0)
  const withCost = counted.filter(s => s.unitCost !== null)
  const orders = useMemo(() => groupOrders(sales), [sales])
  const toPickUp = orders.filter(o => o.status === 'reservado').length
  const profit = withCost.reduce((a, s) => a + (s.unitPrice - (s.unitCost ?? 0)) * s.quantity, 0)
  const lowCount = products.filter(p => stockState(p) === 'acabando').length
  const outCount = products.filter(p => stockState(p) === 'esgotado').length

  if (!barbershop) return null

  const canAdd = isAdmin && (limit === null || products.length < limit)

  const openNew = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (p: Product) => { setEditing(p); setFormOpen(true) }

  const changeStatus = async (orderId: string, status: 'retirado' | 'cancelado') => {
    try {
      await setOrderStatus(orderId, status)
      toast(status === 'retirado'
        ? { title: 'Marcado como retirado' }
        : { title: 'Pedido cancelado', description: 'Os produtos voltaram pro estoque.' })
    } catch (err: unknown) {
      toast({ title: 'Não deu certo', description: productErrorMessage(err), variant: 'destructive' })
    }
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-wrap items-end gap-4">
        <div className="mr-auto">
          <h1 className="font-heading text-3xl tracking-wide text-white">LOJA</h1>
          <p className="text-white/65 text-sm font-body mt-1">
            {fullStore
              ? 'O cliente reserva pelo site da barbearia, sozinho ou junto com o horário, e paga aqui. O estoque desce na hora.'
              : `No ${planName} você oferece ${limit === 1 ? '1 produto' : `até ${limit} produtos`} no fim do agendamento, no “Leve junto no dia”. O cliente separa e paga aqui junto com o corte.`}
          </p>
        </div>
        {canAdd && (
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-amber-500 text-black text-sm font-semibold font-body hover:bg-amber-400 transition-colors">
            <Plus className="w-4 h-4" />Cadastrar produto
          </button>
        )}
      </div>

      {!fullStore && (
        <div className="border-l-2 border-amber-500/60 pl-4 py-1">
          <p className="text-white/80 text-sm font-body">
            {limit !== null && products.length > limit
              ? `Só ${limit === 1 ? 'o mais antigo aparece' : `os ${limit} mais antigos aparecem`} no agendamento. Os outros ficam guardados aqui até você voltar pro Premium ou arquivar.`
              : limit !== null && products.length >= limit && isAdmin
                ? `${products.length === 1 ? 'Seu produto já está cadastrado' : `Os ${limit} produtos já estão cadastrados`}. Pra trocar, edite ou exclua e cadastre outro.`
                : 'O produto aparece pro cliente na última etapa do agendamento, com foto e preço.'}{' '}
            <Link to="/dashboard/configuracoes" className="text-amber-300 hover:text-amber-200 underline underline-offset-2">Ligar ou desligar em Configurações</Link>
          </p>
          <Link to="/dashboard/assinatura" className="mt-1 inline-flex items-center gap-1 text-amber-300 text-xs font-body hover:text-amber-200">
            Loja completa no Premium: produtos sem limite, página da loja no site e reserva sem horário
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Resumo do mês numa linha só, com os alertas de estoque clicáveis */}
      {products.length > 0 && (
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-y border-[#1f1f1f] py-4">
          <p className="font-body text-sm text-white/70">
            Em {month}:{' '}
            <span className="font-heading text-2xl tracking-wide text-white align-baseline">{brl(soldTotal)}</span>{' '}
            em {soldItems} {soldItems === 1 ? 'item' : 'itens'}
            {withCost.length > 0 && <> · lucro <span className="text-emerald-400">{brl(profit)}</span></>}
          </p>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            {toPickUp > 0 && (
              <a href="#pedidos" className="px-2.5 py-1 rounded text-xs font-body border border-amber-500/40 bg-amber-500/10 text-amber-200">
                {toPickUp} {toPickUp === 1 ? 'pedido pra retirar' : 'pedidos pra retirar'}
              </a>
            )}
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

      {fullStore && products.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-white/55 absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar produto" aria-label="Buscar produto"
              className="w-full bg-[#141414] border border-[#262626] rounded-md pl-9 pr-3 py-2 text-base sm:text-sm text-white font-body placeholder:text-white/40 focus:outline-none focus:border-amber-500/40" />
          </div>
          {categories.length > 1 && [null, ...categories].map(c => (
            <button key={c ?? 'todas'} onClick={() => setCategory(c)} aria-pressed={category === c}
              className={`px-3 py-1.5 rounded-md text-xs font-body border transition-colors ${category === c ? 'border-amber-500/40 bg-amber-500/[0.1] text-amber-300' : 'border-[#262626] text-white/65 hover:text-white/75'}`}>
              {c ?? 'Todas'}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="text-white/55 text-sm font-body">Carregando a loja…</p>
      ) : products.length === 0 ? (
        <div className="py-12 max-w-sm">
          <Package className="w-7 h-7 text-amber-400/60 mb-3" />
          <p className="text-white/80 font-body">{fullStore ? 'Nenhum produto na loja ainda.' : 'Nenhum produto no agendamento ainda.'}</p>
          <p className="text-white/65 text-sm font-body mt-1">
            {!isAdmin
              ? 'O dono da barbearia cadastra os produtos; os pedidos aparecem aqui.'
              : fullStore
                ? 'Cadastre pomada, óleo, shampoo… com preço e estoque. Eles aparecem na loja do site e no agendamento.'
                : 'Escolha o que mais sai no balcão, uma pomada ou um óleo, com preço e estoque. Ele aparece no fim do agendamento.'}
          </p>
          {isAdmin && (
            <button onClick={openNew} className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-md border border-amber-500/40 text-amber-300 text-sm font-body hover:bg-amber-500/10">
              <Plus className="w-4 h-4" />Cadastrar o primeiro
            </button>
          )}
        </div>
      ) : visible.length === 0 ? (
        <p className="text-white/60 text-sm font-body py-6">Nenhum produto com esse filtro.</p>
      ) : (
        <ul className="divide-y divide-[#1c1c1c]">
          {visible.map(p => {
            const st = stockState(p)
            return (
              <li key={p.id} className="flex items-center gap-3 sm:gap-4 py-3">
                <div className="w-12 h-12 rounded-md bg-[#181818] border border-[#242424] overflow-hidden shrink-0 flex items-center justify-center">
                  {p.imageUrls[0]
                    ? <img src={p.imageUrls[0]} alt="" loading="lazy" className="w-full h-full object-cover" />
                    : <span className="font-heading text-lg text-white/55">{p.name.slice(0, 1).toUpperCase()}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-body font-medium leading-snug line-clamp-2 break-words">{p.name}</p>
                  <p className="text-xs font-body mt-0.5">
                    <span className={`tabular-nums whitespace-nowrap ${st === 'esgotado' ? 'text-red-400' : st === 'acabando' ? 'text-amber-400' : 'text-white/65'}`}>
                      {st === 'esgotado' ? 'esgotado' : `${p.stock} em estoque`}
                    </span>
                    <span className="text-white/55"> · {p.category}{!p.visibleOnSite && ' · fora do site'}</span>
                  </p>
                </div>
                <p className="text-white text-sm font-body tabular-nums shrink-0">{brl(p.price)}</p>
                <div className="flex items-center gap-1 shrink-0">
                  {isAdmin && (
                    <button onClick={() => openEdit(p)} aria-label={`Editar ${p.name}`} className="p-2 text-white/60 hover:text-white transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <section id="pedidos" className="scroll-mt-20">
        <h2 className="text-white text-sm font-semibold font-body">Pedidos do site</h2>
        <p className="text-white/55 text-xs font-body mt-0.5 mb-3">
          Os deste mês e qualquer reserva que ainda não foi retirada. Agendamento cancelado cancela os produtos dele sozinho.
        </p>
        {orders.length === 0 ? (
          <p className="text-white/55 text-sm font-body py-4">
            {fullStore
              ? 'Nenhum pedido ainda. Os produtos marcados “mostrar no site” aparecem na loja do site e no agendamento.'
              : 'Nenhum pedido ainda. Quando um cliente separar o produto ao agendar, o pedido aparece aqui.'}
          </p>
        ) : (
          <OrdersList orders={orders} onStatus={changeStatus} />
        )}
      </section>

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
    </div>
  )
}

export default DashboardProdutos
