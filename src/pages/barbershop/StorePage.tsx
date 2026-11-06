// /b/:slug/loja — a loja inteira da barbearia: categorias, busca, ordenação.
import { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Search, ShoppingBag, Store } from 'lucide-react'
import type { PublicSiteOutletCtx } from '@/layouts/PublicSiteLayout'
import ProductCard from '@/components/barbershop/store/ProductCard'

type Sort = 'destaque' | 'menor' | 'maior' | 'az'

const SORTS: Array<{ id: Sort; label: string }> = [
  { id: 'destaque', label: 'Em destaque' },
  { id: 'menor', label: 'Menor preço' },
  { id: 'maior', label: 'Maior preço' },
  { id: 'az', label: 'Nome (A–Z)' },
]

const StorePage = () => {
  const { barbershop, products } = useOutletContext<PublicSiteOutletCtx>()
  const primary = barbershop.primaryColor
  const [category, setCategory] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('destaque')

  const categories = useMemo(() => {
    const count = new Map<string, number>()
    products.forEach(p => count.set(p.category, (count.get(p.category) ?? 0) + 1))
    return [...count.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [products])

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out = products.filter(p =>
      (!category || p.category === category) &&
      (!q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)),
    )
    const inStockFirst = (a: typeof out[number], b: typeof out[number]) => Number(b.available > 0) - Number(a.available > 0)
    if (sort === 'menor') out.sort((a, b) => inStockFirst(a, b) || a.price - b.price)
    else if (sort === 'maior') out.sort((a, b) => inStockFirst(a, b) || b.price - a.price)
    else if (sort === 'az') out.sort((a, b) => inStockFirst(a, b) || a.name.localeCompare(b.name))
    return out // "destaque" = ordem que o banco já devolve (com estoque primeiro)
  }, [products, category, query, sort])

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-6 pt-8 pb-24">
      <nav aria-label="Caminho" className="text-xs font-body text-white/45 mb-4">
        <Link to={`/b/${barbershop.slug}`} className="hover:text-white">{barbershop.name}</Link>
        <span className="mx-1.5">/</span>
        <span className="text-white/75">Loja</span>
      </nav>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-2 mb-8">
        <h1 className="font-heading text-5xl md:text-6xl tracking-wider text-white leading-none">LOJA</h1>
        <p className="text-white/55 text-sm font-body max-w-md pb-1">
          Os produtos que a gente usa na cadeira. Reserve pelo site e retire na barbearia, pagando lá.
        </p>
      </div>

      {products.length === 0 ? (
        <div className="py-20 text-center">
          <Store className="w-10 h-10 text-white/15 mx-auto mb-3" />
          <p className="text-white/70 font-body">A loja ainda não tem produtos.</p>
          <Link to={`/b/${barbershop.slug}#agendar`} className="inline-block mt-4 text-sm font-body underline underline-offset-4" style={{ color: primary }}>
            Marcar um horário
          </Link>
        </div>
      ) : (
        <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-10">
          {/* Categorias: coluna no desktop, faixa rolável no celular */}
          <aside className="mb-6 lg:mb-0">
            <p className="hidden lg:block text-white/45 text-xs font-body mb-3">Categorias</p>
            <ul className="flex lg:flex-col gap-2 lg:gap-0.5 overflow-x-auto -mx-5 px-5 lg:mx-0 lg:px-0 pb-1 lg:pb-0">
              {[[null, products.length] as const, ...categories].map(([cat, n]) => {
                const on = category === cat
                return (
                  <li key={cat ?? 'todas'} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setCategory(cat)}
                      aria-pressed={on}
                      className={`w-full flex items-center justify-between gap-3 text-left text-sm font-body px-3 py-2 rounded-md border lg:border-0 transition-colors ${on ? 'text-white' : 'text-white/60 hover:text-white border-[#262626]'}`}
                      style={on ? { borderColor: primary, backgroundColor: primary + '1a' } : undefined}
                    >
                      <span className="whitespace-nowrap">{cat ?? 'Tudo'}</span>
                      <span className="text-white/35 text-xs tabular-nums">{n}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </aside>

          <section aria-label="Produtos">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar na loja" aria-label="Buscar na loja"
                  className="w-full bg-[#141414] border border-[#262626] rounded-md pl-9 pr-3 py-2.5 text-base sm:text-sm text-white font-body placeholder:text-white/40 focus:outline-none focus:border-[#444]" />
              </div>
              <label className="flex items-center gap-2 text-sm font-body text-white/55">
                <span className="hidden sm:inline">Ordenar</span>
                <select value={sort} onChange={e => setSort(e.target.value as Sort)} aria-label="Ordenar"
                  className="bg-[#141414] border border-[#262626] rounded-md px-3 py-2.5 text-white text-base sm:text-sm font-body focus:outline-none focus:border-[#444]">
                  {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
            </div>

            <p className="text-white/45 text-xs font-body mb-4">
              {list.length} {list.length === 1 ? 'produto' : 'produtos'}{category ? ` em ${category}` : ''}
            </p>

            {list.length === 0 ? (
              <div className="py-16 text-center">
                <ShoppingBag className="w-8 h-8 text-white/15 mx-auto mb-3" />
                <p className="text-white/60 text-sm font-body">Nada encontrado com essa busca.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-8 sm:gap-x-5">
                {list.map(p => <ProductCard key={p.id} product={p} slug={barbershop.slug} primary={primary} />)}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default StorePage
