// Layout do site público de cada barbearia — sem Header/Footer do SaaS
// Busca a barbearia do Supabase pelo slug (acesso público via RLS)

import { useState, useEffect } from 'react'
import { Outlet, Link, useParams } from 'react-router-dom'
import { Menu, X, Scissors, Phone } from 'lucide-react'
import { supabasePublic } from '@/lib/supabase-public'
import { getDemoPublicSiteBySlug, isDemoMode } from '@/lib/demo'
import type { Barbershop, BarbershopService, BarbershopBarber, BarbershopMembership, CancellationPolicy } from '@/types/tenant'
import type { Tables } from '@/types/database'
import { motion, AnimatePresence } from 'framer-motion'

type BarbershopRow = Tables<'barbershops'>
type ServiceRow = Tables<'services'>
type MemberRow = Tables<'barbershop_members'>
type MembershipRow = Tables<'memberships'>

function mapBarbershop(row: BarbershopRow): Barbershop {
  return {
    id: row.id, slug: row.slug, name: row.name, tagline: row.tagline,
    description: row.description, phone: row.phone, whatsapp: row.whatsapp,
    address: row.address, city: row.city, state: row.state, instagram: row.instagram,
    primaryColor: row.primary_color, accentColor: row.accent_color, logoText: row.logo_text,
    coverImage: row.cover_image ?? undefined, plan: null,
    active: row.active, siteType: row.site_type as Barbershop['siteType'],
    customDomain: row.custom_domain ?? '', embedKey: row.embed_key,
    cancellationPolicy: row.cancellation_policy as CancellationPolicy | null ?? null,
    openTime: row.open_time ?? '08:00',
    closeTime: row.close_time ?? '20:00',
  }
}

export interface PublicReview {
  rating: number
  review: string | null
  clientLabel: string
  date: string
}

export interface PublicSiteOutletCtx {
  barbershop: Barbershop
  services: BarbershopService[]
  barbers: BarbershopBarber[]
  memberships: BarbershopMembership[]
  reviews: PublicReview[]
  ratingAvg: number | null
  ratingCount: number
}

const PublicSiteLayout = () => {
  const { slug } = useParams<{ slug: string }>()
  const [barbershop, setBarbershop] = useState<Barbershop | null>(null)
  const [services, setServices] = useState<BarbershopService[]>([])
  const [barbers, setBarbers] = useState<BarbershopBarber[]>([])
  const [memberships, setMemberships] = useState<BarbershopMembership[]>([])
  const [reviews, setReviews] = useState<PublicReview[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Agregados de avaliação — declarados aqui (antes do useEffect de SEO que os
  // usa nas dependências), senão caem em temporal dead zone.
  const ratingCount = reviews.length
  const ratingAvg = ratingCount
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / ratingCount) * 10) / 10
    : null

  // Injeta/restaura meta tags SEO
  useEffect(() => {
    if (!barbershop) return

    const city = [barbershop.city, barbershop.state].filter(Boolean).join(', ')
    const title = city
      ? `${barbershop.name} — Barbearia em ${city}`
      : barbershop.name
    const description = barbershop.tagline
      || barbershop.description?.slice(0, 155)
      || `Agende online na ${barbershop.name}. Cortes, barba e muito mais.`

    const prev = {
      title: document.title,
      desc: document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ?? '',
    }

    document.title = title

    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.querySelector<HTMLMetaElement>(selector)
      if (!el) {
        el = document.createElement('meta')
        const [name, content] = selector.replace('meta[', '').replace(']', '').split('=')
        el.setAttribute(name.replace(/"/g, ''), content?.replace(/"/g, '') ?? '')
        document.head.appendChild(el)
      }
      el.setAttribute(attr, value)
    }

    const url = window.location.href

    setMeta('meta[name="description"]',         'content', description)
    setMeta('meta[property="og:title"]',         'content', title)
    setMeta('meta[property="og:description"]',   'content', description)
    setMeta('meta[property="og:type"]',          'content', 'website')
    setMeta('meta[property="og:url"]',           'content', url)
    setMeta('meta[property="og:site_name"]',     'content', barbershop.name)
    setMeta('meta[name="twitter:card"]',         'content', barbershop.coverImage ? 'summary_large_image' : 'summary')
    setMeta('meta[name="twitter:title"]',        'content', title)
    setMeta('meta[name="twitter:description"]',  'content', description)
    if (barbershop.coverImage) {
      setMeta('meta[property="og:image"]',  'content', barbershop.coverImage)
      setMeta('meta[name="twitter:image"]', 'content', barbershop.coverImage)
    }

    // Canonical
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = url.split('#')[0].split('?')[0]

    // JSON-LD — dados estruturados p/ o Google (rich results de negócio local)
    const ld: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'HairSalon',
      name: barbershop.name,
      description,
      url,
      ...(barbershop.coverImage ? { image: barbershop.coverImage } : {}),
      ...(barbershop.phone ? { telephone: barbershop.phone } : {}),
      address: {
        '@type': 'PostalAddress',
        ...(barbershop.address ? { streetAddress: barbershop.address } : {}),
        ...(barbershop.city ? { addressLocality: barbershop.city } : {}),
        ...(barbershop.state ? { addressRegion: barbershop.state } : {}),
        addressCountry: 'BR',
      },
      ...(barbershop.openTime && barbershop.closeTime
        ? { openingHours: `Mo-Sa ${barbershop.openTime}-${barbershop.closeTime}` }
        : {}),
      priceRange: 'R$',
      ...(ratingCount > 0 && ratingAvg
        ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: ratingAvg, reviewCount: ratingCount } }
        : {}),
    }
    let ldScript = document.getElementById('barberos-jsonld')
    if (!ldScript) {
      ldScript = document.createElement('script')
      ldScript.id = 'barberos-jsonld'
      ;(ldScript as HTMLScriptElement).type = 'application/ld+json'
      document.head.appendChild(ldScript)
    }
    ldScript.textContent = JSON.stringify(ld)

    return () => {
      document.title = prev.title
      document.querySelector<HTMLMetaElement>('meta[name="description"]')
        ?.setAttribute('content', prev.desc)
      document.getElementById('barberos-jsonld')?.remove()
    }
  }, [barbershop, ratingAvg, ratingCount])

  useEffect(() => {
    let cancelled = false

    const loadPublicSite = async () => {
      if (!slug) {
        setNotFound(true)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setNotFound(false)

      if (isDemoMode()) {
        const demoSite = getDemoPublicSiteBySlug(slug)

        if (demoSite) {
          if (cancelled) return
          setBarbershop(demoSite.barbershop)
          setServices(demoSite.services)
          setBarbers(demoSite.barbers)
          setMemberships(demoSite.memberships)
          setReviews([])
          setIsLoading(false)
          return
        }
      }

      const { data: bs, error } = await supabasePublic
        .from('barbershops')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()

      if (cancelled) return

      if (error || !bs) {
        // Fallback: slug de barbearia demo (corvo/mendes/atlas) — funciona em
        // qualquer aba, mesmo sem sessão demo ativa. Barbearia real tem prioridade.
        const demoSite = getDemoPublicSiteBySlug(slug)
        if (demoSite) {
          setBarbershop(demoSite.barbershop)
          setServices(demoSite.services)
          setBarbers(demoSite.barbers)
          setMemberships(demoSite.memberships)
          setReviews([])
          setNotFound(false)
          setIsLoading(false)
          return
        }
        setBarbershop(null)
        setServices([])
        setBarbers([])
        setMemberships([])
        setNotFound(true)
        setIsLoading(false)
        return
      }

      setBarbershop(mapBarbershop(bs))

      const [{ data: svcs }, { data: team }, { data: mems }, { data: revs }] = await Promise.all([
        supabasePublic
          .from('services')
          .select('*')
          .eq('barbershop_id', bs.id)
          .eq('active', true)
          .order('category')
          .order('name'),
        supabasePublic
          .from('barbershop_members')
          .select('*')
          .eq('barbershop_id', bs.id)
          .eq('active', true)
          .order('joined_at'),
        supabasePublic
          .from('memberships')
          .select('*')
          .eq('barbershop_id', bs.id)
          .eq('active', true)
          .order('price'),
        supabasePublic.rpc('public_barbershop_reviews', { p_barbershop_id: bs.id }),
      ])

      if (cancelled) return

      setServices((svcs ?? []).map((r: ServiceRow) => ({
        id: r.id, barbershopId: r.barbershop_id, name: r.name, description: r.description,
        price: Number(r.price), durationMin: r.duration_min, category: r.category, active: r.active,
      })))
      setBarbers((team ?? []).map((r: MemberRow) => ({
        id: r.id, barbershopId: r.barbershop_id, userId: r.user_id, name: r.name,
        bio: r.bio, specialty: r.specialty, cutDurationMin: r.cut_duration_minutes,
        commissionPercent: r.commission_percent ?? 50,
        avatar: r.avatar ?? undefined, active: r.active,
      })))
      setMemberships((mems ?? []).map((r: MembershipRow) => ({
        id: r.id, barbershopId: r.barbershop_id, name: r.name, price: Number(r.price),
        period: r.period as BarbershopMembership['period'], benefits: r.benefits,
        active: r.active, subscriberCount: r.subscriber_count,
      })))
      setReviews((revs ?? []).map((r: { rating: number; review: string | null; client_label: string; review_date: string }) => ({
        rating: r.rating, review: r.review, clientLabel: r.client_label, date: r.review_date,
      })))
      setIsLoading(false)
    }

    loadPublicSite()

    return () => {
      cancelled = true
    }
  }, [slug])

  const navLinks = [
    { label: 'Início', href: '#home' },
    { label: 'Serviços', href: '#servicos' },
    { label: 'Equipe', href: '#equipe' },
    { label: 'Galeria', href: '#galeria' },
    { label: 'Clube VIP', href: '#clube' },
    { label: 'Agendar', href: '#agendar' },
  ]

  const primary = barbershop?.primaryColor ?? '#C9A84C'
  // [A2] Só dígitos + DDI — impede injeção na URL do wa.me
  const safeWhatsapp = barbershop?.whatsapp?.replace(/\D/g, '') ?? ''

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
      </div>
    )
  }

  if (!barbershop || notFound) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6 text-center">
        <div className="max-w-md">
          <div className="w-12 h-12 rounded-xl mx-auto mb-5 border border-white/10 bg-white/[0.03] flex items-center justify-center">
            <Scissors className="w-5 h-5 text-white/45" />
          </div>
          <h1 className="font-heading text-3xl text-white tracking-wide mb-3">SITE INDISPONIVEL</h1>
          <p className="text-white/45 text-sm font-body leading-relaxed">
            Nao foi possivel localizar uma barbearia publica para o slug <span className="text-white/65 font-mono">{slug}</span>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-[#1a1a1a]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to={`/b/${barbershop.slug}`} className="flex items-center gap-2 group">
            <div
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{ backgroundColor: primary + '22', border: `1px solid ${primary}44` }}
            >
              <Scissors className="w-4 h-4" style={{ color: primary }} />
            </div>
            <span className="font-heading text-xl tracking-wider" style={{ color: primary }}>
              {barbershop.logoText}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <a key={link.href} href={link.href} className="text-sm text-white/55 hover:text-white transition-colors font-body tracking-wide">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <a
              href={`https://wa.me/${safeWhatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded text-sm font-body font-semibold transition-all"
              style={{ backgroundColor: primary, color: '#0a0a0a' }}
            >
              <Phone className="w-3.5 h-3.5" />
              Agendar
            </a>
            <button className="md:hidden text-white/70 hover:text-white" onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-white/5 bg-[#0a0a0a]"
            >
              <nav className="px-6 py-4 flex flex-col gap-4">
                {navLinks.map(link => (
                  <a key={link.href} href={link.href} className="text-white/70 hover:text-white text-sm font-body transition-colors" onClick={() => setMenuOpen(false)}>
                    {link.label}
                  </a>
                ))}
                <a
                  href={`https://wa.me/${safeWhatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded text-sm font-semibold mt-2"
                  style={{ backgroundColor: primary, color: '#0a0a0a' }}
                >
                  <Phone className="w-4 h-4" />
                  Agendar pelo WhatsApp
                </a>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1 pt-16">
        <Outlet context={{ barbershop, services, barbers, memberships, reviews, ratingAvg, ratingCount } satisfies PublicSiteOutletCtx} />
      </main>

      <footer className="border-t border-[#1a1a1a] py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-white/30 text-sm font-body">
          <span>{barbershop.name} — {barbershop.address}</span>
          <span>
            Powered by{' '}
            <Link to="/" className="hover:text-white/60 transition-colors" style={{ color: primary + 'aa' }}>
              BarberOS
            </Link>
          </span>
        </div>
      </footer>
    </div>
  )
}

export default PublicSiteLayout
