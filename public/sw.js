// Service worker do BarberOS (PWA). Faz três coisas:
// 1. mostra o push de agendamento novo (chega com o navegador fechado);
// 2. abre a Agenda ao tocar na notificação;
// 3. sem internet, mostra /offline.html em vez da tela de erro do navegador.
// NÃO guarda o app em cache: assets do Vite mudam de nome a cada deploy e a
// agenda precisa estar sempre em dia. Só a página offline fica guardada.
const CACHE = 'barberos-offline-v1'
const OFFLINE_ASSETS = ['/offline.html', '/icon-192.png']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(c => c.addAll(OFFLINE_ASSETS)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// Só navegação (abrir/recarregar página). Tudo o mais vai direto pra rede.
self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate') return
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match('/offline.html').then(r => r || Response.error()),
    ),
  )
})

// Push da edge function push-new-booking (chega com o navegador fechado).
self.addEventListener('push', event => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Novo agendamento!'
  const options = {
    body: data.body || 'Um cliente marcou pelo site.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'agendamento',
    renotify: true,
    vibrate: [90, 60, 140],
    data: { url: data.url || '/dashboard/agenda' },
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // Painel na frente: ele mesmo já mostrou o aviso e tocou a moeda.
      const visible = list.some(c => c.visibilityState === 'visible')
      if (visible) return undefined
      return self.registration.showNotification(title, options)
    }),
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/dashboard/agenda'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(url).catch(() => {})
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
