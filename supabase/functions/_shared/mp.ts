// Mercado Pago (modelo marketplace) — peças comuns das Edge Functions da loja.
//
// Secrets:
//   MP_CLIENT_ID, MP_CLIENT_SECRET — app da plataforma no painel de devs do MP
//   MP_TOKEN_KEY        — 32 bytes em base64 (openssl rand -base64 32); cifra os
//                         tokens das barbearias no banco (AES-GCM)
//   MP_WEBHOOK_SECRET   — opcional; "assinatura secreta" dos webhooks do app
//   MP_PLATFORM_FEE_PCT — opcional; taxa da plataforma em %, padrão 1.5
//   APP_URL             — já existe; volta do checkout e do OAuth

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MP_API = 'https://api.mercadopago.com'

export const mpCallbackUrl = () => `${Deno.env.get('SUPABASE_URL')}/functions/v1/mp-oauth-callback`
export const appUrl = () => (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '')

/** Taxa da plataforma sobre o total, em reais com 2 casas. */
export function platformFee(amount: number): number {
  const raw = Number(Deno.env.get('MP_PLATFORM_FEE_PCT') ?? '1.5')
  const pct = Number.isFinite(raw) && raw >= 0 && raw < 50 ? raw : 1.5
  return Math.round(amount * pct) / 100
}

// ── base64url ──────────────────────────────────────────────────────────────
const b64u = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const unb64u = (s: string) => {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  return Uint8Array.from(atob(pad), c => c.charCodeAt(0))
}

// ── Cifra dos tokens (AES-GCM, iv aleatório de 12 bytes na frente) ─────────
let keyPromise: Promise<CryptoKey> | null = null
function tokenKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    const raw = Deno.env.get('MP_TOKEN_KEY')
    if (!raw) throw new Error('MP_TOKEN_KEY ausente')
    const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0))
    if (bytes.length !== 32) throw new Error('MP_TOKEN_KEY precisa ter 32 bytes')
    keyPromise = crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt'])
  }
  return keyPromise
}

export async function seal(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await tokenKey(), new TextEncoder().encode(plain)))
  const out = new Uint8Array(iv.length + ct.length)
  out.set(iv)
  out.set(ct, iv.length)
  return b64u(out)
}

export async function unseal(sealed: string): Promise<string> {
  const all = unb64u(sealed)
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.slice(0, 12) }, await tokenKey(), all.slice(12))
  return new TextDecoder().decode(pt)
}

// ── HMAC (state do OAuth e assinatura do webhook) ──────────────────────────
async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)))
}

const hex = (b: Uint8Array) => [...b].map(x => x.toString(16).padStart(2, '0')).join('')

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export interface OAuthState { b: string; u: string; e: number }

/** state assinado: quem começou a conexão e pra qual barbearia (vale 15 min). */
export async function signState(barbershopId: string, userId: string): Promise<string> {
  const body = b64u(new TextEncoder().encode(JSON.stringify({ b: barbershopId, u: userId, e: Date.now() + 15 * 60_000 })))
  return `${body}.${b64u(await hmac(Deno.env.get('MP_CLIENT_SECRET')!, body))}`
}

export async function readState(state: string): Promise<OAuthState | null> {
  const [body, sig] = state.split('.')
  if (!body || !sig) return null
  const expected = b64u(await hmac(Deno.env.get('MP_CLIENT_SECRET')!, body))
  if (!safeEqual(sig, expected)) return null
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(unb64u(body)))
    if (!parsed || typeof parsed !== 'object') return null
    const { b, u, e } = parsed as Record<string, unknown>
    if (typeof b !== 'string' || typeof u !== 'string' || typeof e !== 'number' || e < Date.now()) return null
    return { b, u, e }
  } catch {
    return null
  }
}

/**
 * Assinatura x-signature do webhook: "ts=...,v1=..." sobre
 * "id:{data.id};request-id:{x-request-id};ts:{ts};". Sem MP_WEBHOOK_SECRET
 * configurado devolve null (não dá pra conferir) — o webhook não confia no
 * corpo de qualquer jeito: busca o pagamento na API do MP.
 */
export async function webhookSignatureOk(req: Request, dataId: string): Promise<boolean | null> {
  const secret = Deno.env.get('MP_WEBHOOK_SECRET')
  const header = req.headers.get('x-signature')
  if (!secret || !header) return null
  const parts = Object.fromEntries(header.split(',').map(p => p.trim().split('=') as [string, string]))
  if (!parts.ts || !parts.v1) return false
  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId
  const manifest = `id:${id};request-id:${req.headers.get('x-request-id') ?? ''};ts:${parts.ts};`
  return safeEqual(hex(await hmac(secret, manifest)), parts.v1)
}

// ── API ────────────────────────────────────────────────────────────────────
export class MpError extends Error {
  constructor(message: string, public status: number, public body: unknown) { super(message) }
}

export async function mpFetch<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${MP_API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  })
  const text = await res.text()
  let body: unknown = null
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  if (!res.ok) throw new MpError(`Mercado Pago ${res.status} em ${path}`, res.status, body)
  return body as T
}

export interface MpTokenResponse {
  access_token: string
  refresh_token: string
  public_key?: string
  user_id: number
  expires_in: number
}

export function exchangeToken(params: Record<string, string>): Promise<MpTokenResponse> {
  return mpFetch<MpTokenResponse>('/oauth/token', null, {
    method: 'POST',
    body: JSON.stringify({
      client_id: Deno.env.get('MP_CLIENT_ID'),
      client_secret: Deno.env.get('MP_CLIENT_SECRET'),
      ...params,
    }),
  })
}

export async function saveTokens(admin: SupabaseClient, barbershopId: string, t: MpTokenResponse, userId?: string) {
  const row: Record<string, unknown> = {
    barbershop_id: barbershopId,
    mp_user_id: t.user_id,
    access_token_enc: await seal(t.access_token),
    refresh_token_enc: await seal(t.refresh_token),
    public_key: t.public_key ?? null,
    expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }
  if (userId) { row.connected_by = userId; row.connected_at = new Date().toISOString() }
  const { error } = await admin.from('mp_accounts').upsert(row)
  if (error) throw error
}

export interface SellerAccount { token: string; mpUserId: number; enabled: boolean }

/**
 * Token da conta MP da barbearia, renovado se vencer em menos de 7 dias
 * (o token do MP dura 180 dias). null = barbearia não conectou.
 */
export async function sellerAccount(admin: SupabaseClient, barbershopId: string): Promise<SellerAccount | null> {
  const { data, error } = await admin
    .from('mp_accounts')
    .select('mp_user_id, access_token_enc, refresh_token_enc, expires_at, enabled')
    .eq('barbershop_id', barbershopId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null

  if (new Date(data.expires_at).getTime() - Date.now() < 7 * 86_400_000) {
    const fresh = await exchangeToken({ grant_type: 'refresh_token', refresh_token: await unseal(data.refresh_token_enc) })
    await saveTokens(admin, barbershopId, fresh)
    return { token: fresh.access_token, mpUserId: fresh.user_id, enabled: data.enabled }
  }
  return { token: await unseal(data.access_token_enc), mpUserId: Number(data.mp_user_id), enabled: data.enabled }
}

export interface MpPayment {
  id: number
  status: string               // approved, pending, in_process, rejected, cancelled, refunded, charged_back
  external_reference: string | null
  transaction_amount: number
  payment_type_id: string      // account_money, credit_card, debit_card, bank_transfer (Pix), ticket
  payment_method_id: string    // pix, visa, master…
  date_approved: string | null
  collector_id?: number
}

/** Rótulo curto do meio de pagamento pro painel. */
export function paymentMethodLabel(p: MpPayment): string {
  if (p.payment_method_id === 'pix') return 'pix'
  return p.payment_type_id
}

/**
 * Usuário logado que é dono/admin da barbearia. Usa o JWT dele pra rodar
 * my_admin_barbershop_ids() (mesma regra das policies do banco).
 */
export async function requireShopAdmin(req: Request, barbershopId: string): Promise<{ userId: string } | { error: string; status: number }> {
  const auth = req.headers.get('Authorization')
  if (!auth) return { error: 'Não autorizado', status: 401 }
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
  const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  })
  const { data: { user } } = await supa.auth.getUser(auth.replace('Bearer ', ''))
  if (!user) return { error: 'Não autorizado', status: 401 }
  const { data, error } = await supa.rpc('my_admin_barbershop_ids')
  if (error) return { error: 'Falha ao conferir permissão', status: 500 }
  const ids = (Array.isArray(data) ? data : []).map((r: unknown) =>
    typeof r === 'string' ? r : (r && typeof r === 'object' ? Object.values(r)[0] : null))
  if (!ids.includes(barbershopId)) return { error: 'Só o dono ou admin da barbearia', status: 403 }
  return { userId: user.id }
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
