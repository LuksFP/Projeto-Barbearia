// Edge Function: update-password
// Atualiza a senha do usuário autenticado usando o admin client.
// Mais confiável que supabase.auth.updateUser no cliente, que pode travar
// no auto-refresh do token de recovery.
//
// verify_jwt = true — o Supabase verifica o Bearer token antes de chamar a função.

import { createAdminClient, corsHeaders, json, err } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })
  if (req.method !== 'POST') return err('Method not allowed', 405)

  // O Supabase já validou o JWT — extrai o user_id do header injetado
  const userId = req.headers.get('x-user-id') // preenchido pelo verify_jwt automático? Não.
  // Na verdade, precisamos decodificar o JWT manualmente aqui.
  // Usamos o admin client para verificar o token.

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return err('Missing Authorization header', 401)

  const token = authHeader.replace('Bearer ', '')

  // Valida o token e obtém o user_id
  const admin = createAdminClient()
  const { data: { user }, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !user) return err('Token inválido ou expirado', 401)

  // Lê a nova senha do body
  let body: { password: string }
  try {
    body = await req.json()
  } catch {
    return err('JSON inválido')
  }

  const { password } = body
  if (!password || password.length < 8) return err('Senha inválida')

  // Atualiza via admin — ignora o tipo de sessão (recovery, regular, etc.)
  const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, { password })
  if (updateErr) {
    console.error('update-password error:', updateErr)
    return err('Não foi possível atualizar a senha', 500)
  }

  return json({ success: true })
})
