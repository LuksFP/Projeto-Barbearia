// Edge Function: create-payment (sem JWT — quem chama é o cliente no site da
// barbearia, logo depois de agendar e/ou reservar produto).
// Cria o checkout do Mercado Pago na conta da barbearia, com a taxa da
// plataforma como marketplace_fee, e devolve a URL pra onde o site redireciona.
//
// Body: { phone, appointmentId?, orderId? }  (pelo menos um dos dois)
//   appointmentId → cobra o corte (preço que o banco calculou no agendamento)
//   orderId       → cobra os produtos reservados (preço de product_sales)
//   os dois       → um checkout só: corte + "Leve junto no dia"
// O telefone tem que ser o do agendamento/pedido — o id sozinho não basta.
// Nenhum preço vem do navegador.

import { createAdminClient, corsHeaders, json, err } from '../_shared/supabase-admin.ts'
import { appUrl, MpError, mpFetch, platformFee, sellerAccount, UUID_RE } from '../_shared/mp.ts'

const ORDER_MAX_AGE_MS = 2 * 60 * 60_000   // pedido avulso de até 2h atrás
const CHECKOUT_TTL_MS = 30 * 60_000        // link do checkout vale 30 min

interface Line { product_id: string; product_name: string; quantity: number; unit_price: number; total: number; status: string; client_phone: string; client_name: string; created_at: string; barbershop_id: string; appointment_id: string | null }
interface Appt { id: string; barbershop_id: string; client_phone: string; client_name: string; service_name: string; price: number | null; date: string; time: string; status: string }
interface MpItem { id: string; title: string; quantity: number; unit_price: number; currency_id: 'BRL' }

const digits = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() })
  if (req.method !== 'POST') return err('Método não permitido', 405)

  let orderId: string | null = null
  let appointmentId: string | null = null
  let phone = ''
  try {
    const body: unknown = await req.json()
    if (body && typeof body === 'object') {
      const b = body as Record<string, unknown>
      orderId = typeof b.orderId === 'string' && b.orderId ? b.orderId : null
      appointmentId = typeof b.appointmentId === 'string' && b.appointmentId ? b.appointmentId : null
      phone = typeof b.phone === 'string' ? digits(b.phone) : ''
    }
  } catch { /* cai nos checks */ }
  if (!orderId && !appointmentId) return err('Nada pra pagar')
  if ((orderId && !UUID_RE.test(orderId)) || (appointmentId && !UUID_RE.test(appointmentId)) || !/^[0-9]{10,13}$/.test(phone)) {
    return err('Pagamento inválido')
  }

  const admin = createAdminClient()
  const items: MpItem[] = []
  let barbershopId = ''
  let payerName = ''

  // ── Horário ──────────────────────────────────────────────────────────────
  if (appointmentId) {
    const { data: a, error } = await admin
      .from('appointments')
      .select('id, barbershop_id, client_phone, client_name, service_name, price, date, time, status')
      .eq('id', appointmentId)
      .maybeSingle<Appt>()
    if (error) { console.error(error); return err('Falha ao ler o agendamento', 500) }
    if (!a || digits(a.client_phone) !== phone) return err('Agendamento não encontrado', 404)
    if (a.status !== 'pending' && a.status !== 'confirmed') return err('Esse horário não está mais aberto pra pagamento', 409)
    // Horário de Brasília (sem horário de verão desde 2019)
    if (new Date(`${a.date}T${a.time.slice(0, 5)}:00-03:00`).getTime() < Date.now()) {
      return err('Esse horário já passou. Pague na barbearia.', 409)
    }
    const price = Number(a.price ?? 0)
    if (price > 0) {
      items.push({ id: `corte-${a.id}`, title: a.service_name.slice(0, 250) || 'Atendimento', quantity: 1, unit_price: price, currency_id: 'BRL' })
    }
    barbershopId = a.barbershop_id
    payerName = a.client_name
  }

  // ── Produtos ─────────────────────────────────────────────────────────────
  if (orderId) {
    const { data: lines, error } = await admin
      .from('product_sales')
      .select('product_id, product_name, quantity, unit_price, total, status, client_phone, client_name, created_at, barbershop_id, appointment_id')
      .eq('order_id', orderId)
      .returns<Line[]>()
    if (error) { console.error(error); return err('Falha ao ler o pedido', 500) }
    if (!lines?.length || lines[0].client_phone !== phone) return err('Pedido não encontrado', 404)
    if (barbershopId && lines[0].barbershop_id !== barbershopId) return err('Pedido não encontrado', 404)
    if (appointmentId && lines[0].appointment_id && lines[0].appointment_id !== appointmentId) return err('Pedido não encontrado', 404)
    if (lines.some(l => l.status !== 'reservado')) return err('Esse pedido não está mais aberto pra pagamento', 409)
    // Pedido avulso vence em 2h; o do "Leve junto" acompanha o horário
    if (!lines[0].appointment_id && Date.now() - new Date(lines[0].created_at).getTime() > ORDER_MAX_AGE_MS) {
      return err('Esse pedido é antigo demais pra pagar online. Pague na retirada.', 409)
    }
    for (const l of lines) {
      items.push({ id: l.product_id, title: l.product_name.slice(0, 250), quantity: l.quantity, unit_price: Number(l.unit_price), currency_id: 'BRL' })
    }
    barbershopId = lines[0].barbershop_id
    payerName ||= lines[0].client_name
  }

  if (!items.length) return err('Nada pra pagar: o valor desse horário fica pra barbearia combinar', 409)

  // ── Pagamento já existente (tentar de novo reaproveita a linha) ──────────
  const filters = [appointmentId && `appointment_id.eq.${appointmentId}`, orderId && `order_id.eq.${orderId}`].filter(Boolean).join(',')
  const { data: existing, error: exErr } = await admin
    .from('online_payments').select('id, status, appointment_id, order_id').or(filters)
  if (exErr) { console.error(exErr); return err('Falha ao ler pagamentos', 500) }
  if (existing?.some(p => p.status === 'pago')) return err('Já está pago', 409)
  if (existing?.some(p => p.status === 'estornado')) return err('Esse pagamento foi estornado', 409)
  // Se horário e pedido já tinham linhas separadas, junta na do horário e apaga a outra
  const reuse = existing?.find(p => p.appointment_id === appointmentId && appointmentId) ?? existing?.[0] ?? null
  const extra = (existing ?? []).filter(p => p.id !== reuse?.id).map(p => p.id)
  const paymentId = reuse?.id ?? crypto.randomUUID()

  const { data: shop } = await admin
    .from('barbershops').select('slug, name, active').eq('id', barbershopId).maybeSingle()
  if (!shop?.active) return err('Barbearia indisponível', 409)

  let seller
  try {
    seller = await sellerAccount(admin, barbershopId)
  } catch (e: unknown) {
    console.error('sellerAccount', e instanceof MpError ? { status: e.status, body: e.body } : e)
    return err('Pagamento online indisponível agora. Pague na barbearia.', 503)
  }
  if (!seller?.enabled) return err('Essa barbearia não recebe pagamento online', 409)

  const amount = Math.round(items.reduce((a, i) => a + i.unit_price * i.quantity, 0) * 100) / 100
  const fee = platformFee(amount)
  const backPage = `${appUrl()}/b/${shop.slug}/pagamento/${paymentId}`
  const notify = `${Deno.env.get('SUPABASE_URL')}/functions/v1/mp-webhook?bs=${barbershopId}`

  let pref: { id: string; init_point: string }
  try {
    pref = await mpFetch<{ id: string; init_point: string }>('/checkout/preferences', seller.token, {
      method: 'POST',
      headers: { 'X-Idempotency-Key': `${paymentId}-${Date.now()}` },
      body: JSON.stringify({
        items,
        marketplace_fee: fee,
        external_reference: paymentId,
        notification_url: notify,
        back_urls: { success: backPage, pending: backPage, failure: backPage },
        auto_return: 'approved',
        statement_descriptor: String(shop.name).replace(/[^A-Za-z0-9 ]/g, '').slice(0, 22) || undefined,
        payer: { name: payerName },
        expires: true,
        expiration_date_to: new Date(Date.now() + CHECKOUT_TTL_MS).toISOString(),
        // Boleto leva dias pra compensar: não serve pra horário nem reserva
        payment_methods: { excluded_payment_types: [{ id: 'ticket' }], installments: 3 },
      }),
    })
  } catch (e: unknown) {
    console.error('preference', e instanceof MpError ? { status: e.status, body: e.body } : e)
    return err('Não deu pra abrir o pagamento agora. Pague na barbearia.', 502)
  }

  if (extra.length) await admin.from('online_payments').delete().in('id', extra).neq('status', 'pago')
  const { error: upErr } = await admin.from('online_payments').upsert({
    id: paymentId,
    barbershop_id: barbershopId,
    appointment_id: appointmentId,
    order_id: orderId,
    status: 'pendente',
    amount,
    platform_fee: fee,
    mp_preference_id: pref.id,
    updated_at: new Date().toISOString(),
  })
  if (upErr) { console.error(upErr); return err('Falha ao registrar o pagamento', 500) }

  return json({ url: pref.init_point, paymentId })
})
