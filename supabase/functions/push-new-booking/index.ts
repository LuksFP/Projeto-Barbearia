// Edge Function: push-new-booking
// Manda notificação push (Web Push / VAPID) pra todos os aparelhos da equipe
// quando o cliente marca pelo site. Chega mesmo com o navegador fechado.
//
// Chamada pelo gatilho `trg_push_new_booking` (net.http_post) com
// { appointment_id } e header x-cron-secret. O corpo só traz o id: o
// agendamento é relido aqui com service role.
//
// Secrets:
//   CRON_SECRET        — o mesmo do Vault `trial_cron_secret`
//   VAPID_PUBLIC_KEY   — par da chave usada no front (src/lib/push.ts)
//   VAPID_PRIVATE_KEY
//   VAPID_SUBJECT      — mailto: de contato exigido pelo protocolo
//
// verify_jwt = false (autenticação própria via CRON_SECRET).

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

  const secret = Deno.env.get('CRON_SECRET')
  const provided = req.headers.get('x-cron-secret')
  if (!secret || !provided || !safeEqual(provided, secret)) return err('Unauthorized', 401)

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
  const id = (body as { appointment_id?: unknown } | null)?.appointment_id
  if (typeof id !== 'string' || !UUID_RE.test(id)) return err('appointment_id inválido')

  const supabase = createAdminClient()

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

  const payload = JSON.stringify({
    title: 'Novo agendamento!',
    body: parts.join(' · '),
    tag: `agendamento-${appt.id}`,
    url: '/dashboard/agenda',
  })

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

  return json({ sent, removed: dead.length })
})
