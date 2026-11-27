// Tela "Agendado!": o link que o cliente guarda pra cancelar ou remarcar.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Copy } from 'lucide-react'

const ManageLinkBox = ({ url, path, primary }: { url: string; path: string; primary: string }) => {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      window.prompt('Copie o link:', url)
    }
  }
  return (
    <div className="mb-6 rounded-xl border border-dashed border-white/15 p-4 text-left">
      <p className="text-white text-sm font-semibold font-body">Guarde o link do seu horário</p>
      <p className="text-white/55 text-xs font-body mt-1">É por ele que você vê, cancela ou remarca. Quem tiver o link consegue mexer no horário.</p>
      <div className="flex gap-2 mt-3">
        <button type="button" onClick={() => void copy()} className="flex-1 h-11 rounded-lg border border-white/15 text-white/85 text-sm font-semibold font-body flex items-center justify-center gap-2">
          {copied ? <><Check className="w-4 h-4 text-emerald-400" />Copiado</> : <><Copy className="w-4 h-4" />Copiar link</>}
        </button>
        <Link to={path} className="flex-1 h-11 rounded-lg text-sm font-bold font-body grid place-items-center" style={{ backgroundColor: primary, color: '#0a0a0a' }}>Abrir</Link>
      </div>
    </div>
  )
}

export default ManageLinkBox
