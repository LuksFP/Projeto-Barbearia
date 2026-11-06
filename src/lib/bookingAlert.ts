// Aviso de agendamento novo: som de moeda ("plim-plim" de venda aprovada),
// vibração no celular e notificação do sistema quando o painel está em outra aba.
//
// O som é sintetizado com Web Audio — sem arquivo de áudio pra baixar nem pra
// liberar na CSP. Navegador só toca som depois de um toque do usuário na
// página, por isso `unlockAudio` é chamado no primeiro toque/clique do painel.
//
// Com o navegador fechado quem avisa é o Web Push (src/lib/push.ts +
// edge function push-new-booking) — aí toca o som de notificação do celular:
// navegador nenhum deixa o site escolher. No Android dá pra pôr a moeda como
// som da notificação do app (arquivo public/som-moeda.mp3, botão no menu).

const PREFS_KEY = 'barberos:booking-alert'

export interface BookingAlertPrefs {
  sound: boolean
}

export function readAlertPrefs(): BookingAlertPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { sound: true }
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && 'sound' in parsed) {
      return { sound: (parsed as { sound: unknown }).sound !== false }
    }
  } catch {
    // localStorage indisponível ou corrompido — cai no padrão
  }
  return { sound: true }
}

export function writeAlertPrefs(prefs: BookingAlertPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // sem localStorage: a preferência vale só até recarregar
  }
}

// ─── Som ─────────────────────────────────────────────────────────────────────

let ctx: AudioContext | null = null

function audioContext(): AudioContext | null {
  if (ctx) return ctx
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  ctx = new Ctor()
  return ctx
}

/** Chamar dentro de um gesto do usuário (toque/clique) pra liberar o áudio. */
export function unlockAudio() {
  const ac = audioContext()
  if (ac && ac.state === 'suspended') void ac.resume()
}

// Uma "batida" de moeda: tom agudo + parciais inarmônicas (timbre metálico),
// ataque instantâneo e queda exponencial.
function coinHit(ac: AudioContext, out: AudioNode, at: number, freq: number, gain: number) {
  const partials: Array<[number, number]> = [
    [1, 1],
    [2.76, 0.42],
    [5.4, 0.18],
    [8.93, 0.08],
  ]
  for (const [ratio, amp] of partials) {
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq * ratio, at)
    const decay = 0.55 / ratio + 0.12
    g.gain.setValueAtTime(0.0001, at)
    g.gain.exponentialRampToValueAtTime(gain * amp, at + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, at + decay)
    osc.connect(g).connect(out)
    osc.start(at)
    osc.stop(at + decay + 0.05)
  }
}

// Chiado curto de "gaveta/moedas" antes das batidas.
function jingle(ac: AudioContext, out: AudioNode, at: number) {
  const len = Math.floor(ac.sampleRate * 0.09)
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = ac.createBufferSource()
  src.buffer = buf
  const hp = ac.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 5000
  const g = ac.createGain()
  g.gain.value = 0.12
  src.connect(hp).connect(g).connect(out)
  src.start(at)
}

export function playCoinSound() {
  const ac = audioContext()
  if (!ac) return
  if (ac.state === 'suspended') void ac.resume()
  const master = ac.createGain()
  master.gain.value = 0.55
  master.connect(ac.destination)
  const t = ac.currentTime + 0.02
  jingle(ac, master, t)
  coinHit(ac, master, t + 0.03, 1975.5, 0.5) // B6
  coinHit(ac, master, t + 0.15, 2637.0, 0.6) // E7 — sobe, soa como "aprovado"
}

// ─── Notificação do sistema ──────────────────────────────────────────────────

export type NotifyPermission = NotificationPermission | 'unsupported'

export function notifyPermission(): NotifyPermission {
  return 'Notification' in window ? Notification.permission : 'unsupported'
}

let swReg: Promise<ServiceWorkerRegistration | null> | null = null

// Android Chrome não aceita `new Notification()` — só via service worker.
export function swRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null)
  swReg ??= navigator.serviceWorker
    .register('/sw.js')
    .then(() => navigator.serviceWorker.ready)
    .catch(() => null)
  return swReg
}

export async function requestNotifyPermission(): Promise<NotifyPermission> {
  if (!('Notification' in window)) return 'unsupported'
  const result = await Notification.requestPermission()
  if (result === 'granted') void swRegistration()
  return result
}

/** Já tem permissão de antes? Registra o service worker sem perguntar nada. */
export function warmUpNotifications() {
  if (notifyPermission() === 'granted') void swRegistration()
}

async function showSystemNotification(title: string, body: string, tag: string) {
  if (notifyPermission() !== 'granted') return
  const options: NotificationOptions = {
    body,
    icon: '/icon-192.png',
    badge: '/icon-badge-96.png',
    tag,
    data: { url: '/dashboard/agenda' },
  }
  const reg = await swRegistration()
  if (reg) {
    await reg.showNotification(title, options)
    return
  }
  try {
    const n = new Notification(title, options)
    n.onclick = () => {
      window.focus()
      window.location.assign('/dashboard/agenda')
    }
  } catch {
    // navegador sem suporte a Notification fora de service worker
  }
}

// ─── Tudo junto ──────────────────────────────────────────────────────────────

// O mesmo agendamento pode chegar pelo tempo real E pelo push (service worker):
// toca uma vez só.
const recentTags = new Map<string, number>()

/** true se é aviso novo (aí quem chamou mostra o toast); false se repetido. */
export function alertNewBooking(title: string, body: string, tag: string): boolean {
  const now = Date.now()
  for (const [k, at] of recentTags) if (now - at > 120_000) recentTags.delete(k)
  if (recentTags.has(tag)) return false
  recentTags.set(tag, now)

  if (readAlertPrefs().sound) playCoinSound()
  if ('vibrate' in navigator) navigator.vibrate([90, 60, 140])
  // Com o painel na frente, o toast já aparece; a notificação do sistema é pra
  // quando o barbeiro está em outra aba/app.
  if (document.visibilityState !== 'visible') void showSystemNotification(title, body, tag)
  return true
}

/** Push que chegou com o painel aberto: o service worker repassa pra cá. */
export function listenPushWhileOpen(onNew: (title: string, body: string) => void): () => void {
  if (!('serviceWorker' in navigator)) return () => {}
  const handler = (e: MessageEvent) => {
    const d: unknown = e.data
    if (!d || typeof d !== 'object' || (d as { type?: unknown }).type !== 'novo-agendamento') return
    const { title, body, tag } = d as { title?: unknown; body?: unknown; tag?: unknown }
    if (typeof title !== 'string' || typeof body !== 'string' || typeof tag !== 'string') return
    if (alertNewBooking(title, body, tag)) onNew(title, body)
  }
  navigator.serviceWorker.addEventListener('message', handler)
  return () => navigator.serviceWorker.removeEventListener('message', handler)
}
