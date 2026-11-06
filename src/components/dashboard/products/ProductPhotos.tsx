// Fotos do produto no formulário: até 4, a primeira é a capa. Tocar numa foto
// que não é a capa vira capa; o X tira. Fotos novas ficam só na tela até salvar.
import { useRef } from 'react'
import { ImagePlus, X } from 'lucide-react'

export interface PhotoItem {
  key: string
  url: string        // URL pública, data URL (demo) ou blob: (prévia de foto nova)
  file?: File        // presente = ainda não subiu
}

export const MAX_PHOTOS = 4

interface Props {
  photos: PhotoItem[]
  onChange: (next: PhotoItem[]) => void
  onPick: (files: File[]) => void
}

const ProductPhotos = ({ photos, onChange, onPick }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null)
  const room = MAX_PHOTOS - photos.length

  const makeCover = (i: number) => {
    if (i === 0) return
    const next = [...photos]
    const [item] = next.splice(i, 1)
    onChange([item, ...next])
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-white/65 text-xs font-body">Fotos</span>
        <span className="text-white/55 text-[11px] font-body">{photos.length}/{MAX_PHOTOS} · a primeira é a capa</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {photos.map((ph, i) => (
          <div key={ph.key} className={`relative w-20 h-20 shrink-0 rounded-lg overflow-hidden border ${i === 0 ? 'border-amber-500/60' : 'border-[#2a2a2a]'}`}>
            <button type="button" onClick={() => makeCover(i)} className="w-full h-full" aria-label={i === 0 ? 'Foto de capa' : `Usar a foto ${i + 1} como capa`}>
              <img src={ph.url} alt="" className="w-full h-full object-cover" />
            </button>
            {i === 0 && (
              <span className="absolute left-0 bottom-0 right-0 bg-black/70 text-amber-300 text-[10px] font-body text-center py-0.5 pointer-events-none">capa</span>
            )}
            <button
              type="button"
              onClick={() => onChange(photos.filter(p => p.key !== ph.key))}
              aria-label={`Tirar a foto ${i + 1}`}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/75 text-white/80 hover:text-white flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {room > 0 && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-20 h-20 shrink-0 rounded-lg border border-dashed border-[#333] bg-[#161616] flex flex-col items-center justify-center gap-1 text-white/65 hover:border-amber-500/50 hover:text-amber-300 transition-colors text-[11px] font-body"
          >
            <ImagePlus className="w-5 h-5" />
            {photos.length === 0 ? 'Adicionar' : 'Mais'}
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={e => {
          const files = Array.from(e.target.files ?? []).slice(0, room)
          e.target.value = '' // deixa escolher o mesmo arquivo de novo
          if (files.length) onPick(files)
        }}
      />
    </div>
  )
}

export default ProductPhotos
