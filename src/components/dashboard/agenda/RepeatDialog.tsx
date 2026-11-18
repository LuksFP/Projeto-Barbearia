// "Repetir" (cliente fixo): escolhe de quanto em quanto tempo e quantas vezes,
// mostra as datas antes de criar.
import { useMemo, useState } from 'react'
import { Loader2, Repeat } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { RECURRENCE_OPTIONS, seriesDates } from '@/lib/recurrence'
import type { BarbershopAppointment } from '@/types/tenant'

interface Props {
  apt: BarbershopAppointment | null
  onClose: () => void
  onConfirm: (apt: BarbershopAppointment, everyDays: number, dates: string[]) => Promise<void>
}

const fmt = (d: string) => new Date(`${d}T12:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '')

const RepeatDialog = ({ apt, onClose, onConfirm }: Props) => {
  const [every, setEvery] = useState(15)
  const [count, setCount] = useState(4)
  const [saving, setSaving] = useState(false)
  // A partir de amanhã: hoje o horário pode já ter passado
  const dates = useMemo(() => (apt ? seriesDates(apt.date, every, count, new Date(Date.now() + 86_400_000).toLocaleDateString('sv-SE')) : []), [apt, every, count])

  const confirm = async () => {
    if (!apt) return
    setSaving(true)
    try { await onConfirm(apt, every, dates) } finally { setSaving(false) }
  }

  return (
    <Dialog open={!!apt} onOpenChange={o => { if (!o && !saving) onClose() }}>
      <DialogContent className="bg-[#141414] border-[#2a2a2a] text-white max-w-md">
        <DialogTitle className="font-body text-lg flex items-center gap-2"><Repeat className="w-4 h-4 text-amber-400" />Cliente fixo</DialogTitle>
        <DialogDescription className="text-white/60 text-sm font-body">
          {apt ? <>Repete o horário de <b className="text-white/85">{apt.clientName}</b> às {apt.time} com {apt.barberName}.</> : null}
        </DialogDescription>

        <div className="space-y-4 mt-2">
          <div>
            <p className="text-white/55 text-xs font-body mb-2">De quanto em quanto tempo</p>
            <div className="flex flex-wrap gap-1.5">
              {RECURRENCE_OPTIONS.map(o => (
                <button key={o.days} type="button" onClick={() => setEvery(o.days)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-body border ${every === o.days ? 'bg-amber-500/15 border-amber-500/50 text-amber-300' : 'border-[#2a2a2a] text-white/65 hover:text-white'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="rep-count" className="text-white/55 text-xs font-body">Quantas vezes pra frente</label>
            <div className="flex items-center gap-3 mt-2">
              <input id="rep-count" type="range" min={2} max={12} value={count} onChange={e => setCount(Number(e.target.value))} className="flex-1 accent-amber-500" />
              <span className="text-white font-body tabular-nums w-6 text-right">{count}</span>
            </div>
          </div>
          <div>
            <p className="text-white/55 text-xs font-body mb-1.5">Vai marcar</p>
            <p className="text-white/80 text-sm font-body leading-relaxed">{dates.map(fmt).join(' · ')}</p>
            <p className="text-white/45 text-xs font-body mt-2">Data que bater com outro horário ou cair fora do expediente é pulada.</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose} disabled={saving} className="px-3 py-2 rounded-md text-sm font-body text-white/60 hover:text-white">Cancelar</button>
          <button type="button" onClick={() => void confirm()} disabled={saving || !apt}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold font-body bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-50">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}Marcar {count} horários
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default RepeatDialog
