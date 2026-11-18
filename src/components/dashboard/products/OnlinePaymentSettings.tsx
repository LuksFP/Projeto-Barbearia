// Configurações › Vendas no site › Receber online.
// O dono conecta a conta Mercado Pago DELE: o cliente paga por Pix ou cartão
// e o dinheiro cai direto lá (de lá ele saca pra qualquer chave Pix/banco).
// A plataforma fica com 1,5% de cada venda paga online, descontado na hora
// pelo próprio Mercado Pago.
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2, Unplug } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/hooks/use-toast'
import { onlinePaymentRepository, type MpConnection } from '@/repositories/onlinePaymentRepository'

export const PLATFORM_FEE_LABEL = '1,5%'

const RETURN_MSG: Record<string, { title: string; variant?: 'destructive' }> = {
  ok: { title: 'Mercado Pago conectado! Seus clientes já podem pagar online.' },
  cancelado: { title: 'Conexão cancelada no Mercado Pago.', variant: 'destructive' },
  expirado: { title: 'O link de conexão expirou. Tente de novo.', variant: 'destructive' },
  erro: { title: 'O Mercado Pago não confirmou a conexão. Tente de novo.', variant: 'destructive' },
}

interface Props {
  barbershopId: string
  canEdit: boolean
  demo: boolean
}

const OnlinePaymentSettings = ({ barbershopId, canEdit, demo }: Props) => {
  const [params, setParams] = useSearchParams()
  const [conn, setConn] = useState<MpConnection | null>(null)
  const [busy, setBusy] = useState<'connect' | 'toggle' | 'disconnect' | null>(null)
  const [confirmOff, setConfirmOff] = useState(false)

  useEffect(() => {
    let alive = true
    onlinePaymentRepository.connection(barbershopId)
      .then(c => { if (alive) setConn(c) })
      .catch(() => { if (alive) setConn({ connected: false, enabled: false, connectedAt: null }) })
    return () => { alive = false }
  }, [barbershopId, demo])

  // Volta do Mercado Pago: ?mp=ok|cancelado|expirado|erro
  useEffect(() => {
    const r = params.get('mp')
    if (!r) return
    const msg = RETURN_MSG[r]
    if (msg) toast(msg)
    params.delete('mp')
    setParams(params, { replace: true })
  }, [params, setParams])

  const connect = async () => {
    setBusy('connect')
    try {
      await onlinePaymentRepository.connect(barbershopId)
    } catch (err: unknown) {
      toast({ title: err instanceof Error ? err.message : 'Não deu pra abrir o Mercado Pago.', variant: 'destructive' })
      setBusy(null)
    }
  }

  const toggle = async (enabled: boolean) => {
    if (!conn) return
    setBusy('toggle')
    const prev = conn
    setConn({ ...conn, enabled })
    try {
      await onlinePaymentRepository.setEnabled(barbershopId, enabled)
    } catch {
      setConn(prev)
      toast({ title: 'Não deu pra salvar. Tente de novo.', variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  const disconnect = async () => {
    if (!confirmOff) { setConfirmOff(true); return }
    setBusy('disconnect')
    try {
      await onlinePaymentRepository.disconnect(barbershopId)
      setConn({ connected: false, enabled: false, connectedAt: null })
      toast({ title: 'Mercado Pago desconectado', description: 'O site volta a só reservar, com pagamento na retirada.' })
    } catch {
      toast({ title: 'Não deu pra desconectar. Tente de novo.', variant: 'destructive' })
    } finally {
      setBusy(null)
      setConfirmOff(false)
    }
  }

  return (
    <div className="space-y-3 border-t border-white/5 pt-5">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <p className="text-white text-sm font-semibold font-body">Receber online (Pix e cartão)</p>
          <p className="text-white/60 text-xs font-body mt-0.5 leading-relaxed">
            Depois de agendar ou reservar produto, o cliente pode pagar na hora pelo Mercado Pago: o corte, os produtos
            ou os dois juntos. O dinheiro cai na sua conta Mercado Pago e de lá você transfere pra sua chave Pix ou banco.
            Taxa do BarberPro: {PLATFORM_FEE_LABEL} por pagamento online, mais a taxa do Mercado Pago. Quem não pagar online
            continua pagando na barbearia. Horário pago só cancela estornando.
          </p>
        </div>
        {conn?.connected && (
          <Switch
            checked={conn.enabled}
            disabled={!canEdit || busy !== null}
            onCheckedChange={v => void toggle(v)}
            aria-label="Aceitar pagamento online no site"
          />
        )}
      </div>

      {conn === null ? (
        <Loader2 className="w-4 h-4 animate-spin text-white/40" />
      ) : conn.connected ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-300 text-sm font-body">
            <CheckCircle2 className="w-4 h-4" />
            Mercado Pago conectado{conn.enabled ? '' : ' (pausado)'}{demo ? ' · demonstração' : ''}
          </span>
          {canEdit && !demo && (
            <button type="button" onClick={() => void disconnect()} onBlur={() => setConfirmOff(false)} disabled={busy !== null}
              className={`ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-body border transition-colors ${confirmOff ? 'border-red-500/50 bg-red-500/10 text-red-300' : 'border-[#2a2a2a] text-white/50 hover:text-red-300'}`}>
              <Unplug className="w-3.5 h-3.5" />
              {confirmOff ? 'Toque de novo pra desconectar' : 'Desconectar'}
            </button>
          )}
        </div>
      ) : canEdit ? (
        <button type="button" onClick={() => void connect()} disabled={busy !== null}
          className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold font-body bg-[#00B1EA] text-[#0a0a0a] hover:brightness-110 disabled:opacity-50">
          {busy === 'connect' && <Loader2 className="w-4 h-4 animate-spin" />}
          Conectar minha conta Mercado Pago
        </button>
      ) : (
        <p className="text-white/45 text-xs font-body">Só o dono ou um admin conecta a conta.</p>
      )}
    </div>
  )
}

export default OnlinePaymentSettings
