// O app instalável (PWA) é só do lado barbeiro. O manifesto e as metas de
// "app" do iPhone entram no <head> apenas nas telas do painel; no site da
// barbearia (/b/:slug, lado cliente) eles saem, então o navegador não oferece
// instalar o painel e o link do cliente nunca abre dentro do app.
const PAINEL_PREFIXES = ['/dashboard', '/entrar']

export function isPainelPath(pathname: string): boolean {
  return PAINEL_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`))
}

const TAGS: Array<{ tag: 'link' | 'meta'; attrs: Record<string, string> }> = [
  { tag: 'link', attrs: { rel: 'manifest', href: '/manifest.webmanifest' } },
  { tag: 'meta', attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' } },
  { tag: 'meta', attrs: { name: 'apple-mobile-web-app-status-bar-style', content: 'black' } },
  { tag: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: 'BarberOS' } },
]

const MARK = 'data-pwa-painel'

export function syncPwaHead(pathname: string): void {
  const present = document.head.querySelector(`[${MARK}]`) !== null
  const want = isPainelPath(pathname)
  if (want === present) return
  if (!want) {
    document.head.querySelectorAll(`[${MARK}]`).forEach(el => el.remove())
    return
  }
  for (const { tag, attrs } of TAGS) {
    const el = document.createElement(tag)
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    el.setAttribute(MARK, '')
    document.head.appendChild(el)
  }
}
