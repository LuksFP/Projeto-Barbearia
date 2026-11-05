// Web Push: inscreve ESTE aparelho pra receber "Novo agendamento!" mesmo com o
// navegador fechado. A inscrição (endpoint + chaves) vai pra tabela
// push_subscriptions; quem envia é a edge function push-new-booking.
//
// iPhone: só funciona com o BarberOS instalado na tela de início
// (Compartilhar → Adicionar à Tela de Início), iOS 16.4+. Regra da Apple.
import { supabase } from '@/lib/supabase'
import { notifyPermission, swRegistration } from '@/lib/bookingAlert'

// Chave PÚBLICA do par VAPID — pode ficar no código. A privada só existe nos
// secrets da edge function.
const VAPID_PUBLIC_KEY =
  'BFIODA31DQ0xgGGF1hNU70jKCwLOXAyeAtykxvY22TJVJFECDU2SDwUJpsXYzc9-xFxjucadV2ls5rhUJ7h9UM0'

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** iPhone/iPad fora do app instalado: o Safari não oferece push. */
export function needsInstallForPush(): boolean {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  return ios && !standalone
}

function keyBytes(base64url: string): Uint8Array {
  const pad = '='.repeat((4 - (base64url.length % 4)) % 4)
  const raw = atob((base64url + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

/** Liga o push neste aparelho. Precisa da permissão de notificação já concedida. */
export async function enablePush(barbershopId: string): Promise<boolean> {
  if (!pushSupported() || notifyPermission() !== 'granted') return false
  const reg = await swRegistration()
  if (!reg) return false

  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(VAPID_PUBLIC_KEY),
    }))

  const json = sub.toJSON()
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!json.endpoint || !p256dh || !auth) return false

  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) return false

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      barbershop_id: barbershopId,
      endpoint: json.endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent.slice(0, 200),
    },
    { onConflict: 'endpoint' },
  )
  if (error) {
    console.warn('push: não salvou a inscrição', error.message)
    return false
  }
  return true
}

/** Desliga o push neste aparelho (sino desligado). */
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return
  const reg = await swRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

/** Pede ao servidor uma notificação de teste pros aparelhos deste usuário. */
export async function sendTestPush(): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke<{ sent?: number }>('push-new-booking', {
    body: { test: true },
  })
  return !error && (data?.sent ?? 0) > 0
}
