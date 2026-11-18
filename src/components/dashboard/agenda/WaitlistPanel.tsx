// Lista de espera do dia aberto na Agenda. Aparece só se tem alguém esperando.
// Se o dia tem horário cancelado, destaca a vaga que abriu e o "Avisar" já
// manda o horário no WhatsApp.
import { useCallback, useEffect, useState } from 'react'
import { Hourglass, MessageCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { buildWaitlistNotice, waUrl } from '@/lib/whatsapp'
import { formatPhoneBR } from '@/lib/phone'
import { PERIOD_LABEL, waitlistRepository, type WaitEntry, type WaitStatus } from '@/repositories/waitlistRepository'

interface Props {
  barbershopId: string
  shopName: string
  date: string
  /** Horários cancelados no dia (vaga que abriu) */
  openedTimes: string[]
  barberName: (id: string | null) => string | null
  /** Muda quando a agenda do dia muda, pra recarregar */
  refreshKey: string
}

const WaitlistPanel = ({ barbershopId, shopName, date, openedTimes, barberName, refreshKey }: Props) => {
  const [list, setList] = useState<WaitEntry[]>([])

  const load = useCallback(() => {
    waitlistRepository.listForDate(barbershopId, date).then(setList).catch(() => setList([]))
  }, [barbershopId, date])
  useEffect(() => { load() }, [load, refreshKey])

  if (list.length === 0) return null

  const dayLabel = (() => {
    const today = new Date().toLocaleDateString('sv-SE')
    const tomorrow = new Date(Date.now() + 86_400_000).toLocaleDateString('sv-SE')
    if (date === today) return 'hoje'
    if (date === tomorrow) return 'amanhã'
    return new Date(`${date}T12:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'numeric' })
  })()

  const set = async (e: WaitEntry, status: WaitStatus) => {
    try {
      await waitlistRepository.setStatus(barbershopId, e.id, status)
      setList(prev => status === 'avisado' ? prev.map(x => x.id === e.id ? { ...x, status, notifiedAt: new Date().toISOString() } : x) : prev.filter(x => x.id !== e.id))
    } catch {
      toast({ title: 'Não deu pra salvar. Tente de novo.', variant: 'destructive' })
    }
  }

  const notify = (e: WaitEntry) => {
    const url = waUrl(e.clientPhone, buildWaitlistNotice(e.clientName, shopName, dayLabel, openedTimes))
    if (url) window.open(url, '_blank', 'noopener')
    void set(e, 'avisado')
  }

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Hourglass className="w-4 h-4 text-amber-400" />
        <p className="text-white text-sm font-semibold font-body">Lista de espera · {list.length}</p>
        {openedTimes.length > 0 && (
          <p className="text-amber-200/90 text-xs font-body">Abriu vaga {openedTimes.join(', ')}: avise quem está esperando</p>
        )}
      </div>
      <ul className="divide-y divide-white/5">
        {list.map(e => {
          const pref = barberName(e.barberId)
          return (
            <li key={e.id} className="py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <div className="min-w-0 flex-1">
                <p className="text-white/90 text-sm font-body">{e.clientName}</p>
                <p className="text-white/50 text-xs font-body">
                  {PERIOD_LABEL[e.period]}{pref ? ` · com ${pref}` : ''} · {formatPhoneBR(e.clientPhone)}
                  {e.status === 'avisado' && <span className="text-emerald-300/80"> · avisado</span>}
                </p>
              </div>
              <button type="button" onClick={() => notify(e)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold font-body bg-amber-500 text-black hover:bg-amber-400">
                <MessageCircle className="w-3.5 h-3.5" />{e.status === 'avisado' ? 'Avisar de novo' : 'Avisar'}
              </button>
              <button type="button" onClick={() => void set(e, 'agendou')}
                className="px-2.5 py-1.5 rounded-md text-xs font-body border border-[#2a2a2a] text-white/65 hover:text-white">Agendou</button>
              <button type="button" onClick={() => void set(e, 'removido')}
                className="px-2.5 py-1.5 rounded-md text-xs font-body border border-[#2a2a2a] text-white/45 hover:text-red-300">Tirar</button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default WaitlistPanel
