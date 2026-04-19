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
  const APP_URL = Deno.env.get('APP_URL') ?? 'https://barberos.io'
  const DEFAULT_RETURN_URL = `${APP_URL}/dashboard/assinatura`

  const isAllowedOrigin = (url: string) => {
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

  let returnUrl: string
  try {
    const body = await req.json() as { returnUrl?: string }
    const candidate = body.returnUrl ?? ''
    returnUrl = (candidate && isAllowedOrigin(candidate)) ? candidate : DEFAULT_RETURN_URL
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
  let session: Awaited<ReturnType<typeof stripe.billingPortal.sessions.create>>
  try {
    session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao criar sessão no Stripe.'
    console.error('billing-create-portal stripe error:', msg)
    return err(msg, 500)
  }

  return json({ url: session.url })
})
