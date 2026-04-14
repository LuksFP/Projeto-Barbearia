// Edge Function: auth-login
// Login via Supabase Auth com rate limiting nativo.
// verify_jwt = false — o usuário ainda não tem token ao fazer login.
//
// Retorna { access_token, refresh_token } em caso de sucesso.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, json, err } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })
  if (req.method !== 'POST') return err('Method not allowed', 405)

  let body: { email: string; password: string }
  try {
    body = await req.json()
  } catch {
    return err('JSON inválido')
  }

  const { email, password } = body
  if (!email || !password) return err('email e password são obrigatórios')

  // Cliente com anon key — signInWithPassword é seguro com anon key
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { auth: { persistSession: false } }
  )

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Status 429 = rate limit do Supabase Auth
    if (error.status === 429) {
      return err('Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.', 429)
    }
    // Credencial inválida ou email não confirmado
    return err(error.message, 401)
  }

  return json({
    access_token:  data.session.access_token,
    refresh_token: data.session.refresh_token,
  })
})
