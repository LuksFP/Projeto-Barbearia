// Edge Function: push-new-booking
// Manda notificação push (Web Push / VAPID) pra todos os aparelhos da equipe
// quando o cliente marca pelo site. Chega mesmo com o navegador fechado.
//
// Chamada pelo gatilho `trg_push_new_booking` (net.http_post) com
// { appointment_id } e header x-cron-secret. O corpo só traz o id: o
// agendamento é relido aqui com service role.
//
// Também chamada por public_place_product_order com { order_id } quando o
// cliente compra na loja do site: "Cliente agendado e venda realizada!" se o
// pedido veio junto do agendamento, "Nova reserva na loja!" se foi avulso.
//
// Secrets:
//   CRON_SECRET        — o mesmo do Vault `trial_cron_secret`
//   VAPID_PUBLIC_KEY   — par da chave usada no front (src/lib/push.ts)
//   VAPID_PRIVATE_KEY
//   VAPID_SUBJECT      — mailto: de contato exigido pelo protocolo
//
// verify_jwt = false (autenticação própria via CRON_SECRET).
//
// Teste: { test: true } com o JWT do usuário logado (Authorization: Bearer)
// manda um aviso de exemplo só pros aparelhos DESTE usuário. É o que o sino
// do painel chama ao ser ligado, pra confirmar que a notificação chega.

import webpush from 'npm:web-push@3.6.7'
import { createAdminClient, corsHeaders, json, err } from '../_shared/supabase-admin.ts'

function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const x = enc.encode(a)
  const y = enc.encode(b)
  let diff = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return diff === 0
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function brl(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })
  if (req.method !== 'POST') return err('Method not allowed', 405)

  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const subject = Deno.env.get('VAPID_SUBJECT')
  if (!publicKey || !privateKey || !subject) return err('VAPID não configurado', 500)
  webpush.setVapidDetails(subject, publicKey, privateKey)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return err('JSON inválido')
  }
  const supabase = createAdminClient()

  if ((body as { test?: unknown } | null)?.test === true) {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return err('Unauthorized', 401)
    const { data: userData, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !userData.user) return err('Unauthorized', 401)
    const { data: mine } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', userData.user.id)
    return json(
      await sendAll(supabase, mine ?? [], {
        title: 'Plim! Avisos ligados',
        body: 'É assim que vai chegar cada agendamento novo, mesmo com o app fechado.',
        tag: 'teste-aviso',
        url: '/dashboard/agenda',
      }),
    )
  }

  const secret = Deno.env.get('CRON_SECRET')
  const provided = req.headers.get('x-cron-secret')
  if (!secret || !provided || !safeEqual(provided, secret)) return err('Unauthorized', 401)

  const orderId = (body as { order_id?: unknown } | null)?.order_id
  if (orderId !== undefined) {
    if (typeof orderId !== 'string' || !UUID_RE.test(orderId)) return err('order_id inválido')
    const { data: lines, error: linesErr } = await supabase
      .from('product_sales')
      .select('barbershop_id, appointment_id, product_name, quantity, total, client_name, status, created_at')
      .eq('order_id', orderId)
    if (linesErr) return err('Falha ao ler pedido', 500)
    const open = (lines ?? []).filter(l => l.status === 'reservado')
    if (!open.length) return json({ sent: 0, skipped: 'not-open' })
    if (Date.now() - new Date(open[0].created_at).getTime() > 5 * 60 * 1000) return json({ sent: 0, skipped: 'stale' })

    const { data: orderSubs, error: orderSubsErr } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('barbershop_id', open[0].barbershop_id)
    if (orderSubsErr) return err('Falha ao ler inscrições', 500)
    if (!orderSubs?.length) return json({ sent: 0 })

    const items = open.map(l => `${l.quantity}× ${l.product_name}`).join(', ')
    const total = open.reduce((a, l) => a + Number(l.total), 0)
    const withBooking = open.some(l => l.appointment_id)
    return json(
      await sendAll(supabase, orderSubs, {
        title: withBooking ? 'Cliente agendado e venda realizada!' : 'Nova reserva na loja!',
        body: [open[0].client_name, items, brl(total)].join(' · '),
        tag: `pedido-${orderId}`,
        url: '/dashboard/loja',
      }),
    )
  }

  const id = (body as { appointment_id?: unknown } | null)?.appointment_id
  if (typeof id !== 'string' || !UUID_RE.test(id)) return err('appointment_id inválido')

  const { data: appt, error: apptErr } = await supabase
    .from('appointments')
    .select('id, barbershop_id, status, client_name, service_name, date, time, price, created_at')
    .eq('id', id)
    .maybeSingle()
  if (apptErr) return err('Falha ao ler agendamento', 500)
  if (!appt || appt.status !== 'pending') return json({ sent: 0, skipped: 'not-pending' })

  // Só avisa agendamento recém-criado: reenvio do mesmo id depois não vira spam.
  const ageMs = Date.now() - new Date(appt.created_at).getTime()
  if (ageMs > 5 * 60 * 1000) return json({ sent: 0, skipped: 'stale' })

  const { data: subs, error: subsErr } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('barbershop_id', appt.barbershop_id)
  if (subsErr) return err('Falha ao ler inscrições', 500)
  if (!subs?.length) return json({ sent: 0 })

  const [, m, d] = String(appt.date).split('-')
  const price = Number(appt.price)
  const parts = [
    appt.client_name,
    `${d}/${m} às ${String(appt.time).slice(0, 5)}`,
    appt.service_name,
    price > 0 ? brl(price) : null,
  ].filter(Boolean)

  return json(
    await sendAll(supabase, subs, {
      title: 'Parabéns! Novo horário agendado!',
      body: parts.join(' · '),
      tag: `agendamento-${appt.id}`,
      url: '/dashboard/agenda',
    }),
  )
})

type Sub = { id: string; endpoint: string; p256dh: string; auth: string }

async function sendAll(
  supabase: ReturnType<typeof createAdminClient>,
  subs: Sub[],
  message: { title: string; body: string; tag: string; url: string },
): Promise<{ sent: number; removed: number }> {
  if (!subs.length) return { sent: 0, removed: 0 }
  const payload = JSON.stringify(message)

  let sent = 0
  const dead: string[] = []
  const used: string[] = []

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { TTL: 60 * 60 * 6, urgency: 'high' },
        )
        sent++
        used.push(s.id)
      } catch (e: unknown) {
        const status = (e as { statusCode?: number }).statusCode
        // 404/410 = aparelho desinstalou ou revogou: limpa a inscrição.
        if (status === 404 || status === 410) dead.push(s.id)
        else console.error('push falhou', status, (e as Error).message)
      }
    }),
  )

  if (dead.length) await supabase.from('push_subscriptions').delete().in('id', dead)
  if (used.length) {
    await supabase
      .from('push_subscriptions')
      .update({ last_used_at: new Date().toISOString() })
      .in('id', used)
  }

  return { sent, removed: dead.length }
}
