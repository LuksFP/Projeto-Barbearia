import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Cliente com service role — só usar em Edge Functions server-side
// NUNCA expor SUPABASE_SERVICE_ROLE_KEY no frontend
export function createAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  })
}

export function err(message: string, status = 400) {
  return json({ error: message }, status)
}

// Gate para endpoints de IA: valida plano (Pro/Premium) + rate limit por hora,
// via RPC ai_gate (SECURITY DEFINER). Usa o JWT do usuário para resolver auth.uid().
export async function aiGate(
  req: Request,
  fn: string,
  limit: number,
): Promise<{ ok: boolean; status: number; message: string }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return { ok: false, status: 401, message: 'Não autorizado' }

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  )

  const { data, error } = await supa.rpc('ai_gate', { p_fn: fn, p_limit: limit })
  if (error) {
    console.error('ai_gate error', error)
    return { ok: false, status: 500, message: 'Falha na verificação de acesso' }
  }

  switch (data) {
    case 'ok':   return { ok: true,  status: 200, message: 'ok' }
    case 'plan': return { ok: false, status: 403, message: 'Recurso exclusivo dos planos Pro e Premium' }
    case 'rate': return { ok: false, status: 429, message: 'Muitas solicitações. Tente novamente em instantes.' }
    default:     return { ok: false, status: 401, message: 'Não autorizado' }
  }
}
