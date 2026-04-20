// Edge Function: billing-update-subscription
// Troca o plano de uma assinatura Stripe já existente (upgrade OU downgrade).
// Usa subscriptions.update() com proration — sem criar nova assinatura.
//
// Requer secrets: STRIPE_SECRET_KEY, STRIPE_PRICE_ID_BASIC/PRO/PREMIUM

import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'
import { createAdminClient, corsHeaders, json, err } from '../_shared/supabase-admin.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
})

const PRICE_IDS: Record<string, string | undefined> = {
  basic:   Deno.env.get('STRIPE_PRICE_ID_BASIC'),
  pro:     Deno.env.get('STRIPE_PRICE_ID_PRO'),
  premium: Deno.env.get('STRIPE_PRICE_ID_PREMIUM'),
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return err('Missing Authorization header', 401)

  const supabase = createAdminClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (authErr || !user) return err('Unauthorized', 401)

  let body: { plan: string }
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON body')
  }

  const { plan } = body
  const priceId = PRICE_IDS[plan]
  if (!priceId) return err(`Unknown plan: ${plan}`)

  // Conta SaaS
  const { data: account, error: accErr } = await supabase
    .from('saas_accounts')
    .select('id, stripe_customer_id, plan')
    .eq('user_id', user.id)
    .maybeSingle()

  if (accErr || !account) return err('SaaS account not found', 404)

  const customerId = account.stripe_customer_id as string | null
  if (!customerId) return err('Nenhuma assinatura encontrada. Finalize o pagamento primeiro.', 400)

  if ((account.plan as string) === plan) return err('Você já está neste plano.', 400)

  // Busca assinatura ativa
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
  })

  if (subs.data.length === 0) {
    // Sem assinatura ativa — retorna sinal para o frontend usar o checkout normal
    return json({ requiresCheckout: true })
  }

  const subscription = subs.data[0]
  const itemId = subscription.items.data[0].id

  // Atualiza o item da assinatura para o novo preço
  // proration_behavior: 'create_prorations' — gera crédito/débito proporcional imediatamente
  await stripe.subscriptions.update(subscription.id, {
    items: [{ id: itemId, price: priceId }],
    proration_behavior: 'create_prorations',
    metadata: { plan, saas_account_id: account.id as string },
  })

  // Atualiza nosso banco imediatamente (o webhook vai confirmar depois)
  await supabase
    .from('saas_accounts')
    .update({ plan, plan_status: 'active' })
    .eq('id', account.id)

  return json({ success: true })
})
