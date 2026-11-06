// Foto do produto ou, sem foto, uma capa tipográfica com a inicial e a
// categoria na cor da barbearia — a loja não fica cheia de ícone cinza.
import type { PublicProduct } from '@/repositories/publicStoreRepository'

interface Props {
  product: Pick<PublicProduct, 'name' | 'category' | 'imageUrls'>
  index?: number
  primary: string
  className?: string
  dim?: boolean
  /** Miniatura: só a inicial, sem a categoria */
  compact?: boolean
}

const ProductImage = ({ product, index = 0, primary, className = '', dim = false, compact = false }: Props) => {
  const url = product.imageUrls[index]
  if (url) {
    return <img src={url} alt="" loading="lazy" className={`w-full h-full object-cover ${dim ? 'grayscale opacity-50' : ''} ${className}`} />
  }
  return (
    <div
      aria-hidden
      className={`w-full h-full flex flex-col items-center justify-center select-none ${dim ? 'opacity-50' : ''} ${className}`}
      style={{ background: `radial-gradient(120% 90% at 30% 20%, ${primary}26, #121212 70%)` }}
    >
      <span className={`font-heading leading-none ${compact ? 'text-3xl' : 'text-[clamp(2.5rem,9vw,4.5rem)]'}`} style={{ color: primary + 'b3' }}>
        {product.name.trim().charAt(0).toUpperCase()}
      </span>
      {!compact && <span className="mt-1 text-[10px] font-body tracking-[0.2em] uppercase text-white/35">{product.category}</span>}
    </div>
  )
}

export default ProductImage
