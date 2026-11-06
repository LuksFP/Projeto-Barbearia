// Cadastro/edição de produto da loja (só dono/admin abre isto).
import { useEffect, useRef, useState } from 'react'
import { ImagePlus, Archive, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { productErrorMessage } from '@/hooks/useProducts'
import { uploadProductImage } from '@/lib/storage'
import type { Product, ProductInput } from '@/repositories/productRepository'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null              // null = novo
  barbershopId: string
  categories: string[]                 // sugestões (as que já existem)
  demo: boolean
  onSave: (input: ProductInput, id?: string) => Promise<Product>
  onArchive: (id: string) => Promise<void>
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

const field = 'w-full bg-[#161616] border border-[#272727] rounded-lg px-3 py-2.5 text-white text-base sm:text-sm font-body placeholder:text-white/20 focus:outline-none focus:border-amber-500/50'
const label = 'block text-white/45 text-xs font-body mb-1.5'

const ProductFormDialog = ({ open, onOpenChange, product, barbershopId, categories, demo, onSave, onArchive }: Props) => {
  const [draft, setDraft] = useState<Draft>(() => fromProduct(product))
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(product?.imageUrl ?? null)
  const [saving, setSaving] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setDraft(fromProduct(product))
    setFile(null)
    setPreview(product?.imageUrl ?? null)
    setConfirmArchive(false)
  }, [open, product])

  useEffect(() => () => { if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview) }, [preview])

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

  const pickFile = (f: File | undefined) => {
    if (!f) return
    if (demo) { toast({ title: 'No modo demonstração a foto não é salva' }); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
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
      imageUrl: product?.imageUrl ?? null,
      visibleOnSite: draft.visibleOnSite,
    }
    try {
      let saved = await onSave(input, product?.id)
      if (file) {
        // A foto vai pra pasta do produto: precisa do id, por isso depois de salvar
        const { url } = await uploadProductImage(barbershopId, saved.id, file)
        saved = await onSave({ ...input, imageUrl: url }, saved.id)
      }
      toast({ title: product ? 'Produto atualizado' : 'Produto cadastrado', description: saved.name })
      onOpenChange(false)
    } catch (err: unknown) {
      toast({ title: 'Não deu pra salvar', description: productErrorMessage(err), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const archive = async () => {
    if (!product) return
    if (!confirmArchive) { setConfirmArchive(true); return }
    try {
      await onArchive(product.id)
      toast({ title: 'Produto tirado da loja', description: 'As vendas antigas dele continuam no histórico.' })
      onOpenChange(false)
    } catch (err: unknown) {
      toast({ title: 'Não deu pra arquivar', description: productErrorMessage(err), variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111] border-[#262626] text-white max-w-lg max-h-[92dvh] overflow-y-auto p-5 sm:p-6">
        <DialogTitle className="font-heading text-2xl tracking-wide">{product ? 'EDITAR PRODUTO' : 'NOVO PRODUTO'}</DialogTitle>
        <DialogDescription className="text-white/40 text-xs font-body -mt-2">
          O estoque desce sozinho a cada venda registrada.
        </DialogDescription>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative w-24 h-24 shrink-0 rounded-lg border border-dashed border-[#333] bg-[#161616] overflow-hidden flex items-center justify-center text-white/35 hover:border-amber-500/50 hover:text-amber-300 transition-colors"
              aria-label={preview ? 'Trocar foto do produto' : 'Adicionar foto do produto'}
            >
              {preview
                ? <img src={preview} alt="" className="w-full h-full object-cover" />
                : <span className="flex flex-col items-center gap-1 text-[11px] font-body"><ImagePlus className="w-5 h-5" />Foto</span>}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => pickFile(e.target.files?.[0])} />
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <label htmlFor="p-name" className={label}>Nome *</label>
                <input id="p-name" value={draft.name} onChange={e => set('name', e.target.value.slice(0, 80))} placeholder="Pomada matte 120g" className={field} aria-invalid={!!errors.name && draft.name !== ''} />
              </div>
              <div>
                <label htmlFor="p-cat" className={label}>Categoria</label>
                <input id="p-cat" list="p-cats" value={draft.category} onChange={e => set('category', e.target.value.slice(0, 40))} placeholder="Cabelo, Barba, Acessórios…" className={field} />
                <datalist id="p-cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
              </div>
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
              <span className="block text-[11px] text-white/35">A vitrine do site entra numa próxima etapa; já deixa marcado o que vai aparecer.</span>
            </span>
          </label>

          <div className="flex items-center gap-3 pt-2">
            {product && (
              <button
                type="button"
                onClick={() => void archive()}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-md text-xs font-body border transition-colors ${confirmArchive ? 'border-red-500/50 text-red-300 bg-red-500/10' : 'border-[#2a2a2a] text-white/45 hover:text-white/80'}`}
              >
                <Archive className="w-3.5 h-3.5" />
                {confirmArchive ? 'Toque de novo pra tirar' : 'Tirar da loja'}
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
