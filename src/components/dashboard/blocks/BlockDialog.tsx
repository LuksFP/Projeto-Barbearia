// "Novo bloqueio": pausa que se repete toda semana ou período em datas.
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { errorText } from '@/lib/errors'
import { WEEKDAY_SHORT } from '@/lib/blocks'
import type { NewScheduleBlock } from '@/lib/blocks'
import type { BarbershopBarber } from '@/types/tenant'

export type BlockMode = 'weekly' | 'dates'

interface Props {
  mode: BlockMode | null
  barbershopId: string
  today: string
  /** De quem a pessoa logada pode bloquear a agenda. */
  barbers: BarbershopBarber[]
  /** Dono/admin: pode escolher "barbearia toda". */
  wholeShop: boolean
  onClose: () => void
  onSave: (block: NewScheduleBlock) => Promise<void>
}

const field = 'mt-1.5 w-full bg-[#161616] border border-[#2a2a2a] rounded-lg px-3 h-11 text-white text-base font-body focus:outline-none focus:border-amber-500/50 [color-scheme:dark]'
const label = 'block text-white/60 text-xs font-body'

const BlockForm = ({ mode, barbershopId, today, barbers, wholeShop, onClose, onSave }: Props & { mode: BlockMode }) => {
  const weekly = mode === 'weekly'
  const [barberId, setBarberId] = useState(wholeShop ? '' : barbers[0]?.id ?? '')
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6])
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [allDay, setAllDay] = useState(false)
  const [start, setStart] = useState(weekly ? '12:00' : '09:00')
  const [end, setEnd] = useState(weekly ? '13:00' : '12:00')
  const [reason, setReason] = useState(weekly ? 'Almoço' : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const hoursNeeded = weekly || !allDay
  const problem =
    weekly && days.length === 0 ? 'Escolha pelo menos um dia da semana.'
      : !weekly && (!from || !to || to < from) ? 'A data final precisa ser igual ou depois da inicial.'
        : hoursNeeded && (!start || !end || end <= start) ? 'O fim precisa ser depois do início.'
          : ''

  const save = async () => {
    if (problem) { setError(problem); return }
    setSaving(true)
    setError('')
    try {
      await onSave({
        barbershopId, barberId: barberId || null,
        weekdays: weekly ? [...days].sort() : null,
        dateFrom: weekly ? null : from, dateTo: weekly ? null : to,
        startTime: hoursNeeded ? start : null, endTime: hoursNeeded ? end : null,
        reason: reason.trim(),
      })
      onClose()
    } catch (err: unknown) {
      setError(/schedule_blocks_when/.test(errorText(err)) ? 'Use um período de até 1 ano.' : 'Não deu pra salvar. Tente de novo.')
      setSaving(false)
    }
  }

  return (
    <>
      <DialogTitle className="font-body text-lg">{weekly ? 'Pausa que se repete' : 'Bloquear datas'}</DialogTitle>
      <DialogDescription className="text-white/60 text-sm font-body">
        {weekly ? 'Almoço, saída mais cedo: vale toda semana até você remover.' : 'Feriado, férias, médico: vale só nas datas que você escolher.'}
      </DialogDescription>
      <div className="space-y-4">
        <label className={label}>Agenda de quem
          <select value={barberId} onChange={e => setBarberId(e.target.value)} className={field}>
            {wholeShop && <option value="">Barbearia toda</option>}
            {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>

        {weekly ? (
          <div>
            <p className={label}>Dias</p>
            <div className="grid grid-cols-7 gap-1 mt-1.5" role="group" aria-label="Dias da semana">
              {WEEKDAY_SHORT.map((name, d) => (
                <button key={name} type="button" aria-pressed={days.includes(d)}
                  onClick={() => setDays(v => v.includes(d) ? v.filter(x => x !== d) : [...v, d])}
                  className={`h-11 rounded-lg text-xs font-body border ${days.includes(d) ? 'bg-white text-black border-white font-semibold' : 'border-[#2a2a2a] text-white/60'}`}>
                  {name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className={label}>De
                <input type="date" min={today} value={from} className={field}
                  onChange={e => { setFrom(e.target.value); if (to < e.target.value) setTo(e.target.value) }} />
              </label>
              <label className={label}>Até
                <input type="date" min={from} value={to} onChange={e => setTo(e.target.value)} className={field} />
              </label>
            </div>
            <label className="flex items-center gap-2.5 min-h-11 text-white/80 text-sm font-body cursor-pointer">
              <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} className="w-4 h-4 accent-amber-500" />
              Dia inteiro
            </label>
          </>
        )}

        {hoursNeeded && (
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>Das
              <input type="time" value={start} onChange={e => setStart(e.target.value)} className={field} />
            </label>
            <label className={label}>Às
              <input type="time" value={end} onChange={e => setEnd(e.target.value)} className={field} />
            </label>
          </div>
        )}

        <label className={label}>Motivo (só a equipe vê)
          <input value={reason} maxLength={80} onChange={e => setReason(e.target.value)}
            placeholder={weekly ? 'Almoço' : 'Feriado, férias, médico…'} className={field} />
        </label>
        {error && <p role="alert" className="text-sm font-body text-red-300">{error}</p>}
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={saving} className="h-11 px-3 rounded-lg text-sm font-body text-white/60 hover:text-white">Voltar</button>
        <button type="button" onClick={() => void save()} disabled={saving}
          className="h-11 flex items-center gap-2 px-5 rounded-lg text-sm font-semibold font-body bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-40">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}Bloquear
        </button>
      </div>
    </>
  )
}

const BlockDialog = (props: Props) => (
  <Dialog open={!!props.mode} onOpenChange={o => { if (!o) props.onClose() }}>
    <DialogContent className="bg-[#141414] border-[#2a2a2a] text-white max-w-md max-h-[90dvh] overflow-y-auto">
      {props.mode && <BlockForm key={props.mode} {...props} mode={props.mode} />}
    </DialogContent>
  </Dialog>
)

export default BlockDialog
