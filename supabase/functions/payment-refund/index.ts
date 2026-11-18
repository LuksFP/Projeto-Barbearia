// Edge Function: payment-refund
// Dono/admin estorna um pagamento online (horário e/ou produtos): devolve o
// valor inteiro no Mercado Pago e só então cancela — itens do pedido (estoque
// volta pelo gatilho) e o horário, se ainda não foi atendido. A taxa da
// plataforma é devolvida pelo próprio MP na mesma proporção.
//
// Body: { paymentId }

import { createAdminClient, corsHeaders, json, err } from '../_shared/supabase-admin.ts'
import { MpError, mpFetch, requireShopAdmin, sellerAccount, UUID_RE } from '../_shared/mp.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })
  if (req.method !== 'POST') return err('Método não permitido', 405)

  let paymentId = ''
  try {
    const body: unknown = await req.json()
    if (body && typeof body === 'object' && typeof (body as Record<string, unknown>).paymentId === 'string') {
      paymentId = (body as Record<string, string>).paymentId
    }
  } catch { /* cai no check */ }
  if (!UUID_RE.test(paymentId)) return err('Pagamento inválido')

  const admin = createAdminClient()
  const { data: op } = await admin
    .from('online_payments')
    .select('status, barbershop_id, mp_payment_id, order_id, appointment_id')
    .eq('id', paymentId)
    .maybeSingle()
  if (!op) return err('Pagamento não encontrado', 404)

  const who = await requireShopAdmin(req, op.barbershop_id)
  if ('error' in who) return err(who.error, who.status)

  if (op.status === 'estornado') return json({ ok: true, already: true })
  if (op.status !== 'pago' || !op.mp_payment_id) return err('Não está pago', 409)

  let seller
  try {
    seller = await sellerAccount(admin, op.barbershop_id)
  } catch (e: unknown) {
    console.error('sellerAccount', e)
    return err('Não deu pra falar com o Mercado Pago agora', 502)
  }
  if (!seller) return err('Mercado Pago desconectado. Faça o estorno pelo app do Mercado Pago.', 409)

  try {
    await mpFetch(`/v1/payments/${op.mp_payment_id}/refunds`, seller.token, {
      method: 'POST',
      headers: { 'X-Idempotency-Key': `refund-${paymentId}` },
      body: '{}',
    })
  } catch (e: unknown) {
    console.error('refund', e instanceof MpError ? { status: e.status, body: e.body } : e)
    return err('O Mercado Pago recusou o estorno. Tente pelo app do Mercado Pago.', 502)
  }

  const now = new Date().toISOString()
  await admin.from('online_payments').update({ status: 'estornado', refunded_at: now, updated_at: now }).eq('id', paymentId)
  if (op.order_id) {
    const { error } = await admin.from('product_sales').update({ status: 'cancelado' }).eq('order_id', op.order_id).neq('status', 'cancelado')
    if (error) console.error('cancel order after refund', error)
  }
  if (op.appointment_id) {
    const { error } = await admin.from('appointments').update({ status: 'cancelled' }).eq('id', op.appointment_id).in('status', ['pending', 'confirmed', 'no_show'])
    if (error) console.error('cancel appointment after refund', error)
  }

  return json({ ok: true })
})
