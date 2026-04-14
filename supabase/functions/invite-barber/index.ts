// Edge Function: invite-barber
// Cria um convite para barbeiro e envia email com link de aceitação.
//
// Requer secrets no Supabase:
//   RESEND_API_KEY
//   EMAIL_FROM
//   APP_URL  ex: https://barberos.io

import { createAdminClient, corsHeaders, json, err } from '../_shared/supabase-admin.ts'

const APP_URL = Deno.env.get('APP_URL') ?? 'https://barberos.io'
const FROM = Deno.env.get('EMAIL_FROM') ?? 'BarberOS <noreply@barberos.io>'

async function sendInviteEmail(opts: {
  to: string
  name: string
  barbershopName: string
  role: string
  token: string
}): Promise<void> {
  const roleLabel: Record<string, string> = {
    barber: 'Barbeiro',
    receptionist: 'Recepcionista',
    admin: 'Administrador',
  }

  const link = `${APP_URL}/aceitar-convite?token=${opts.token}&email=${encodeURIComponent(opts.to)}&name=${encodeURIComponent(opts.name)}&barbershop=${encodeURIComponent(opts.barbershopName)}`

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#0a0a0a;color:#fff;padding:40px 32px;border-radius:12px">
      <h1 style="font-size:28px;letter-spacing:.1em;color:#f59e0b;margin-bottom:8px">BARBEROS</h1>
      <p style="color:#ffffff99;font-size:12px;margin-bottom:32px">Plataforma de gestão para barbearias</p>
      <h2 style="font-size:20px;margin-bottom:12px">Você foi convidado, ${opts.name}!</h2>
      <p style="color:#ffffff99;line-height:1.6">
        Você recebeu um convite para entrar na equipe da
        <strong style="color:#fff"> ${opts.barbershopName}</strong>
        como <strong style="color:#f59e0b">${roleLabel[opts.role] ?? opts.role}</strong>.
      </p>
      <p style="color:#ffffff99;line-height:1.6;margin-top:12px">
        Clique no botão abaixo para criar sua conta e aceitar o convite.
        O link expira em <strong style="color:#fff">7 dias</strong>.
      </p>
      <a href="${link}"
         style="display:inline-block;margin-top:24px;padding:14px 28px;background:#f59e0b;color:#0a0a0a;border-radius:8px;font-weight:700;text-decoration:none;font-size:15px">
        Aceitar convite →
      </a>
      <p style="color:#ffffff33;font-size:11px;margin-top:32px">
        Se você não esperava este convite, ignore este email.
      </p>
    </div>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [opts.to],
      subject: `Convite para ${opts.barbershopName} — BarberOS`,
      html,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend error ${res.status}: ${body}`)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  // ── Autenticação ──────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return err('Missing Authorization header', 401)

  const supabase = createAdminClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (authErr || !user) return err('Unauthorized', 401)

  // ── Body ──────────────────────────────────────────────────────────────────
  let body: {
    barbershopId: string
    email: string
    name: string
    specialty: string
    bio?: string
    role?: string
  }
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON body')
  }

  const { barbershopId, email, name, specialty, bio = '', role = 'barber' } = body
  if (!barbershopId || !email || !name || !specialty) {
    return err('barbershopId, email, name and specialty are required')
  }

  // Valida email básico
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('Email inválido')

  // ── Verifica que o usuário é owner/admin da barbearia ─────────────────────
  const { data: member } = await supabase
    .from('barbershop_members')
    .select('role')
    .eq('barbershop_id', barbershopId)
    .eq('user_id', user.id)
    .eq('active', true)
    .maybeSingle()

  // Também pode ser o saas_account owner
  const { data: account } = await supabase
    .from('saas_accounts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  const isSaasOwner = !!account
  const isAdmin = member?.role === 'owner' || member?.role === 'admin'

  if (!isSaasOwner && !isAdmin) return err('Permissão negada', 403)

  // ── Busca nome da barbearia ───────────────────────────────────────────────
  const { data: barbershop } = await supabase
    .from('barbershops')
    .select('name')
    .eq('id', barbershopId)
    .maybeSingle()

  if (!barbershop) return err('Barbearia não encontrada', 404)

  // ── Cria convite (upsert por email+barbershop se já existir pendente) ─────
  const { data: invite, error: inviteErr } = await supabase
    .from('barbershop_invites')
    .upsert({
      barbershop_id: barbershopId,
      email,
      name,
      specialty,
      bio,
      role,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }, {
      onConflict: 'barbershop_id,email',
      ignoreDuplicates: false,
    })
    .select('token')
    .single()

  if (inviteErr || !invite) {
    console.error('invite upsert error:', inviteErr)
    return err('Erro ao criar convite. Tente novamente.', 500)
  }

  // ── Envia email ───────────────────────────────────────────────────────────
  try {
    await sendInviteEmail({
      to: email,
      name,
      barbershopName: barbershop.name as string,
      role,
      token: invite.token as string,
    })
  } catch (e) {
    console.error('Failed to send invite email:', e)
    // Não bloqueia o fluxo — convite criado mesmo sem email
    return json({ invited: true, emailSent: false })
  }

  return json({ invited: true, emailSent: true })
})
