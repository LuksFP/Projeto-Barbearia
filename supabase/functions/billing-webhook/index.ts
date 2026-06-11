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

        if (!accountId || !plan) {
          console.error('Missing client_reference_id or plan metadata')
          break
        }

        const { error } = await supabase
          .from('saas_accounts')
          .update({
            plan,
            plan_status: 'active',
            plan_started_at: new Date().toISOString(),
            stripe_subscription_id: subId,
          })
          .eq('id', accountId)

        if (error) {
          console.error('activate plan error:', error)
          break
        }
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

      if (session.mode === 'payment') {
        const appointmentId = session.metadata?.appointment_id
        if (!appointmentId) {
          console.error('Missing appointment_id metadata')
          break
        }

        if (session.payment_status !== 'paid') {
          console.log(`Skipping booking confirmation for unpaid session ${session.id}`)
          break
        }

        const paymentIntentId = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : null

        const { error: updateError } = await supabase
          .from('appointments')
          .update({
            status: 'confirmed',
            payment_status: 'paid',
            payment_method: 'stripe',
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: paymentIntentId,
            paid_at: new Date().toISOString(),
          })
          .eq('id', appointmentId)

        if (updateError) {
          console.error('booking payment update error:', updateError)
          break
        }

        const clientEmail = session.metadata?.client_email || session.customer_details?.email
        if (clientEmail) {
          await supabase.functions.invoke('send-email', {
            body: {
              type: 'booking_confirmation',
              to: clientEmail,
              clientName: session.metadata?.client_name ?? '',
              barbershopName: session.metadata?.barbershop_name ?? 'BarberOS',
              serviceName: session.metadata?.service_name ?? '',
              barberName: session.metadata?.barber_name ?? 'A definir',
              date: session.metadata?.date ?? '',
              time: session.metadata?.time ?? '',
              barbershopSlug: session.metadata?.barbershop_slug ?? '',
            },
          }).catch(e => console.error('booking confirmation email failed:', e))
        }
        break
      }

      break
    }

    // Assinatura atualizada (upgrade, downgrade, renew, past_due, cancelamento agendado…)
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const accountId = sub.metadata?.saas_account_id
      const plan      = sub.metadata?.plan

      if (!accountId) break

      const update: Record<string, string | null> = {}

      if (sub.cancel_at_period_end) {
        // Cancelamento agendado — mantém acesso até o fim do período
        update.plan_status = 'cancelling'
        update.cancel_at   = sub.cancel_at
          ? new Date(sub.cancel_at * 1000).toISOString()
          : sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null
      } else {
        // Cancelamento revertido ou status normal
        update.plan_status = toPlanStatus(sub.status)
        update.cancel_at   = null
      }

      if (plan) update.plan = plan

      const { error } = await supabase
        .from('saas_accounts')
        .update(update)
        .eq('id', accountId)

      if (error) console.error('subscription updated error:', error)
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
        await supabase
          .from('saas_accounts')
          .update({ plan_status: 'past_due' })
          .eq('id', account.id)

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

    case 'checkout.session.expired': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'payment') break

      const appointmentId = session.metadata?.appointment_id
      if (!appointmentId) break

      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          payment_status: 'cancelled',
        })
        .eq('id', appointmentId)

      if (error) console.error('booking expired update error:', error)
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
