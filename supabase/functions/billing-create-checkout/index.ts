// Edge Function: billing-create-checkout
// Cria uma sessão de Stripe Checkout para o plano escolhido.
// O frontend redireciona o usuário para a URL retornada.
//
// Requer secrets no Supabase:
//   STRIPE_SECRET_KEY
//   STRIPE_PRICE_ID_BASIC
//   STRIPE_PRICE_ID_PRO
//   STRIPE_PRICE_ID_PREMIUM

import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'
import { createAdminClient, corsHeaders, json, err } from '../_shared/supabase-admin.ts'

const PRICE_IDS: Record<string, string | undefined> = {
  basic:   Deno.env.get('STRIPE_PRICE_ID_BASIC'),
  pro:     Deno.env.get('STRIPE_PRICE_ID_PRO'),
  premium: Deno.env.get('STRIPE_PRICE_ID_PREMIUM'),
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    // ── Stripe init ───────────────────────────────────────────────────────────
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) return err('Stripe não configurado', 500)

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-04-10',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // ── Autenticação ──────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return err('Missing Authorization header', 401)

    const token = authHeader.replace('Bearer ', '')

    let userId: string
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (!payload?.sub) throw new Error('no sub')
      userId = payload.sub as string
    } catch {
      return err('Unauthorized', 401)
    }

    const supabase = createAdminClient()

    const { data: authUser, error: authErr } = await supabase.auth.admin.getUserById(userId)
    if (authErr || !authUser?.user) return err('Unauthorized', 401)

    const user = authUser.user

    // ── Body ──────────────────────────────────────────────────────────────────
    let body: { plan: string; successUrl: string; cancelUrl: string }
    try {
      body = await req.json()
    } catch {
      return err('Invalid JSON body')
    }

    const { plan, successUrl, cancelUrl } = body
    const priceId = PRICE_IDS[plan]
    if (!priceId) return err(`Unknown plan: ${plan}`)
    if (!successUrl || !cancelUrl) return err('successUrl and cancelUrl required')

    // Valida origens para evitar open redirect
    const isAllowedUrl = (url: string) => {
      try {
        const origin = new URL(url).origin
        return (
          origin === 'https://barberos.io' ||
          origin.endsWith('.vercel.app') ||
          origin === 'http://localhost:5173' ||
          origin === 'http://localhost:4173'
        )
      } catch { return false }
    }
    if (!isAllowedUrl(successUrl) || !isAllowedUrl(cancelUrl)) {
      return err('URL de redirecionamento inválida', 400)
    }

    // ── Conta SaaS ────────────────────────────────────────────────────────────
    const { data: account, error: accErr } = await supabase
      .from('saas_accounts')
      .select('id, owner_name, stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (accErr || !account) return err('SaaS account not found', 404)

    // ── Cliente Stripe ────────────────────────────────────────────────────────
    let customerId = account.stripe_customer_id as string | null

    if (!customerId) {
      const existing = await stripe.customers.search({
        query: `metadata['saas_account_id']:'${account.id as string}'`,
        limit: 1,
      })

      if (existing.data.length > 0) {
        customerId = existing.data[0].id
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          name: account.owner_name as string,
          metadata: { saas_account_id: account.id as string },
        })
        customerId = customer.id
      }

      await supabase
        .from('saas_accounts')
        .update({ stripe_customer_id: customerId })
        .eq('id', account.id)
    }

    // ── Sessão de Checkout ────────────────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: account.id as string,
      metadata: { plan, saas_account_id: account.id as string },
      subscription_data: {
        metadata: { plan, saas_account_id: account.id as string },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      locale: 'pt-BR',
    })

    return json({ url: session.url })

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('billing-create-checkout error:', msg)
    return err(`Erro interno: ${msg}`, 500)
  }
})
