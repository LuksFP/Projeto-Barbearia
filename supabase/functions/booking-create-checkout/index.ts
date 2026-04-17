// Edge Function: booking-create-checkout
// Cria o agendamento público e redireciona o cliente para o Stripe Checkout.
//
// Requer secrets no Supabase:
//   STRIPE_SECRET_KEY

import Stripe from 'https://esm.sh/stripe@14.25.0?target=deno'
import { createAdminClient, corsHeaders, json, err } from '../_shared/supabase-admin.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
})

interface BookingCheckoutBody {
  barbershopSlug: string
  serviceId: string
  barberId?: string | null
  date: string
  time: string
  clientName: string
  clientPhone: string
  clientEmail?: string | null
  successUrl: string
  cancelUrl: string
}

function isAllowedUrl(url: string) {
  try {
    const origin = new URL(url).origin
    return (
      origin === 'https://barberos.io' ||
      origin.endsWith('.vercel.app') ||
      origin === 'http://localhost:5173' ||
      origin === 'http://localhost:4173'
    )
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  if (req.method !== 'POST') {
    return err('Method not allowed', 405)
  }

  let body: BookingCheckoutBody
  try {
    body = await req.json()
  } catch {
    return err('Invalid JSON body')
  }

  const {
    barbershopSlug,
    serviceId,
    barberId = null,
    date,
    time,
    clientName,
    clientPhone,
    clientEmail = null,
    successUrl,
    cancelUrl,
  } = body

  if (!barbershopSlug || !serviceId || !date || !time || !clientName || !clientPhone || !successUrl || !cancelUrl) {
    return err('Missing required fields', 400)
  }

  if (!isAllowedUrl(successUrl) || !isAllowedUrl(cancelUrl)) {
    return err('URL de redirecionamento inválida', 400)
  }

  const supabase = createAdminClient()

  const { data: barbershop, error: barbershopErr } = await supabase
    .from('barbershops')
    .select('id, name, slug, active')
    .eq('slug', barbershopSlug)
    .maybeSingle()

  if (barbershopErr || !barbershop || !barbershop.active) {
    return err('Barbearia não encontrada ou inativa', 404)
  }

  const { data: service, error: serviceErr } = await supabase
    .from('services')
    .select('id, name, description, price, category, duration_min, active')
    .eq('id', serviceId)
    .eq('barbershop_id', barbershop.id)
    .maybeSingle()

  if (serviceErr || !service || !service.active) {
    return err('Serviço não encontrado ou inativo', 404)
  }

  let barberName = 'A definir'
  if (barberId) {
    const { data: barber } = await supabase
      .from('barbershop_members')
      .select('id, name, active')
      .eq('id', barberId)
      .eq('barbershop_id', barbershop.id)
      .maybeSingle()

    if (barber && barber.active) {
      barberName = barber.name
    }
  }

  const { data: appointment, error: appointmentErr } = await supabase
    .from('appointments')
    .insert({
      barbershop_id: barbershop.id,
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
      payment_status: 'pending',
      payment_method: 'stripe',
    })
    .select('id')
    .single()

  if (appointmentErr || !appointment) {
    console.error('booking insert error:', appointmentErr)
    return err('Não foi possível criar o agendamento', 500)
  }

  try {
    const amount = Math.round(Number(service.price) * 100)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      locale: 'pt-BR',
      billing_address_collection: 'auto',
      automatic_payment_methods: { enabled: true },
      client_reference_id: appointment.id,
      metadata: {
        appointment_id: appointment.id,
        barbershop_id: barbershop.id,
        barbershop_name: barbershop.name,
        barbershop_slug: barbershop.slug,
        service_id: service.id,
        service_name: service.name,
        barber_name: barberName,
        date,
        time,
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail ?? '',
      },
      payment_intent_data: {
        metadata: {
          appointment_id: appointment.id,
          barbershop_id: barbershop.id,
        },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'brl',
            unit_amount: amount,
            product_data: {
              name: `${service.name} - ${barbershop.name}`,
              description: service.description ?? undefined,
            },
          },
        },
      ],
    })

    if (!session.url) {
      throw new Error('Stripe não retornou URL de checkout')
    }

    const { error: updateErr } = await supabase
      .from('appointments')
      .update({
        stripe_checkout_session_id: session.id,
      })
      .eq('id', appointment.id)

    if (updateErr) {
      console.error('booking checkout update error:', updateErr)
    }

    return json({
      url: session.url,
      appointmentId: appointment.id,
    })
  } catch (error) {
    console.error('booking checkout error:', error)
    await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        payment_status: 'cancelled',
      })
      .eq('id', appointment.id)

    return err('Não foi possível criar o checkout', 500)
  }
})
