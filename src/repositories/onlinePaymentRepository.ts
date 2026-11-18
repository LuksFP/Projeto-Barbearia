// Pagamento online no site da barbearia — corte e/ou produtos (Mercado Pago
// na conta da barbearia).
//   site do cliente → paysOnline, startCheckout (EF create-payment), status
//   painel          → connection, connect (EF mp-oauth-start), setEnabled,
//                     disconnect, listForShop, refund (EF payment-refund)
import { supabase } from '@/lib/supabase'
import { supabasePublic } from '@/lib/supabase-public'
import { isRealBarbershopId } from '@/lib/placeOrder'
import { ONLINE_PAYMENT_ON } from '@/lib/onlinePayment'

export type PaymentStatus = 'pendente' | 'pago' | 'recusado' | 'estornado'

export interface OnlinePayment {
  id: string
  orderId: string | null
  appointmentId: string | null
  status: PaymentStatus
  amount: number
  platformFee: number
  method: string | null
  paidAt: string | null
  createdAt: string
}

export interface PaymentCheck {
  status: PaymentStatus | null
  hasAppointment: boolean
  hasOrder: boolean
}

export interface MpConnection {
  connected: boolean
  enabled: boolean
  connectedAt: string | null
}

export interface CheckoutInput {
  barbershopId: string
  slug: string
  phone: string
  appointmentId?: string
  orderId?: string
  /** Só a demo usa (no real o valor sai do banco) */
  amount: number
}

// ── Demo: pagamento simulado no navegador (site /b/atlas e painel demo
// compartilham o localStorage). Nada sai pro Mercado Pago.
const DEMO_KEY = 'barberos:pagamentos-demo:v2'
interface DemoState { off: string[]; payments: Record<string, OnlinePayment & { barbershopId: string }> }
const demoLoad = (): DemoState => {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(DEMO_KEY) ?? 'null')
    if (raw && typeof raw === 'object' && 'payments' in raw && 'off' in raw) return raw as DemoState
  } catch { /* storage bloqueado: começa vazio */ }
  return { off: [], payments: {} }
}
const demoSave = (s: DemoState) => { try { localStorage.setItem(DEMO_KEY, JSON.stringify(s)) } catch { /* ignora */ } }
const isDemoPayment = (id: string) => id.startsWith('demo-pay-')

const fnUrl = (name: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`

const asStatus = (s: unknown): PaymentStatus | null =>
  s === 'pendente' || s === 'pago' || s === 'recusado' || s === 'estornado' ? s : null

async function callFn<T>(name: string, body: unknown, token?: string): Promise<T> {
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  const res = await fetch(fnUrl(name), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: anon, Authorization: `Bearer ${token ?? anon}` },
    body: JSON.stringify(body),
  })
  let parsed: unknown = null
  try { parsed = await res.json() } catch { /* sem corpo */ }
  const obj = parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}
  if (!res.ok) throw new Error(typeof obj.error === 'string' ? obj.error : 'Não deu certo agora. Tente de novo.')
  return obj as T
}

async function sessionToken(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sessão expirada. Entre de novo.')
  return token
}

export const onlinePaymentRepository = {
  // ── Site do cliente ──────────────────────────────────────────────────────
  async paysOnline(barbershopId: string): Promise<boolean> {
    // Chave desligada: ninguém vê pagamento online (nem a demo publicada)
    if (!ONLINE_PAYMENT_ON) return false
    if (!isRealBarbershopId(barbershopId)) return !demoLoad().off.includes(barbershopId)
    const { data, error } = await supabasePublic.rpc('public_store_pays_online', { p_barbershop_id: barbershopId })
    if (error) return false // na dúvida, paga na barbearia
    return data === true
  },

  /** Abre o checkout do Mercado Pago (o navegador sai do site). */
  async startCheckout(input: CheckoutInput): Promise<void> {
    if (!isRealBarbershopId(input.barbershopId)) {
      // Demo: finge o checkout e volta direto aprovado (Pix)
      const id = `demo-pay-${crypto.randomUUID()}`
      const s = demoLoad()
      s.payments[id] = {
        id, barbershopId: input.barbershopId,
        orderId: input.orderId ?? null, appointmentId: input.appointmentId ?? null,
        status: 'pago', amount: input.amount, platformFee: Math.round(input.amount * 1.5) / 100,
        method: 'pix', paidAt: new Date().toISOString(), createdAt: new Date().toISOString(),
      }
      demoSave(s)
      await new Promise(r => setTimeout(r, 900))
      window.location.href = `/b/${input.slug}/pagamento/${id}`
      return
    }
    const { url } = await callFn<{ url?: string }>('create-payment', {
      phone: input.phone.replace(/\D/g, ''),
      ...(input.appointmentId ? { appointmentId: input.appointmentId } : {}),
      ...(input.orderId ? { orderId: input.orderId } : {}),
    })
    if (!url) throw new Error('Não deu pra abrir o pagamento agora. Pague na barbearia.')
    window.location.href = url
  },

  async status(paymentId: string): Promise<PaymentCheck> {
    if (isDemoPayment(paymentId)) {
      const p = demoLoad().payments[paymentId]
      return { status: p?.status ?? null, hasAppointment: !!p?.appointmentId, hasOrder: !!p?.orderId }
    }
    const { data, error } = await supabasePublic.rpc('public_payment_status', { p_payment_id: paymentId })
    if (error) throw error
    const row = data?.[0]
    return { status: asStatus(row?.status), hasAppointment: !!row?.has_appointment, hasOrder: !!row?.has_order }
  },

  // ── Painel ───────────────────────────────────────────────────────────────
  async connection(barbershopId: string): Promise<MpConnection> {
    if (!isRealBarbershopId(barbershopId)) {
      return { connected: true, enabled: !demoLoad().off.includes(barbershopId), connectedAt: null }
    }
    const { data, error } = await supabase.rpc('my_mp_connection', { p_barbershop_id: barbershopId })
    if (error) throw error
    const row = data?.[0]
    return row ? { connected: true, enabled: row.enabled, connectedAt: row.connected_at } : { connected: false, enabled: false, connectedAt: null }
  },

  /** Vai pro Mercado Pago autorizar; volta em /dashboard/configuracoes?mp=… */
  async connect(barbershopId: string): Promise<void> {
    const { url } = await callFn<{ url?: string }>('mp-oauth-start', { barbershopId }, await sessionToken())
    if (!url) throw new Error('Não deu pra abrir o Mercado Pago agora.')
    window.location.href = url
  },

  async setEnabled(barbershopId: string, enabled: boolean): Promise<void> {
    if (!isRealBarbershopId(barbershopId)) {
      const s = demoLoad()
      s.off = enabled ? s.off.filter(id => id !== barbershopId) : [...new Set([...s.off, barbershopId])]
      demoSave(s)
      return
    }
    const { error } = await supabase.rpc('set_mp_payment_enabled', { p_barbershop_id: barbershopId, p_enabled: enabled })
    if (error) throw error
  },

  async disconnect(barbershopId: string): Promise<void> {
    const { error } = await supabase.rpc('disconnect_mp', { p_barbershop_id: barbershopId })
    if (error) throw error
  },

  async listForShop(barbershopId: string): Promise<OnlinePayment[]> {
    if (!isRealBarbershopId(barbershopId)) {
      return Object.values(demoLoad().payments).filter(p => p.barbershopId === barbershopId)
    }
    const { data, error } = await supabase
      .from('online_payments')
      .select('id, order_id, appointment_id, status, amount, platform_fee, method, paid_at, created_at')
      .eq('barbershop_id', barbershopId)
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw error
    return (data ?? []).flatMap(r => {
      const status = asStatus(r.status)
      return status ? [{
        id: r.id,
        orderId: r.order_id,
        appointmentId: r.appointment_id,
        status,
        amount: Number(r.amount),
        platformFee: Number(r.platform_fee),
        method: r.method,
        paidAt: r.paid_at,
        createdAt: r.created_at,
      }] : []
    })
  },

  async refund(paymentId: string): Promise<void> {
    if (isDemoPayment(paymentId)) {
      const s = demoLoad()
      if (s.payments[paymentId]) s.payments[paymentId] = { ...s.payments[paymentId], status: 'estornado' }
      demoSave(s)
      return
    }
    await callFn('payment-refund', { paymentId }, await sessionToken())
  },
}

/**
 * Como o cliente vai pagar, pro painel:
 *   online   — pago pelo Mercado Pago
 *   pagando  — abriu o checkout há menos de 30 min (pode confirmar a qualquer momento)
 *   local    — não pagou online (escolheu pagar no local, desistiu ou foi recusado)
 *   estornado
 */
export type PayWay = 'online' | 'pagando' | 'local' | 'estornado'
const CHECKOUT_TTL_MS = 30 * 60_000
export function payWay(p: OnlinePayment | undefined): PayWay {
  if (!p) return 'local'
  if (p.status === 'pago') return 'online'
  if (p.status === 'estornado') return 'estornado'
  if (p.status === 'pendente' && Date.now() - new Date(p.createdAt).getTime() < CHECKOUT_TTL_MS) return 'pagando'
  return 'local'
}

/** Rótulo do meio de pagamento pro painel. */
export const PAYMENT_METHOD: Record<string, string> = {
  pix: 'Pix', credit_card: 'cartão de crédito', debit_card: 'cartão de débito', account_money: 'saldo MP',
}
