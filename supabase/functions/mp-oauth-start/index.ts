// Edge Function: mp-oauth-start
// Dono/admin clica "Conectar Mercado Pago" em Configurações › Vendas no site.
// Devolve a URL de autorização do MP; a volta cai em mp-oauth-callback.
//
// Body: { barbershopId }

import { corsHeaders, json, err } from '../_shared/supabase-admin.ts'
import { mpCallbackUrl, requireShopAdmin, signState, UUID_RE } from '../_shared/mp.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })
  if (req.method !== 'POST') return err('Método não permitido', 405)

  const clientId = Deno.env.get('MP_CLIENT_ID')
  if (!clientId || !Deno.env.get('MP_CLIENT_SECRET') || !Deno.env.get('MP_TOKEN_KEY')) {
    return err('Pagamento online ainda não configurado na plataforma', 503)
  }

  let barbershopId = ''
  try {
    const body: unknown = await req.json()
    if (body && typeof body === 'object' && typeof (body as Record<string, unknown>).barbershopId === 'string') {
      barbershopId = (body as Record<string, string>).barbershopId
    }
  } catch { /* corpo inválido cai no check abaixo */ }
  if (!UUID_RE.test(barbershopId)) return err('Barbearia inválida')

  const who = await requireShopAdmin(req, barbershopId)
  if ('error' in who) return err(who.error, who.status)

  const url = new URL('https://auth.mercadopago.com.br/authorization')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('platform_id', 'mp')
  url.searchParams.set('state', await signState(barbershopId, who.userId))
  url.searchParams.set('redirect_uri', mpCallbackUrl())

  return json({ url: url.toString() })
})
