// Celular: as ações secundárias do horário ficam no "⋯", pra sobrar espaço pro
// botão principal. No computador cada uma continua como botão no cartão.
import { useState } from 'react'
import { ArrowRightLeft, MoreHorizontal, Repeat, UserX, XCircle } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

export interface AppointmentMenuProps {
  clientName: string
  onTransfer?: () => void
  onRepeat?: () => void
  onNoShow?: () => void
  onCancel?: () => void
  /** Cliente fixo: cancela os próximos. Pede dois toques. */
  onStopSeries?: () => void
}

const item = 'h-11 gap-2.5 text-sm font-body cursor-pointer focus:bg-white/[0.08] focus:text-white'

const AppointmentMenu = ({ clientName, onTransfer, onRepeat, onNoShow, onCancel, onStopSeries }: AppointmentMenuProps) => {
  const [armedStop, setArmedStop] = useState(false)

  return (
    // modal={false}: um item abre a janela de transferir; o menu modal deixaria a tela travada
    <DropdownMenu modal={false} onOpenChange={() => setArmedStop(false)}>
      <DropdownMenuTrigger aria-label={`Mais ações de ${clientName}`}
        className="sm:hidden ml-auto shrink-0 w-11 h-11 flex items-center justify-center rounded-lg border border-[#2a2a2a] text-white/70 data-[state=open]:bg-white/[0.08]">
        <MoreHorizontal className="w-5 h-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52 bg-[#1a1a1a] border-[#2f2f2f] text-white/85">
        {onTransfer && <DropdownMenuItem className={item} onSelect={onTransfer}><ArrowRightLeft className="w-4 h-4" />Transferir</DropdownMenuItem>}
        {onRepeat && <DropdownMenuItem className={item} onSelect={onRepeat}><Repeat className="w-4 h-4" />Repetir</DropdownMenuItem>}
        {onNoShow && <DropdownMenuItem className={`${item} text-orange-300 focus:text-orange-300`} onSelect={onNoShow}><UserX className="w-4 h-4" />Faltou</DropdownMenuItem>}
        {onCancel && <DropdownMenuItem className={`${item} text-red-400 focus:text-red-400`} onSelect={onCancel}><XCircle className="w-4 h-4" />Cancelar horário</DropdownMenuItem>}
        {onStopSeries && (
          <DropdownMenuItem className={`${item} text-red-400 focus:text-red-400`}
            onSelect={e => {
              if (armedStop) { onStopSeries(); return }
              e.preventDefault()
              setArmedStop(true)
            }}>
            <Repeat className="w-4 h-4" />{armedStop ? 'Toque de novo pra parar' : 'Parar repetição'}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default AppointmentMenu
