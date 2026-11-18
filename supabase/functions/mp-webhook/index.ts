// Edge Function: mp-webhook (sem JWT — quem chama é o Mercado Pago).
// URL vem do notification_url da preferência: .../mp-webhook?bs=<barbearia>.
//
// Não confia no corpo: pega o id do pagamento, busca na API do MP com o token
// DA BARBEARIA e só grava se external_reference for um pagamento dela
// (online_payments.id) e o valor bater com o registrado. Responde 200 pra tudo que não é erro nosso, senão o
// MP fica reenviando.

import { createAdminClient, json } from '../_shared/supabase-admin.ts'
import { MpError, mpFetch, type MpPayment, paymentMethodLabel, sellerAccount, UUID_RE, webhookSignatureOk } from '../_shared/mp.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: true })

  const url = new URL(req.url)
  const barbershopId = url.searchParams.get('bs') ?? ''
  if (!UUID_RE.test(barbershopId)) return json({ ignored: 'bs' })

  let body: Record<string, unknown> = {}
  try {
    const parsed: unknown = await req.json()
    if (parsed && typeof parsed === 'object') body = parsed as Record<string, unknown>
  } catch { /* notificação antiga vem só na query */ }

  const type = (typeof body.type === 'string' ? body.type : null) ?? url.searchParams.get('type') ?? url.searchParams.get('topic')
  if (type !== 'payment') return json({ ignored: type ?? 'sem tipo' })

  const data = body.data && typeof body.data === 'object' ? body.data as Record<string, unknown> : {}
  const paymentId = String(data.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? '')
  if (!/^[0-9]{1,20}$/.test(paymentId)) return json({ ignored: 'id' })

  if (await webhookSignatureOk(req, paymentId) === false) {
    console.warn('mp-webhook: assinatura inválida', paymentId)
    return json({ error: 'assinatura' }, 401)
  }

  const admin = createAdminClient()

  let payment: MpPayment
  try {
    const seller = await sellerAccount(admin, barbershopId)
    if (!seller) return json({ ignored: 'barbearia sem MP' })
    payment = await mpFetch<MpPayment>(`/v1/payments/${paymentId}`, seller.token)
  } catch (e: unknown) {
    console.error('mp-webhook fetch', e instanceof MpError ? { status: e.status, body: e.body } : e)
    // 404 = pagamento não é dessa conta (ou inventado): não adianta reenviar
    if (e instanceof MpError && e.status === 404) return json({ ignored: 'não encontrado' })
    return json({ error: 'tente de novo' }, 500)
  }

  const paymentRef = payment.external_reference ?? ''
  if (!UUID_RE.test(paymentRef)) return json({ ignored: 'sem referência' })

  const { data: op } = await admin
    .from('online_payments')
    .select('status, amount, barbershop_id, order_id, appointment_id')
    .eq('id', paymentRef)
    .maybeSingle()
  if (!op || op.barbershop_id !== barbershopId) return json({ ignored: 'pagamento de outra barbearia' })

  const now = new Date().toISOString()

  if (payment.status === 'approved') {
    if (Math.abs(Number(payment.transaction_amount) - Number(op.amount)) > 0.009) {
      console.error('mp-webhook: valor diferente', { paymentRef, pago: payment.transaction_amount, esperado: op.amount })
      return json({ ignored: 'valor' })
    }
    if (op.status === 'pendente' || op.status === 'recusado') {
      await admin.from('online_payments').update({
        status: 'pago',
        mp_payment_id: String(payment.id),
        method: paymentMethodLabel(payment),
        paid_at: payment.date_approved ?? now,
        updated_at: now,
      }).eq('id', paymentRef).in('status', ['pendente', 'recusado'])
    }
    return json({ ok: 'pago' })
  }

  if (payment.status === 'rejected' || payment.status === 'cancelled') {
    // Cliente pode tentar de novo; pedido continua como reserva normal
    await admin.from('online_payments').update({ status: 'recusado', mp_payment_id: String(payment.id), updated_at: now })
      .eq('id', paymentRef).eq('status', 'pendente')
    return json({ ok: 'recusado' })
  }

  if (payment.status === 'refunded' || payment.status === 'charged_back') {
    // Estorno feito pelo app do MP (ou contestação): registra, devolve ao
    // estoque o que ainda estava pra retirar e libera o horário que ainda não
    // aconteceu. Service role passa nos gatilhos.
    if (op.status !== 'estornado') {
      await admin.from('online_payments').update({ status: 'estornado', refunded_at: now, updated_at: now }).eq('id', paymentRef)
      if (op.order_id) await admin.from('product_sales').update({ status: 'cancelado' }).eq('order_id', op.order_id).eq('status', 'reservado')
      if (op.appointment_id) await admin.from('appointments').update({ status: 'cancelled' }).eq('id', op.appointment_id).in('status', ['pending', 'confirmed', 'no_show'])
    }
    return json({ ok: 'estornado' })
  }

  return json({ ok: payment.status }) // pending / in_process: espera a próxima notificação
})
