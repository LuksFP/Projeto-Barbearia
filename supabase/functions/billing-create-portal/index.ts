// Edge Function: billing-create-portal
// Cria uma sessão do Stripe Customer Portal para o cliente gerenciar a assinatura.
// O frontend redireciona o usuário para a URL retornada.
//
// Requer secrets no Supabase:
//   STRIPE_SECRET_KEY

import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'
import { createAdminClient, corsHeaders, json, err } from '../_shared/supabase-admin.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  // ── Autenticação ──────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return err('Missing Authorization header', 401)

  const supabase = createAdminClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (authErr || !user) return err('Unauthorized', 401)

  // ── Body ──────────────────────────────────────────────────────────────────
  const ALLOWED_RETURN_ORIGINS = ['https://barberos.io', 'http://localhost:5173', 'http://localhost:4173']
  const DEFAULT_RETURN_URL = 'https://barberos.io/dashboard/assinatura'

  let returnUrl: string
  try {
    const body = await req.json() as { returnUrl?: string }
    const candidate = body.returnUrl ?? ''
    if (candidate) {
      try {
        const parsed = new URL(candidate)
        const origin = parsed.origin
        returnUrl = ALLOWED_RETURN_ORIGINS.includes(origin) ? candidate : DEFAULT_RETURN_URL
      } catch {
        returnUrl = DEFAULT_RETURN_URL
      }
    } else {
      returnUrl = DEFAULT_RETURN_URL
    }
  } catch {
    returnUrl = DEFAULT_RETURN_URL
  }

  // ── Conta SaaS ────────────────────────────────────────────────────────────
  const { data: account, error: accErr } = await supabase
    .from('saas_accounts')
    .select('id, stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (accErr || !account) return err('SaaS account not found', 404)

  const customerId = account.stripe_customer_id as string | null
  if (!customerId) return err('Nenhuma assinatura ativa encontrada. Finalize o pagamento primeiro.', 400)

  // ── Portal Stripe ─────────────────────────────────────────────────────────
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return json({ url: session.url })
})
