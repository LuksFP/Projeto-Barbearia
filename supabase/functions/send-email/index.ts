// Edge Function: send-email
// Email transacional via Resend.
// Chamada internamente por outras functions (não exposta diretamente ao cliente).
//
// Requer secrets no Supabase:
//   RESEND_API_KEY
//   EMAIL_FROM   ex: "BarberOS <noreply@barberos.io>"

import { corsHeaders, json, err } from '../_shared/supabase-admin.ts'

interface EmailPayload {
  to: string
  subject: string
  html: string
}

const FROM = Deno.env.get('EMAIL_FROM') ?? 'BarberOS <noreply@barberos.io>'

async function sendEmail(payload: EmailPayload): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend error ${res.status}: ${body}`)
  }
}

// ── Templates ─────────────────────────────────────────────────────────────────

function templateWelcome(ownerName: string, plan: string): string {
  const planLabel: Record<string, string> = { basic: 'Básico', pro: 'Pro', premium: 'Premium' }
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#0a0a0a;color:#fff;padding:40px 32px;border-radius:12px">
      <h1 style="font-size:28px;letter-spacing:.1em;color:#f59e0b;margin-bottom:8px">BARBEROS</h1>
      <p style="color:#ffffff99;font-size:12px;margin-bottom:32px">Plataforma de gestão para barbearias</p>
      <h2 style="font-size:20px;margin-bottom:12px">Bem-vindo, ${ownerName}!</h2>
      <p style="color:#ffffff99;line-height:1.6">
        Seu plano <strong style="color:#f59e0b">${planLabel[plan] ?? plan}</strong> está ativo.
        Acesse o painel para configurar sua barbearia.
      </p>
      <a href="https://barberos.io/dashboard"
         style="display:inline-block;margin-top:24px;padding:12px 24px;background:#f59e0b;color:#0a0a0a;border-radius:8px;font-weight:600;text-decoration:none">
        Acessar o painel →
      </a>
      <p style="color:#ffffff33;font-size:11px;margin-top:32px">
        Dúvidas? Responda este email ou fale via WhatsApp.
      </p>
    </div>
  `
}

function templatePaymentFailed(ownerName: string): string {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#0a0a0a;color:#fff;padding:40px 32px;border-radius:12px">
      <h1 style="font-size:28px;letter-spacing:.1em;color:#f59e0b;margin-bottom:32px">BARBEROS</h1>
      <h2 style="font-size:20px;margin-bottom:12px;color:#f87171">Problema no pagamento</h2>
      <p style="color:#ffffff99;line-height:1.6">
        Olá ${ownerName}, não conseguimos processar o pagamento da sua assinatura.
        Por favor, atualize seu método de pagamento para continuar usando o BarberOS.
      </p>
      <a href="https://barberos.io/dashboard/configuracoes"
         style="display:inline-block;margin-top:24px;padding:12px 24px;background:#f87171;color:#fff;border-radius:8px;font-weight:600;text-decoration:none">
        Atualizar pagamento →
      </a>
    </div>
  `
}

function templateCancellation(ownerName: string): string {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#0a0a0a;color:#fff;padding:40px 32px;border-radius:12px">
      <h1 style="font-size:28px;letter-spacing:.1em;color:#f59e0b;margin-bottom:32px">BARBEROS</h1>
      <h2 style="font-size:20px;margin-bottom:12px">Assinatura cancelada</h2>
      <p style="color:#ffffff99;line-height:1.6">
        Olá ${ownerName}, sua assinatura foi cancelada. Você pode reativar a qualquer momento.
        Seus dados ficam guardados por 30 dias.
      </p>
      <a href="https://barberos.io/planos"
         style="display:inline-block;margin-top:24px;padding:12px 24px;background:#f59e0b;color:#0a0a0a;border-radius:8px;font-weight:600;text-decoration:none">
        Reativar assinatura →
      </a>
    </div>
  `
}

function templateBookingConfirmation(opts: {
  clientName: string
  barbershopName: string
  serviceName: string
  barberName: string
  date: string
  time: string
  barbershopSlug: string
}): string {
  const dateFormatted = new Date(opts.date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#0a0a0a;color:#fff;padding:40px 32px;border-radius:12px">
      <h1 style="font-size:24px;letter-spacing:.08em;color:#f59e0b;margin-bottom:8px">${opts.barbershopName}</h1>
      <p style="color:#ffffff55;font-size:12px;margin-bottom:32px">Confirmação de agendamento</p>
      <h2 style="font-size:20px;margin-bottom:12px">Tudo certo, ${opts.clientName}!</h2>
      <p style="color:#ffffff99;line-height:1.6;margin-bottom:24px">
        Seu horário foi confirmado. Veja os detalhes abaixo:
      </p>
      <div style="background:#161616;border-radius:10px;padding:20px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="color:#ffffff55;font-size:12px;padding:6px 0;width:40%">Serviço</td>
            <td style="color:#fff;font-size:14px;padding:6px 0">${opts.serviceName}</td>
          </tr>
          <tr>
            <td style="color:#ffffff55;font-size:12px;padding:6px 0">Profissional</td>
            <td style="color:#fff;font-size:14px;padding:6px 0">${opts.barberName}</td>
          </tr>
          <tr>
            <td style="color:#ffffff55;font-size:12px;padding:6px 0">Data</td>
            <td style="color:#f59e0b;font-size:14px;font-weight:600;padding:6px 0">${dateFormatted}</td>
          </tr>
          <tr>
            <td style="color:#ffffff55;font-size:12px;padding:6px 0">Horário</td>
            <td style="color:#f59e0b;font-size:14px;font-weight:600;padding:6px 0">${opts.time}</td>
          </tr>
        </table>
      </div>
      <p style="color:#ffffff55;font-size:12px;line-height:1.6">
        Precisa cancelar ou remarcar? Entre em contato com a barbearia diretamente.
      </p>
      <p style="color:#ffffff33;font-size:11px;margin-top:32px">
        Agendamento realizado via BarberOS.
      </p>
    </div>
  `
}

function templateNewBookingOwner(opts: {
  ownerName: string
  clientName: string
  clientPhone: string
  clientEmail: string
  barbershopName: string
  serviceName: string
  barberName: string
  date: string
  time: string
}): string {
  const dateFormatted = new Date(opts.date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:auto;background:#0a0a0a;color:#fff;padding:40px 32px;border-radius:12px">
      <h1 style="font-size:24px;letter-spacing:.08em;color:#f59e0b;margin-bottom:8px">${opts.barbershopName}</h1>
      <p style="color:#ffffff55;font-size:12px;margin-bottom:32px">Novo agendamento recebido</p>
      <h2 style="font-size:18px;margin-bottom:4px">Olá, ${opts.ownerName}!</h2>
      <p style="color:#ffffff99;line-height:1.6;margin-bottom:24px">
        Você tem um novo agendamento. Veja os detalhes abaixo:
      </p>
      <div style="background:#161616;border-radius:10px;padding:20px;margin-bottom:24px">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="color:#ffffff55;font-size:12px;padding:6px 0;width:40%">Cliente</td>
            <td style="color:#fff;font-size:14px;font-weight:600;padding:6px 0">${opts.clientName}</td>
          </tr>
          <tr>
            <td style="color:#ffffff55;font-size:12px;padding:6px 0">Telefone</td>
            <td style="color:#fff;font-size:14px;padding:6px 0">${opts.clientPhone}</td>
          </tr>
          ${opts.clientEmail ? `
          <tr>
            <td style="color:#ffffff55;font-size:12px;padding:6px 0">Email</td>
            <td style="color:#fff;font-size:14px;padding:6px 0">${opts.clientEmail}</td>
          </tr>` : ''}
          <tr><td colspan="2" style="padding:8px 0;border-top:1px solid #2a2a2a"></td></tr>
          <tr>
            <td style="color:#ffffff55;font-size:12px;padding:6px 0">Serviço</td>
            <td style="color:#fff;font-size:14px;padding:6px 0">${opts.serviceName}</td>
          </tr>
          <tr>
            <td style="color:#ffffff55;font-size:12px;padding:6px 0">Profissional</td>
            <td style="color:#fff;font-size:14px;padding:6px 0">${opts.barberName}</td>
          </tr>
          <tr>
            <td style="color:#ffffff55;font-size:12px;padding:6px 0">Data</td>
            <td style="color:#f59e0b;font-size:14px;font-weight:600;padding:6px 0">${dateFormatted}</td>
          </tr>
          <tr>
            <td style="color:#ffffff55;font-size:12px;padding:6px 0">Horário</td>
            <td style="color:#f59e0b;font-size:14px;font-weight:600;padding:6px 0">${opts.time}</td>
          </tr>
        </table>
      </div>
      <a href="https://barberos.io/dashboard/agenda"
         style="display:inline-block;padding:12px 24px;background:#f59e0b;color:#0a0a0a;border-radius:8px;font-weight:600;text-decoration:none">
        Ver na agenda →
      </a>
    </div>
  `
}

// ── Handler ───────────────────────────────────────────────────────────────────

type EmailType = 'welcome' | 'payment_failed' | 'cancellation' | 'booking_confirmation' | 'new_booking_owner'

interface SendEmailBody {
  type: EmailType
  to: string
  ownerName?: string
  plan?: string
  // booking_confirmation fields
  clientName?: string
  clientPhone?: string
  clientEmail?: string
  barbershopName?: string
  serviceName?: string
  barberName?: string
  date?: string
  time?: string
  barbershopSlug?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })

  let body: SendEmailBody
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON')
  }

  const { type, to } = body
  if (!to || !type) return err('to and type required')

  let subject = ''
  let html = ''

  if (type === 'welcome') {
    const ownerName = body.ownerName ?? ''
    subject = `Bem-vindo ao BarberOS, ${ownerName}!`
    html = templateWelcome(ownerName, body.plan ?? '')
  } else if (type === 'payment_failed') {
    const ownerName = body.ownerName ?? ''
    subject = 'Problema no pagamento — BarberOS'
    html = templatePaymentFailed(ownerName)
  } else if (type === 'cancellation') {
    const ownerName = body.ownerName ?? ''
    subject = 'Assinatura cancelada — BarberOS'
    html = templateCancellation(ownerName)
  } else if (type === 'booking_confirmation') {
    const { clientName = '', barbershopName = '', serviceName = '', barberName = '', date = '', time = '', barbershopSlug = '' } = body
    if (!clientName || !barbershopName || !date || !time) return err('Missing booking fields')
    subject = `Agendamento confirmado — ${barbershopName}`
    html = templateBookingConfirmation({ clientName, barbershopName, serviceName, barberName, date, time, barbershopSlug })
  } else if (type === 'new_booking_owner') {
    const { ownerName = '', clientName = '', clientPhone = '', clientEmail = '', barbershopName = '', serviceName = '', barberName = '', date = '', time = '' } = body
    subject = `Novo agendamento — ${clientName}`
    html = templateNewBookingOwner({ ownerName, clientName, clientPhone, clientEmail, barbershopName, serviceName, barberName, date, time })
  } else {
    return err(`Unknown email type: ${type}`)
  }

  try {
    await sendEmail({ to, subject, html })
    return json({ sent: true })
  } catch (e) {
    console.error('send-email error:', e)
    return err('Failed to send email', 500)
  }
})
