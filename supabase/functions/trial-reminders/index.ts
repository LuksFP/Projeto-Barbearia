// Edge Function: trial-reminders
// Dispara email de lembrete para trials que expiram em <= 24h e ainda não foram avisados.
// Invocada pelo pg_cron (horário) via net.http_post, autenticada por header secreto.
//
// Requer secrets no Supabase:
//   CRON_SECRET                 — mesmo valor guardado no Vault e enviado pelo cron
//   SUPABASE_URL                — injetado automaticamente
//   SUPABASE_SERVICE_ROLE_KEY   — injetado automaticamente
//
// verify_jwt = false (autenticação própria via CRON_SECRET).

import { createAdminClient, corsHeaders, json, err } from '../_shared/supabase-admin.ts'

// Janela de antecedência: avisa quando faltam <= 24h para o fim do trial.
const WINDOW_HOURS = 24

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })
  if (req.method !== 'POST') return err('Method not allowed', 405)

  // Autenticação: header secreto compartilhado com o cron
  const secret = Deno.env.get('CRON_SECRET')
  const provided = req.headers.get('x-cron-secret')
  if (!secret || provided !== secret) return err('Unauthorized', 401)

  const supabase = createAdminClient()

  // Trials que vencem dentro da janela e ainda sem lembrete enviado
  const cutoff = new Date(Date.now() + WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  const nowIso = new Date().toISOString()

  const { data: accounts, error } = await supabase
    .from('saas_accounts')
    .select('id, user_id, owner_name, trial_ends_at')
    .eq('plan_status', 'trial')
    .is('trial_reminder_sent_at', null)
    .not('trial_ends_at', 'is', null)
    .gt('trial_ends_at', nowIso)   // ainda não venceu
    .lte('trial_ends_at', cutoff)  // vence dentro da janela

  if (error) {
    console.error('trial-reminders query error:', error)
    return err('Query failed', 500)
  }

  let sent = 0
  const failures: string[] = []

  for (const acc of accounts ?? []) {
    try {
      // Email do dono vive em auth.users
      const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(acc.user_id)
      const email = userData?.user?.email
      if (userErr || !email) {
        failures.push(`${acc.id}: sem email`)
        continue
      }

      const hoursLeft = Math.max(
        1,
        Math.round((new Date(acc.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60)),
      )

      const { error: sendErr } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'trial_ending',
          to: email,
          ownerName: acc.owner_name ?? '',
          hoursLeft,
        },
      })
      if (sendErr) {
        failures.push(`${acc.id}: ${sendErr.message}`)
        continue
      }

      // Marca como avisado só após envio bem-sucedido (idempotência)
      await supabase
        .from('saas_accounts')
        .update({ trial_reminder_sent_at: nowIso })
        .eq('id', acc.id)

      sent++
    } catch (e) {
      failures.push(`${acc.id}: ${e instanceof Error ? e.message : 'erro'}`)
    }
  }

  if (failures.length) console.error('trial-reminders failures:', failures)

  return json({ candidates: accounts?.length ?? 0, sent, failed: failures.length })
})
