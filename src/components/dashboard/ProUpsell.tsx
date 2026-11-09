// Faixa "vem no plano X" e o selo "Pro" — um desenho só pra toda trava de plano
// (Equipe, Clube, Financeiro, Loja, menu).
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Lock } from 'lucide-react'

interface Props {
  message: ReactNode
  /** Texto do link pra Assinatura. Padrão: "Ver o plano Pro". */
  linkLabel?: string
  /** Sem cadeado quando a faixa é aviso de limite, não de recurso travado. */
  icon?: boolean
  className?: string
}

const ProUpsell = ({ message, linkLabel = 'Ver o plano Pro', icon = true, className = '' }: Props) => (
  <div className={`border-l-2 border-amber-500/60 pl-4 py-1 ${className}`}>
    <p className="flex items-start gap-2 text-white/80 text-sm font-body">
      {icon && <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />}
      <span>{message}</span>
    </p>
    <Link
      to="/dashboard/assinatura"
      className="mt-1 inline-flex items-center gap-1 text-amber-300 text-xs font-body hover:text-amber-200"
    >
      {linkLabel}
      <ArrowUpRight className="w-3.5 h-3.5" />
    </Link>
  </div>
)

/** Selo pequeno ao lado de item travado. */
export const ProBadge = ({ className = '' }: { className?: string }) => (
  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400 ${className}`}>
    <Lock className="w-3 h-3" />Pro
  </span>
)

export default ProUpsell
