// Edge Function: billing-webhook
// Recebe eventos do Stripe e mantém o banco sincronizado.
// verify_jwt = false — autenticação via Stripe-Signature header.
//
// Requer secrets no Supabase:
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET   ← gerado no Stripe Dashboard > Webhooks

import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'
import { createAdminClient, json, err } from '../_shared/supabase-admin.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
})

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

// Preço do Stripe → plano. Quem troca de plano pelo Customer Portal muda o preço
// mas não o metadata.plan (só o nosso billing-update-subscription escreve ali),
// então o plano de verdade é o do item da assinatura.
const PLAN_BY_PRICE: Record<string, string> = {}
for (const plan of ['basic', 'pro', 'premium']) {
  const id = Deno.env.get(`STRIPE_PRICE_ID_${plan.toUpperCase()}`)
  if (id) PLAN_BY_PRICE[id] = plan
}
function planFromSubscription(sub: Stripe.Subscription): string | undefined {
  const priceId = sub.items?.data?.[0]?.price?.id
  return (priceId && PLAN_BY_PRICE[priceId]) || sub.metadata?.plan || undefined
}

// Mapeia status de subscription Stripe → status interno
function toPlanStatus(status: Stripe.Subscription.Status): string {
  switch (status) {
    case 'active':            return 'active'
    case 'trialing':          return 'trial'
    case 'past_due':          return 'past_due'
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired': return 'cancelled'
    default:                  return 'past_due'
  }
}

// Registra quando a conta entrou em past_due (só na 1ª falha; as seguintes não
// renovam a carência). O front dá alguns dias de acesso a partir desta data.
async function markPastDue(supabase: ReturnType<typeof createAdminClient>, accountId: string) {
  const { error } = await supabase
    .from('saas_accounts')
    .update({ past_due_since: new Date().toISOString() })
    .eq('id', accountId)
    .is('past_due_since', null)
  if (error) throw new Error(`markPastDue: ${error.message}`)
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return err('Method not allowed', 405)

  // ── Verificação de assinatura Stripe ─────────────────────────────────────
  const sig = req.headers.get('stripe-signature')
  if (!sig) return err('Missing stripe-signature', 400)

  const body = await req.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, WEBHOOK_SECRET)
  } catch (e) {
    console.error('Webhook signature failed:', e)
    return err('Invalid signature', 400)
  }

  const supabase = createAdminClient()

  // ── Idempotência ────────────────────────────────────────────────────────────
  // O Stripe pode reenviar o mesmo evento. Fazemos o "claim" do event.id:
  // se já existe, ignoramos sem reprocessar (evita e-mail/ação duplicada).
  const { error: dupErr } = await supabase
    .from('processed_stripe_events')
    .insert({ event_id: event.id, type: event.type })

  if (dupErr) {
    if (dupErr.code === '23505') {
      // unique_violation → evento já processado
      console.log(`Evento duplicado ignorado: ${event.id}`)
      return json({ received: true, duplicate: true })
    }
    // Falha ao registrar → retorna 500 para o Stripe reenviar depois
    console.error('idempotency insert error:', dupErr)
    return err('Idempotency store error', 500)
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  try {
  switch (event.type) {

    // Pagamento concluído → ativa o plano
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode === 'subscription') {
        const accountId = session.client_reference_id
        const plan      = session.metadata?.plan
        const subId     = session.subscription as string

        // Lança (em vez de break): o catch abaixo desfaz o claim e devolve 500,
        // então o Stripe reenvia. Com break o evento ficava "processado" e o
        // cliente pagava sem o plano ativar.
        if (!accountId || !plan) {
          throw new Error('checkout.session.completed sem client_reference_id ou metadata.plan')
        }

        const { error } = await supabase
          .from('saas_accounts')
          .update({
            plan,
            plan_status: 'active',
            plan_started_at: new Date().toISOString(),
            stripe_subscription_id: subId,
            past_due_since: null,
          })
          .eq('id', accountId)

        if (error) throw new Error(`activate plan: ${error.message}`)
        console.log(`Plan ${plan} activated for account ${accountId}`)

        // Email de boas-vindas
        const { data: acc } = await supabase
          .from('saas_accounts')
          .select('owner_name')
          .eq('id', accountId)
          .maybeSingle()

        const emailTo = (session.customer_details?.email) as string | undefined
        if (emailTo && acc?.owner_name) {
          await supabase.functions.invoke('send-email', {
            body: { type: 'welcome', to: emailTo, ownerName: acc.owner_name, plan },
          }).catch(e => console.error('welcome email failed:', e))
        }
        break
      }

      break
    }

    // Assinatura atualizada (upgrade, downgrade, renew, past_due, cancelamento agendado…)
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const accountId = sub.metadata?.saas_account_id
      const plan      = planFromSubscription(sub)

      if (!accountId) break

      const update: Record<string, string | null> = {}
      let nextStatus: string

      if (sub.cancel_at_period_end) {
        // Cancelamento agendado — mantém acesso até o fim do período
        nextStatus = 'cancelling'
        update.plan_status = nextStatus
        update.cancel_at   = sub.cancel_at
          ? new Date(sub.cancel_at * 1000).toISOString()
          : sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null
      } else {
        // Cancelamento revertido ou status normal
        nextStatus = toPlanStatus(sub.status)
        update.plan_status = nextStatus
        update.cancel_at   = null
      }

      if (plan) update.plan = plan
      // Fora de past_due a carência zera; em past_due preserva o início (abaixo)
      if (nextStatus !== 'past_due') update.past_due_since = null

      const { error } = await supabase
        .from('saas_accounts')
        .update(update)
        .eq('id', accountId)

      if (error) throw new Error(`subscription updated: ${error.message}`)

      if (nextStatus === 'past_due') await markPastDue(supabase, accountId)
      break
    }

    // Pagamento falhou
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const subId = invoice.subscription as string
      if (!subId) break

      const { data: account } = await supabase
        .from('saas_accounts')
        .select('id, owner_name')
        .eq('stripe_subscription_id', subId)
        .maybeSingle()

      if (account) {
        const { error: pdErr } = await supabase
          .from('saas_accounts')
          .update({ plan_status: 'past_due' })
          .eq('id', account.id)
        if (pdErr) throw new Error(`payment_failed: ${pdErr.message}`)
        await markPastDue(supabase, account.id as string)

        // Email de pagamento falhou
        const emailTo = (invoice.customer_email) as string | null
        if (emailTo && account.owner_name) {
          await supabase.functions.invoke('send-email', {
            body: { type: 'payment_failed', to: emailTo, ownerName: account.owner_name },
          }).catch(e => console.error('payment_failed email error:', e))
        }
      }
      break
    }

    // Assinatura cancelada — envia email
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const accountId = sub.metadata?.saas_account_id
      if (!accountId) break

      const { data: account } = await supabase
        .from('saas_accounts')
        .select('id, owner_name')
        .eq('id', accountId)
        .maybeSingle()

      await supabase
        .from('saas_accounts')
        .update({ plan_status: 'cancelled', stripe_subscription_id: null })
        .eq('id', accountId)

      const customer = await stripe.customers.retrieve(sub.customer as string)
      const emailTo = !customer.deleted ? customer.email : null
      if (emailTo && account?.owner_name) {
        await supabase.functions.invoke('send-email', {
          body: { type: 'cancellation', to: emailTo, ownerName: account.owner_name },
        }).catch(e => console.error('cancellation email error:', e))
      }
      break
    }

    default:
      console.log(`Unhandled event: ${event.type}`)
  }
  } catch (e) {
    // Erro inesperado no handler — desfaz o claim para o Stripe reenviar o evento
    console.error('webhook handler error, revertendo claim de idempotência:', e)
    await supabase.from('processed_stripe_events').delete().eq('event_id', event.id)
    return err('Handler error', 500)
  }

  // Stripe exige 200 rápido para não reenviar o evento
  return json({ received: true })
})
