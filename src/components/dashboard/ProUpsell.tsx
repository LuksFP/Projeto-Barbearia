// Faixa "vem no Pro" — mesmo desenho da faixa de upgrade da Loja.
import { Link } from 'react-router-dom'
import { ArrowUpRight, Lock } from 'lucide-react'

interface Props {
  message: string
  className?: string
}

const ProUpsell = ({ message, className = '' }: Props) => (
  <div className={`border-l-2 border-amber-500/60 pl-4 py-1 ${className}`}>
    <p className="flex items-start gap-2 text-white/80 text-sm font-body">
      <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
      {message}
    </p>
    <Link
      to="/dashboard/assinatura"
      className="mt-1 inline-flex items-center gap-1 text-amber-300 text-xs font-body hover:text-amber-200"
    >
      Ver o plano Pro
      <ArrowUpRight className="w-3.5 h-3.5" />
    </Link>
  </div>
)

export default ProUpsell
