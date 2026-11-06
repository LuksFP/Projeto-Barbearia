// Cadastro/edição de produto da loja (só dono/admin abre isto).
import { useEffect, useRef, useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { productErrorMessage } from '@/hooks/useProducts'
import { removeProductImage, uploadProductImage } from '@/lib/storage'
import { imageToDataUrl, resizeImage } from '@/lib/imageResize'
import ProductPhotos, { MAX_PHOTOS, type PhotoItem } from './ProductPhotos'
import type { Product, ProductInput } from '@/repositories/productRepository'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null              // null = novo
  barbershopId: string
  categories: string[]                 // sugestões (as que já existem)
  demo: boolean
  onSave: (input: ProductInput, id?: string) => Promise<Product>
  onRemove: (id: string) => Promise<'deleted' | 'archived'>
}

interface Draft {
  name: string
  description: string
  category: string
  price: string
  cost: string
  stock: string
  lowStockAt: string
  visibleOnSite: boolean
}

const fromProduct = (p: Product | null): Draft => ({
  name: p?.name ?? '',
  description: p?.description ?? '',
  category: p?.category ?? '',
  price: p ? String(p.price) : '',
  cost: p?.cost != null ? String(p.cost) : '',
  stock: p ? String(p.stock) : '',
  lowStockAt: p ? String(p.lowStockAt) : '2',
  visibleOnSite: p?.visibleOnSite ?? true,
})

const num = (v: string) => Number(v.replace(',', '.'))
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const field = 'w-full bg-[#161616] border border-[#272727] rounded-lg px-3 py-2.5 text-white text-base sm:text-sm font-body placeholder:text-white/40 focus:outline-none focus:border-amber-500/50'
const label = 'block text-white/65 text-xs font-body mb-1.5'

const photosOf = (p: Product | null): PhotoItem[] => (p?.imageUrls ?? []).map(url => ({ key: url, url }))

const ProductFormDialog = ({ open, onOpenChange, product, barbershopId, categories, demo, onSave, onRemove }: Props) => {
  const [draft, setDraft] = useState<Draft>(() => fromProduct(product))
  const [photos, setPhotos] = useState<PhotoItem[]>(() => photosOf(product))
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const blobs = useRef<string[]>([])

  useEffect(() => {
    if (!open) return
    setDraft(fromProduct(product))
    setPhotos(photosOf(product))
    setConfirmDelete(false)
  }, [open, product])

  // Libera as prévias (blob:) quando o formulário fecha
  useEffect(() => {
    if (open) return
    blobs.current.forEach(u => URL.revokeObjectURL(u))
    blobs.current = []
  }, [open])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft(d => ({ ...d, [k]: v }))

  const price = num(draft.price)
  const cost = draft.cost.trim() ? num(draft.cost) : null
  const stock = draft.stock.trim() ? num(draft.stock) : 0
  const errors = {
    name: draft.name.trim().length === 0 ? 'Dê um nome ao produto' : '',
    price: !(price >= 0) || draft.price.trim() === '' ? 'Informe o preço' : '',
    stock: !Number.isInteger(stock) || stock < 0 ? 'Estoque em unidades inteiras' : '',
  }
  const valid = !errors.name && !errors.price && !errors.stock
  const margin = cost !== null && price > 0 ? price - cost : null

  const pickFiles = async (files: File[]) => {
    try {
      const items: PhotoItem[] = await Promise.all(files.map(async f => {
        if (demo) {
          // Demo: guarda pequena no navegador, já é a "URL" final
          const url = await imageToDataUrl(f)
          return { key: crypto.randomUUID(), url }
        }
        const resized = await resizeImage(f)
        const url = URL.createObjectURL(resized)
        blobs.current.push(url)
        return { key: url, url, file: resized }
      }))
      setPhotos(prev => [...prev, ...items].slice(0, MAX_PHOTOS))
    } catch (err: unknown) {
      toast({ title: 'Não deu pra usar essa foto', description: productErrorMessage(err), variant: 'destructive' })
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || saving) return
    setSaving(true)
    const input: ProductInput = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      category: draft.category.trim() || 'Outros',
      price,
      cost,
      stock,
      lowStockAt: Math.max(0, Math.round(num(draft.lowStockAt) || 0)),
      imageUrls: photos.filter(p => !p.file).map(p => p.url),
      visibleOnSite: draft.visibleOnSite,
    }
    try {
      let saved = await onSave(input, product?.id)
      if (photos.some(p => p.file)) {
        // Fotos novas vão pra pasta do produto: precisa do id, por isso depois de salvar.
        // Sobe na ordem da tela, pra capa continuar sendo a primeira.
        const urls: string[] = []
        for (const ph of photos) {
          urls.push(ph.file ? (await uploadProductImage(barbershopId, saved.id, ph.file)).url : ph.url)
        }
        saved = await onSave({ ...input, imageUrls: urls }, saved.id)
      }
      // Foto tirada no formulário sai também do Storage
      if (!demo && product) {
        const kept = new Set(saved.imageUrls)
        product.imageUrls.filter(u => !kept.has(u)).forEach(u => { void removeProductImage(u).catch(() => {}) })
      }
      toast({ title: product ? 'Produto atualizado' : 'Produto cadastrado', description: saved.name })
      onOpenChange(false)
    } catch (err: unknown) {
      toast({ title: 'Não deu pra salvar', description: productErrorMessage(err), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!product) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    try {
      const result = await onRemove(product.id)
      if (result === 'deleted' && !demo) {
        product.imageUrls.forEach(u => { void removeProductImage(u).catch(() => {}) })
      }
      toast(result === 'deleted'
        ? { title: 'Produto excluído', description: product.name }
        : { title: 'Produto tirado da loja', description: 'Ele já teve venda, então fica guardado pro histórico do Financeiro.' })
      onOpenChange(false)
    } catch (err: unknown) {
      toast({ title: 'Não deu pra excluir', description: productErrorMessage(err), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111] border-[#262626] text-white max-w-lg max-h-[92dvh] overflow-y-auto p-5 sm:p-6">
        <DialogTitle className="font-heading text-2xl tracking-wide">{product ? 'EDITAR PRODUTO' : 'NOVO PRODUTO'}</DialogTitle>
        <DialogDescription className="text-white/65 text-xs font-body -mt-2">
          O estoque desce sozinho a cada venda registrada.
        </DialogDescription>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <ProductPhotos photos={photos} onChange={setPhotos} onPick={files => void pickFiles(files)} />

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label htmlFor="p-name" className={label}>Nome *</label>
              <input id="p-name" value={draft.name} onChange={e => set('name', e.target.value.slice(0, 80))} placeholder="Pomada matte 120g" className={field} />
            </div>
            <div className="col-span-2">
              <label htmlFor="p-cat" className={label}>Categoria</label>
              <input id="p-cat" list="p-cats" value={draft.category} onChange={e => set('category', e.target.value.slice(0, 40))} placeholder="Cabelo, Barba, Acessórios…" className={field} />
              <datalist id="p-cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="p-price" className={label}>Preço de venda (R$) *</label>
              <input id="p-price" inputMode="decimal" value={draft.price} onChange={e => set('price', e.target.value)} placeholder="45,00" className={field} />
              {errors.price && draft.price !== '' && <p className="text-red-400 text-[11px] font-body mt-1">{errors.price}</p>}
            </div>
            <div>
              <label htmlFor="p-cost" className={label}>Quanto você pagou (R$)</label>
              <input id="p-cost" inputMode="decimal" value={draft.cost} onChange={e => set('cost', e.target.value)} placeholder="opcional" className={field} />
              {margin !== null && (
                <p className={`text-[11px] font-body mt-1 ${margin >= 0 ? 'text-emerald-400/80' : 'text-red-400'}`}>
                  {margin >= 0 ? `Lucro de ${brl(margin)} por unidade` : 'Preço abaixo do custo'}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="p-stock" className={label}>Estoque (unidades)</label>
              <input id="p-stock" inputMode="numeric" value={draft.stock} onChange={e => set('stock', e.target.value.replace(/\D/g, ''))} placeholder="0" className={field} />
            </div>
            <div>
              <label htmlFor="p-low" className={label}>Avisar quando chegar a</label>
              <input id="p-low" inputMode="numeric" value={draft.lowStockAt} onChange={e => set('lowStockAt', e.target.value.replace(/\D/g, ''))} className={field} />
            </div>
          </div>

          <div>
            <label htmlFor="p-desc" className={label}>Descrição</label>
            <textarea id="p-desc" rows={2} value={draft.description} onChange={e => set('description', e.target.value.slice(0, 300))} placeholder="Fixação, tamanho, pra que tipo de cabelo…" className={`${field} resize-none`} />
          </div>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={draft.visibleOnSite} onChange={e => set('visibleOnSite', e.target.checked)} className="mt-0.5 w-4 h-4 accent-amber-500" />
            <span className="text-sm font-body text-white/70">
              Mostrar no site da barbearia
              <span className="block text-[11px] text-white/60">A vitrine do site entra numa próxima etapa; já deixa marcado o que vai aparecer.</span>
            </span>
          </label>

          <div className="flex items-center gap-3 pt-2">
            {product && (
              <button
                type="button"
                onClick={() => void remove()}
                onBlur={() => setConfirmDelete(false)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-md text-xs font-body border transition-colors ${confirmDelete ? 'border-red-500/50 text-red-300 bg-red-500/10' : 'border-[#2a2a2a] text-white/65 hover:text-red-300'}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {confirmDelete ? 'Toque de novo pra excluir' : 'Excluir'}
              </button>
            )}
            <button
              type="submit"
              disabled={!valid || saving}
              className="ml-auto flex items-center gap-2 px-5 py-2.5 rounded-md bg-amber-500 text-black text-sm font-semibold font-body hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {product ? 'Salvar' : 'Cadastrar produto'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ProductFormDialog
