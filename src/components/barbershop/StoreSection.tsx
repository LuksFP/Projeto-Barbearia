// Vitrine da loja na página inicial do site: alguns produtos e o caminho pra
// loja completa (/b/:slug/loja). Some quando a barbearia não tem produto no site.
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { PublicProduct } from '@/repositories/publicStoreRepository'
import ProductCard from '@/components/barbershop/store/ProductCard'

interface Props {
  slug: string
  products: PublicProduct[]
  primary: string
}

const StoreSection = ({ slug, products, primary }: Props) => {
  if (products.length === 0) return null
  const featured = products.filter(p => p.available > 0).slice(0, 4)
  const show = featured.length ? featured : products.slice(0, 4)

  return (
    <section id="loja" className="py-24 bg-[#0d0d0d] scroll-mt-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div className="max-w-lg">
            <h2 className="font-heading text-4xl md:text-5xl tracking-wider text-white">LOJA</h2>
            <p className="text-white/55 text-sm font-body mt-3">
              O que a gente usa na cadeira, pra você levar pra casa. Reserve aqui e retire na barbearia, pagando lá.
            </p>
          </div>
          <Link to={`/b/${slug}/loja`} className="flex items-center gap-2 text-sm font-body font-semibold px-4 py-2.5 rounded-md border transition-colors hover:bg-white/[0.04]"
            style={{ borderColor: primary + '66', color: primary }}>
            Ver loja completa{products.length > show.length ? ` (${products.length})` : ''}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {/* Celular: faixa que rola de lado; desktop: 4 colunas */}
        <div className="flex md:grid md:grid-cols-4 gap-4 overflow-x-auto snap-x snap-mandatory -mx-6 px-6 md:mx-0 md:px-0 pb-2">
          {show.map(p => (
            <div key={p.id} className="w-[46%] sm:w-[31%] md:w-auto shrink-0 snap-start">
              <ProductCard product={p} slug={slug} primary={primary} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default StoreSection
