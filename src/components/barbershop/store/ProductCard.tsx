// Card de produto da loja: foto 4:5 (troca pra 2ª foto no hover, quando tem),
// nome, preço e "+" que joga direto na sacola sem sair da página.
import { Link } from 'react-router-dom'
import { Plus, Check } from 'lucide-react'
import ProductImage from './ProductImage'
import type { PublicProduct } from '@/repositories/publicStoreRepository'
import { brl, useBag } from './bag'

interface Props {
  product: PublicProduct
  slug: string
  primary: string
}

const ProductCard = ({ product: p, slug, primary }: Props) => {
  const bag = useBag()
  const soldOut = p.available === 0
  const inBag = bag.qtyOf(p.id)
  const full = inBag >= p.available
  const href = `/b/${slug}/loja/${p.id}`

  return (
    <article className="group relative">
      <Link to={href} className="block" aria-label={p.name}>
        <div className="relative aspect-[4/5] rounded-md overflow-hidden bg-[#151515]">
          <div className={`absolute inset-0 transition-opacity duration-500 ${p.imageUrls[1] ? 'group-hover:opacity-0' : ''}`}>
            <ProductImage product={p} primary={primary} dim={soldOut} />
          </div>
          {p.imageUrls[1] && (
            <img src={p.imageUrls[1]} alt="" loading="lazy"
              className="absolute inset-0 w-full h-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          )}
          {soldOut ? (
            <span className="absolute top-2.5 left-2.5 text-[11px] font-body font-semibold px-2 py-1 rounded-sm bg-black/80 text-white/70">Esgotado</span>
          ) : p.available <= 2 ? (
            <span className="absolute top-2.5 left-2.5 text-[11px] font-body font-semibold px-2 py-1 rounded-sm bg-black/80 text-amber-300">
              {p.available === 1 ? 'Última unidade' : 'Últimas 2'}
            </span>
          ) : null}
        </div>
      </Link>

      <div className="pt-3 flex items-start gap-2">
        <Link to={href} className="min-w-0 flex-1">
          <p className="text-white/50 text-[11px] font-body">{p.category}</p>
          <h3 className="text-white/90 text-sm font-body leading-snug line-clamp-2 mt-0.5 group-hover:text-white">{p.name}</h3>
          <p className="text-[15px] font-body font-semibold mt-1 tabular-nums" style={{ color: soldOut ? 'rgba(255,255,255,0.4)' : '#fff' }}>{brl(p.price)}</p>
        </Link>
        {!soldOut && (
          <button
            type="button"
            onClick={() => { if (!full) { bag.add(p.id); bag.open() } }}
            disabled={full}
            aria-label={inBag ? `${p.name}: ${inBag} na sacola` : `Adicionar ${p.name} à sacola`}
            title={full ? 'Você já pegou todas as unidades' : 'Adicionar à sacola'}
            className="shrink-0 w-9 h-9 mt-1 rounded-md border flex items-center justify-center transition-colors disabled:opacity-40"
            style={inBag ? { backgroundColor: primary, borderColor: primary, color: '#0a0a0a' } : { borderColor: '#2e2e2e', color: 'rgba(255,255,255,0.75)' }}
          >
            {inBag ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
        )}
      </div>
    </article>
  )
}

export default ProductCard
