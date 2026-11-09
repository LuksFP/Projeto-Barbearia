// /b/:slug/loja/:productId — página do produto, com link próprio pra mandar
// no WhatsApp/Instagram. Galeria, quantidade, sacola e relacionados.
import { useEffect, useState } from 'react'
import { Link, Navigate, useOutletContext, useParams } from 'react-router-dom'
import { Minus, Plus, ShoppingBag, Store, Share2, Check } from 'lucide-react'
import type { PublicSiteOutletCtx } from '@/layouts/PublicSiteLayout'
import ProductCard from '@/components/barbershop/store/ProductCard'
import ProductImage from '@/components/barbershop/store/ProductImage'
import { brl, useBag } from '@/components/barbershop/store/bag'
import { toast } from '@/hooks/use-toast'

const ProductPage = () => {
  const { barbershop, products, storeMode } = useOutletContext<PublicSiteOutletCtx>()
  const { productId } = useParams<{ productId: string }>()
  const bag = useBag()
  const primary = barbershop.primaryColor
  const product = products.find(p => p.id === productId)
  const [photo, setPhoto] = useState(0)
  const [qty, setQty] = useState(1)

  useEffect(() => { setPhoto(0); setQty(1) }, [productId])

  // SEO/compartilhamento: título da aba com o produto
  useEffect(() => {
    if (!product) return
    const prev = document.title
    document.title = `${product.name} · ${barbershop.name}`
    return () => { document.title = prev }
  }, [product, barbershop.name])

  // Básico não tem página de produto: ele aparece só no agendamento
  if (storeMode === 'leve_junto') return <Navigate to={`/b/${barbershop.slug}#agendar`} replace />

  if (!product) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <Store className="w-10 h-10 text-white/15 mx-auto mb-3" />
        <p className="text-white/75 font-body">{products.length ? 'Esse produto não está mais na loja.' : 'Carregando…'}</p>
        <Link to={`/b/${barbershop.slug}/loja`} className="inline-block mt-4 text-sm font-body underline underline-offset-4" style={{ color: primary }}>
          Ver a loja
        </Link>
      </div>
    )
  }

  const soldOut = product.available === 0
  const inBag = bag.qtyOf(product.id)
  const room = product.available - inBag
  const related = products.filter(p => p.id !== product.id && p.category === product.category && p.available > 0).slice(0, 4)
  const others = related.length ? related : products.filter(p => p.id !== product.id && p.available > 0).slice(0, 4)

  const addToBag = (openBag: boolean) => {
    if (room <= 0) return
    bag.add(product.id, Math.min(qty, room))
    if (openBag) bag.open()
    else toast({ title: 'Na sacola', description: `${Math.min(qty, room)}× ${product.name}` })
  }

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: product.name, url })
      else { await navigator.clipboard.writeText(url); toast({ title: 'Link copiado' }) }
    } catch { /* cancelou */ }
  }

  const photos = product.imageUrls

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-6 pt-6 pb-32 lg:pb-24">
      <nav aria-label="Caminho" className="text-xs font-body text-white/45 mb-5 truncate">
        <Link to={`/b/${barbershop.slug}`} className="hover:text-white">{barbershop.name}</Link>
        <span className="mx-1.5">/</span>
        <Link to={`/b/${barbershop.slug}/loja`} className="hover:text-white">Loja</Link>
        <span className="mx-1.5">/</span>
        <span className="text-white/75">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-14">
        {/* Galeria */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-[#141414]">
            <ProductImage product={product} index={photo} primary={primary} dim={soldOut} />
          </div>
          {photos.length > 1 && (
            <div className="flex gap-2 mt-3">
              {photos.map((u, i) => (
                <button key={u} type="button" onClick={() => setPhoto(i)} aria-label={`Ver foto ${i + 1}`} aria-pressed={i === photo}
                  className="w-16 h-20 rounded-md overflow-hidden border-2 transition-colors"
                  style={{ borderColor: i === photo ? primary : 'transparent' }}>
                  <img src={u} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Compra */}
        <div>
          <p className="text-white/55 text-sm font-body">{product.category}</p>
          <h1 className="text-white text-2xl sm:text-3xl font-body font-semibold leading-tight mt-1">{product.name}</h1>
          <p className="text-white text-3xl font-body font-semibold mt-4 tabular-nums">{brl(product.price)}</p>
          <p className="text-white/50 text-xs font-body mt-1">Pague na barbearia quando for retirar</p>

          <p className={`text-sm font-body mt-5 ${soldOut ? 'text-red-300' : product.available <= 2 ? 'text-amber-300' : 'text-emerald-300/90'}`}>
            {soldOut ? 'Esgotado no momento'
              : product.available <= 2 ? `Só ${product.available === 1 ? 'mais 1 unidade' : 'mais 2 unidades'}`
              : 'Disponível pra retirar'}
          </p>

          {!soldOut && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="flex items-center border border-[#2e2e2e] rounded-md">
                <button type="button" aria-label="Menos um" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}
                  className="w-11 h-11 flex items-center justify-center text-white/75 disabled:opacity-30"><Minus className="w-4 h-4" /></button>
                <span className="w-9 text-center text-white font-body tabular-nums" aria-live="polite">{qty}</span>
                <button type="button" aria-label="Mais um" onClick={() => setQty(q => Math.min(Math.max(1, room), q + 1))} disabled={qty >= room}
                  className="w-11 h-11 flex items-center justify-center text-white/75 disabled:opacity-30"><Plus className="w-4 h-4" /></button>
              </div>
              <button type="button" onClick={() => addToBag(true)} disabled={room <= 0}
                className="hidden lg:flex flex-1 min-w-[180px] h-11 items-center justify-center gap-2 rounded-md font-body font-bold text-sm disabled:opacity-40"
                style={{ backgroundColor: primary, color: '#0a0a0a' }}>
                <ShoppingBag className="w-4 h-4" />Adicionar à sacola
              </button>
            </div>
          )}
          {inBag > 0 && (
            <p className="mt-3 flex items-center gap-1.5 text-sm font-body text-white/70">
              <Check className="w-4 h-4" style={{ color: primary }} />
              {inBag} na sacola · <button type="button" onClick={bag.open} className="underline underline-offset-4">ver sacola</button>
            </p>
          )}

          {product.description && (
            <div className="mt-8 pt-6 border-t border-[#1e1e1e]">
              <h2 className="text-white text-sm font-body font-semibold mb-2">Sobre o produto</h2>
              <p className="text-white/65 text-sm font-body leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          )}

          <dl className="mt-6 pt-6 border-t border-[#1e1e1e] grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm font-body">
            <dt className="text-white/45">Retirada</dt>
            <dd className="text-white/75">Na {barbershop.name}{barbershop.address ? `, ${barbershop.address}` : ''}</dd>
            <dt className="text-white/45">Pagamento</dt>
            <dd className="text-white/75">Na hora de retirar, direto na barbearia</dd>
          </dl>

          <button type="button" onClick={() => void share()} className="mt-6 flex items-center gap-2 text-sm font-body text-white/55 hover:text-white">
            <Share2 className="w-4 h-4" />Compartilhar
          </button>
        </div>
      </div>

      {others.length > 0 && (
        <section className="mt-20">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-heading text-3xl tracking-wider text-white">{related.length ? 'DA MESMA LINHA' : 'VEJA TAMBÉM'}</h2>
            <Link to={`/b/${barbershop.slug}/loja`} className="text-sm font-body text-white/55 hover:text-white">Ver tudo</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8">
            {others.map(p => <ProductCard key={p.id} product={p} slug={barbershop.slug} primary={primary} />)}
          </div>
        </section>
      )}

      {/* Celular: barra fixa de compra */}
      {!soldOut && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[#222] bg-[#0b0b0b]/95 backdrop-blur px-5 py-3 flex items-center gap-3">
          <div className="min-w-0">
            <p className="text-white text-base font-body font-semibold tabular-nums">{brl(product.price * qty)}</p>
            <p className="text-white/45 text-[11px] font-body truncate">{qty}× · paga na retirada</p>
          </div>
          <button type="button" onClick={() => addToBag(true)} disabled={room <= 0}
            className="ml-auto flex-1 max-w-[220px] h-12 flex items-center justify-center gap-2 rounded-md font-body font-bold text-sm disabled:opacity-40"
            style={{ backgroundColor: primary, color: '#0a0a0a' }}>
            <ShoppingBag className="w-4 h-4" />{room <= 0 ? 'Já está na sacola' : 'Adicionar à sacola'}
          </button>
        </div>
      )}
    </div>
  )
}

export default ProductPage
