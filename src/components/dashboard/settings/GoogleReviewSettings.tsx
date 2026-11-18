// Configurações › Avaliações no Google: o link que vai no "Pedir avaliação"
// da Agenda (WhatsApp pro cliente depois do corte).
import { useState } from 'react'
import { Check, ExternalLink, Loader2 } from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
import { isDemoMode } from '@/lib/demo'
import { toast } from '@/hooks/use-toast'

const valid = (u: string) => /^https:\/\/\S+\.\S+/.test(u.trim())

const GoogleReviewSettings = ({ canEdit }: { canEdit: boolean }) => {
  const { barbershop, updateBarbershop } = useTenant()
  const [url, setUrl] = useState(barbershop?.googleReviewUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  if (!barbershop) return null

  const changed = url.trim() !== (barbershop.googleReviewUrl ?? '')
  const ok = url.trim() === '' || valid(url)

  const save = async () => {
    if (!ok || !changed) return
    setSaving(true)
    try {
      if (!isDemoMode()) await updateBarbershop({ googleReviewUrl: url.trim() })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      toast({ title: 'Não deu pra salvar o link', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-white/65 text-sm font-body leading-relaxed">
        Depois do corte, a Agenda mostra <b className="text-white/85">“Pedir avaliação”</b>: abre o WhatsApp do cliente com este link.
        Mais avaliações deixam a barbearia mais bem colocada no Google Maps.
      </p>
      <div>
        <label htmlFor="google-review" className="block text-white/55 text-xs font-body mb-1.5">Link de avaliação do Google</label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input id="google-review" value={url} onChange={e => setUrl(e.target.value)} disabled={!canEdit}
            placeholder="https://g.page/r/…/review"
            className="flex-1 bg-[#101010] border border-[#262626] rounded-md px-3 py-2.5 text-white text-base sm:text-sm font-body placeholder:text-white/30 focus:outline-none focus:border-amber-500/50 disabled:opacity-60" />
          {valid(url) && (
            <a href={url.trim()} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-sm font-body border border-[#2a2a2a] text-white/65 hover:text-white">
              <ExternalLink className="w-4 h-4" />Testar
            </a>
          )}
          {canEdit && (
            <button type="button" onClick={() => void save()} disabled={!ok || !changed || saving}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-semibold font-body bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-40">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
              {saved ? 'Salvo' : 'Salvar'}
            </button>
          )}
        </div>
        {!ok && <p className="text-red-300 text-xs font-body mt-1.5">Cole o link completo, começando com https://</p>}
      </div>
      <details className="text-white/55 text-xs font-body">
        <summary className="cursor-pointer hover:text-white/80">Onde pego esse link?</summary>
        <ol className="list-decimal pl-5 mt-2 space-y-1 leading-relaxed">
          <li>Pesquise o nome da sua barbearia no Google, logado na conta que administra o perfil.</li>
          <li>No painel do seu Perfil da Empresa, toque em <b className="text-white/75">“Pedir avaliações”</b> (ou “Receber mais avaliações”).</li>
          <li>Copie o link que aparece e cole aqui.</li>
        </ol>
      </details>
    </div>
  )
}

export default GoogleReviewSettings
