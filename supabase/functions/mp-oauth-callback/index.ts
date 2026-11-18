// Edge Function: mp-oauth-callback (GET, sem JWT — quem chega é o navegador
// voltando do Mercado Pago). Troca o code pelos tokens da conta da barbearia,
// guarda cifrado em mp_accounts e manda de volta pra Configurações.
//
// O state assinado (mp-oauth-start) diz qual barbearia e quem pediu; sem ele
// válido nada é gravado.

import { createAdminClient } from '../_shared/supabase-admin.ts'
import { appUrl, exchangeToken, MpError, mpCallbackUrl, readState, saveTokens } from '../_shared/mp.ts'

const back = (result: string) =>
  Response.redirect(`${appUrl()}/dashboard/configuracoes?mp=${result}#vendas`, 302)

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state') ?? ''

  // Dono negou no MP (ou fechou): volta sem gravar nada
  if (!code) return back('cancelado')

  const st = await readState(state)
  if (!st) return back('expirado')

  try {
    const tokens = await exchangeToken({
      grant_type: 'authorization_code',
      code,
      redirect_uri: mpCallbackUrl(),
    })
    await saveTokens(createAdminClient(), st.b, tokens, st.u)
    return back('ok')
  } catch (e: unknown) {
    console.error('mp-oauth-callback', e instanceof MpError ? { status: e.status, body: e.body } : e)
    return back('erro')
  }
})
