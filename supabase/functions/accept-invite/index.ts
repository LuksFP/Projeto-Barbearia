// Edge Function: accept-invite
// Valida o token de convite, cria o barbershop_member e marca o convite como aceito.
// Chamada pelo frontend após o usuário criar sua conta com supabase.auth.signUp().
//
// Requer: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (via Supabase secrets)

import { createAdminClient, corsHeaders, json, err } from '../_shared/supabase-admin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  // ── Autenticação — JWT do usuário recém-criado ────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return err('Missing Authorization header', 401)

  const supabase = createAdminClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (authErr || !user) return err('Unauthorized', 401)

  // ── Body ──────────────────────────────────────────────────────────────────
  let body: { token: string }
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON body')
  }

  const { token } = body
  if (!token) return err('token is required')

  // ── Busca o convite ───────────────────────────────────────────────────────
  const { data: invite, error: invErr } = await supabase
    .from('barbershop_invites')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (invErr || !invite) return err('Convite inválido ou expirado.', 404)

  if (invite.status !== 'pending') {
    return err('Este convite já foi utilizado ou cancelado.', 409)
  }

  if (new Date(invite.expires_at as string) < new Date()) {
    await supabase.from('barbershop_invites').update({ status: 'expired' }).eq('token', token)
    return err('Este convite expirou. Solicite um novo.', 410)
  }

  // Garante que o email do usuário bate com o do convite
  if (user.email?.toLowerCase() !== (invite.email as string).toLowerCase()) {
    return err('O email da conta não corresponde ao convite.', 403)
  }

  // ── Cria barbershop_member ────────────────────────────────────────────────
  const { error: memberErr } = await supabase
    .from('barbershop_members')
    .insert({
      barbershop_id: invite.barbershop_id as string,
      user_id: user.id,
      name: invite.name as string,
      specialty: invite.specialty as string,
      bio: (invite.bio as string) ?? '',
      role: (invite.role as string) ?? 'barber',
      active: true,
    })

  if (memberErr) {
    // Se já existe (unique constraint), não é erro fatal
    if (memberErr.code !== '23505') {
      console.error('member insert error:', memberErr)
      return err('Erro ao vincular conta à barbearia.', 500)
    }
  }

  // ── Marca convite como aceito ─────────────────────────────────────────────
  await supabase
    .from('barbershop_invites')
    .update({ status: 'accepted' })
    .eq('token', token)

  return json({ accepted: true, barbershopId: invite.barbershop_id })
})
