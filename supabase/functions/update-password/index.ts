// Edge Function: update-password
// Atualiza a senha do usuário usando o admin client (mais confiável que
// supabase.auth.updateUser no cliente, que pode travar no refresh do token de recovery).
//
// Só aceita troca sem senha atual quando a sessão veio de um link de
// redefinição (amr recovery/otp). Numa sessão normal exige a senha atual —
// senão uma sessão roubada vira troca de senha e perda da conta.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createAdminClient, corsHeaders, json, err } from '../_shared/supabase-admin.ts'

const RECOVERY_METHODS = new Set(['recovery', 'otp', 'magiclink', 'invite'])

function amrMethods(jwt: string): string[] {
  try {
    const payload = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const claims = JSON.parse(atob(payload)) as { amr?: { method?: string }[] }
    return (claims.amr ?? []).map(a => a.method ?? '')
  } catch {
    return []
  }
}

function isStrongPassword(p: string): boolean {
  return p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })
  if (req.method !== 'POST') return err('Method not allowed', 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return err('Missing Authorization header', 401)
  const token = authHeader.replace('Bearer ', '')

  // Valida o token e obtém o usuário
  const admin = createAdminClient()
  const { data: { user }, error: authErr } = await admin.auth.getUser(token)
  if (authErr || !user) return err('Token inválido ou expirado', 401)

  let body: { password?: string; currentPassword?: string }
  try {
    body = await req.json()
  } catch {
    return err('JSON inválido')
  }

  const { password, currentPassword } = body
  if (!password || !isStrongPassword(password)) {
    return err('A senha precisa de 8+ caracteres, maiúscula, número e caractere especial.')
  }

  const fromRecoveryLink = amrMethods(token).some(m => RECOVERY_METHODS.has(m))
  if (!fromRecoveryLink) {
    if (!currentPassword || !user.email) {
      return err('Para trocar a senha, use o link de redefinição enviado por email.', 403)
    }
    const anon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { auth: { persistSession: false } },
    )
    const { error: pwErr } = await anon.auth.signInWithPassword({ email: user.email, password: currentPassword })
    if (pwErr) return err('Senha atual incorreta.', 403)
  }

  const { error: updateErr } = await admin.auth.admin.updateUserById(user.id, { password })
  if (updateErr) {
    console.error('update-password error:', updateErr)
    return err('Não foi possível atualizar a senha', 500)
  }

  return json({ success: true })
})
