// Sino dos avisos de agendamento: som de moeda + vibração com o painel aberto e
// push no aparelho com o navegador fechado. Ao ligar, toca o som uma vez — serve
// de teste e libera o áudio do navegador (que só toca depois de um toque).
import { useState } from 'react'
import { Bell, BellOff, Download } from 'lucide-react'
import {
  notifyPermission,
  playCoinSound,
  readAlertPrefs,
  requestNotifyPermission,
  unlockAudio,
  writeAlertPrefs,
  type NotifyPermission,
} from '@/lib/bookingAlert'
import { disablePush, enablePush, needsInstallForPush, sendTestPush } from '@/lib/push'
import { toast } from '@/hooks/use-toast'

interface Props {
  /** null no modo demo: lá não existe usuário pra receber push. */
  barbershopId: string | null
  compact?: boolean
}

const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)

const BookingAlertToggle = ({ barbershopId, compact = false }: Props) => {
  const [on, setOn] = useState(() => readAlertPrefs().sound)
  const [perm, setPerm] = useState<NotifyPermission>(() => notifyPermission())

  const toggle = async () => {
    unlockAudio()
    const next = !on
    setOn(next)
    writeAlertPrefs({ sound: next })

    if (!next) {
      if (barbershopId) void disablePush()
      return
    }

    playCoinSound()
    let current = perm
    if (current === 'default') {
      current = await requestNotifyPermission()
      setPerm(current)
    }
    if (!barbershopId) return

    if (needsInstallForPush()) {
      toast({
        title: 'No iPhone, instale o BarberOS',
        description:
          'Pra receber aviso com o app fechado: Compartilhar → “Adicionar à Tela de Início” e abra por lá.',
      })
      return
    }
    if (current !== 'granted') return
    const ok = await enablePush(barbershopId)
    if (ok) void sendTestPush()
    toast({
      title: ok ? 'Avisos ligados neste aparelho' : 'Som ligado',
      description: ok
        ? 'Mandamos uma notificação de teste agora. Agendamento novo chega aqui mesmo com o app fechado.'
        : 'Não deu pra ligar o aviso com o navegador fechado neste aparelho — o som continua com o painel aberto.',
    })
  }

  const hint =
    perm === 'denied'
      ? 'Notificação bloqueada no navegador — libere nas configurações do site.'
      : on
        ? 'Avisos ligados: moeda com o painel aberto, notificação com ele fechado.'
        : 'Avisos desligados. Toque pra ligar.'

  const Icon = on ? Bell : BellOff

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => void toggle()}
        aria-label={on ? 'Desligar avisos de agendamento' : 'Ligar avisos de agendamento'}
        aria-pressed={on}
        title={hint}
        className={`w-10 h-10 -mr-2 flex items-center justify-center rounded-lg transition-colors ${
          on ? 'text-amber-400' : 'text-white/60'
        }`}
      >
        <Icon className="w-5 h-5" />
      </button>
    )
  }

  return (
    <>
    <button
      type="button"
      onClick={() => void toggle()}
      aria-pressed={on}
      title={hint}
      className="w-full flex items-center gap-2 px-3 py-2 mb-1 rounded-lg text-sm hover:bg-white/[0.04] transition-all font-body text-left"
    >
      <Icon className={`w-4 h-4 shrink-0 ${on ? 'text-amber-400' : 'text-white/60'}`} />
      <span className={`whitespace-nowrap ${on ? 'text-white/70' : 'text-white/65'}`}>Avisos de agenda</span>
      <span
        className={`ml-auto text-[10px] font-semibold uppercase tracking-wider ${
          on ? 'text-amber-400' : 'text-white/55'
        }`}
      >
        {on ? 'Ligado' : 'Desligado'}
      </span>
    </button>
    {on && isAndroid && (
      <a
        href="/som-moeda.mp3"
        download="som-moeda-barberos.mp3"
        onClick={() =>
          toast({
            title: 'Som de moeda baixado',
            description:
              'Pra tocar a moeda mesmo com o app fechado: Configurações do celular → Apps → BarberOS → Notificações → Som → escolha “som-moeda-barberos” (em Downloads).',
            duration: 15000,
          })
        }
        className="w-full flex items-center gap-2 px-3 py-1.5 mb-1 rounded-lg text-xs text-white/65 hover:text-white/70 hover:bg-white/[0.04] transition-all font-body"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        Moeda também com o app fechado
      </a>
    )}
    </>
  )
}

export default BookingAlertToggle
