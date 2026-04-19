// Edge Function: book-appointment
// Cria agendamento público + envia emails para cliente e dono da barbearia.
// verify_jwt = false — acesso público (cliente não tem conta).

import { createAdminClient, corsHeaders, json, err } from '../_shared/supabase-admin.ts'

interface BookBody {
  barbershopId: string
  serviceId: string
  barberId?: string | null
  date: string
  time: string
  clientName: string
  clientPhone: string
  clientEmail?: string | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })
  if (req.method !== 'POST') return err('Method not allowed', 405)

  let body: BookBody
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON', 400)
  }

  const { barbershopId, serviceId, barberId = null, date, time, clientName, clientPhone, clientEmail = null } = body

  if (!barbershopId || !serviceId || !date || !time || !clientName || !clientPhone) {
    return err('Missing required fields', 400)
  }

  const supabase = createAdminClient()

  // Busca barbearia + email do dono em paralelo com serviço
  const [{ data: barbershop }, { data: service }, { data: ownerInfo }] = await Promise.all([
    supabase.from('barbershops').select('id, name, slug, active').eq('id', barbershopId).maybeSingle(),
    supabase.from('services').select('id, name, description, price, category, active').eq('id', serviceId).eq('barbershop_id', barbershopId).maybeSingle(),
    supabase.from('saas_accounts').select('owner_name, user_id').eq('barbershop_id', barbershopId).maybeSingle(),
  ])

  if (!barbershop?.active) return err('Barbearia não encontrada ou inativa', 404)
  if (!service?.active)    return err('Serviço não encontrado ou inativo', 404)

  let barberName = 'A definir'
  if (barberId) {
    const { data: barber } = await supabase
      .from('barbershop_members')
      .select('name, active')
      .eq('id', barberId)
      .eq('barbershop_id', barbershopId)
      .maybeSingle()
    if (barber?.active) barberName = barber.name
  }

  // Cria o agendamento
  const { data: appointment, error: insertErr } = await supabase
    .from('appointments')
    .insert({
      barbershop_id: barbershopId,
      service_id: service.id,
      service_name: service.name,
      service_category: service.category,
      price: Number(service.price),
      barber_id: barberId,
      barber_name: barberName,
      date,
      time,
      client_name: clientName,
      client_phone: clientPhone,
      client_email: clientEmail,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertErr || !appointment) {
    console.error('book-appointment insert error:', insertErr)
    return err('Não foi possível criar o agendamento', 500)
  }

  // Emails em paralelo — falhas não bloqueiam a resposta
  const emailPromises: Promise<unknown>[] = []

  // Email de confirmação para o cliente
  if (clientEmail) {
    emailPromises.push(
      supabase.functions.invoke('send-email', {
        body: {
          type: 'booking_confirmation',
          to: clientEmail,
          clientName,
          barbershopName: barbershop.name,
          serviceName: service.name,
          barberName,
          date,
          time,
          barbershopSlug: barbershop.slug,
        },
      }).catch(e => console.error('booking_confirmation email failed:', e))
    )
  }

  // Notificação para o dono da barbearia
  if (ownerInfo) {
    const { data: authUser } = await supabase.auth.admin.getUserById(ownerInfo.user_id)
    const ownerEmail = authUser?.user?.email
    if (ownerEmail) {
      emailPromises.push(
        supabase.functions.invoke('send-email', {
          body: {
            type: 'new_booking_owner',
            to: ownerEmail,
            ownerName: ownerInfo.owner_name,
            clientName,
            clientPhone,
            clientEmail: clientEmail ?? '',
            barbershopName: barbershop.name,
            serviceName: service.name,
            barberName,
            date,
            time,
          },
        }).catch(e => console.error('new_booking_owner email failed:', e))
      )
    }
  }

  await Promise.allSettled(emailPromises)

  return json({ appointmentId: appointment.id })
})
