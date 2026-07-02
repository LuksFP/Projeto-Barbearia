// Vercel Edge Middleware — SEO / Open Graph server-side para o site público /b/:slug
//
// Crawlers de preview (WhatsApp, Facebook, Twitter/X, Telegram, etc.) NÃO executam
// JavaScript, então só enxergam o index.html estático (meta genérica do BarberOS).
// Aqui, apenas para esses bots, buscamos a barbearia no Supabase e devolvemos o
// index.html com as meta tags já preenchidas — assim o link fica bonito quando
// compartilhado. Usuários reais recebem o SPA estático intacto (sem latência extra);
// o PublicSiteLayout já cuida da meta client-side pra eles.
//
// Falha sempre graciosamente com next(): se faltar env, a loja não existir ou algo
// der erro, o site é servido normalmente.

import { next } from '@vercel/edge'

export const config = {
  matcher: '/b/:slug*',
}

const BOT_UA =
  /facebookexternalhit|facebookcatalog|Facebot|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|Pinterest|redditbot|Googlebot|bingbot|Applebot|SkypeUriPreview|vkShare|Embedly|Iframely/i

interface Shop {
  name: string
  tagline: string | null
  description: string | null
  city: string | null
  state: string | null
  cover_image: string | null
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default async function middleware(request: Request): Promise<Response> {
  const ua = request.headers.get('user-agent') ?? ''
  if (!BOT_UA.test(ua)) return next()

  const url = new URL(request.url)
  // pathname = /b/<slug> → segmentos ['b', '<slug>']
  const slug = url.pathname.split('/').filter(Boolean)[1]
  if (!slug) return next()

  const supaUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const supaKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
  if (!supaUrl || !supaKey) return next()

  // Busca a barbearia via REST (edge-friendly, sem SDK)
  let shop: Shop | null = null
  try {
    const query =
      `${supaUrl}/rest/v1/barbershops?slug=eq.${encodeURIComponent(slug)}` +
      `&select=name,tagline,description,city,state,cover_image&limit=1`
    const res = await fetch(query, {
      headers: { apikey: supaKey, authorization: `Bearer ${supaKey}` },
    })
    if (res.ok) {
      const rows = (await res.json()) as Shop[]
      shop = rows[0] ?? null
    }
  } catch {
    return next()
  }
  if (!shop) return next()

  // Puxa o HTML estático e injeta as meta tags
  let html: string
  try {
    const htmlRes = await fetch(new URL('/index.html', url.origin))
    if (!htmlRes.ok) return next()
    html = await htmlRes.text()
  } catch {
    return next()
  }

  const city = [shop.city, shop.state].filter(Boolean).join(', ')
  const title = city ? `${shop.name} — Barbearia em ${city}` : shop.name
  const description =
    shop.tagline ||
    shop.description?.slice(0, 155) ||
    `Agende online na ${shop.name}. Cortes, barba e muito mais.`
  const image = shop.cover_image || `${url.origin}/apple-touch-icon.svg`
  const canonical = `${url.origin}/b/${slug}`

  const t = escapeHtml(title)
  const d = escapeHtml(description)
  const i = escapeHtml(image)

  html = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${t}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${i}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${t}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${d}$2`)
    .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${i}$2`)
    // og:url canônico logo após o og:image
    .replace(
      /(<meta property="og:image" content="[^"]*" \/>)/,
      `$1\n    <meta property="og:url" content="${escapeHtml(canonical)}" />`,
    )

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // cache curto no edge da Vercel; bots podem re-buscar
      'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
