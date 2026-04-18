// Demo mode — injeta sessão fake via sessionStorage (por aba, sem Supabase)
import type { SaasAccount } from '@/types/saas'
import type {
  Barbershop, BarbershopBarber, BarbershopAppointment,
  BarbershopClient, BarbershopMembership, BarbershopService,
  CancellationPolicy, MonthRevenue,
} from '@/types/tenant'
import {
  MOCK_BARBERS, MOCK_SERVICES, MOCK_APPOINTMENTS,
  MOCK_CLIENTS, MOCK_MEMBERSHIPS,
} from '@/mocks/tenant'

export const DEMO_SESSION_KEY = '__barberos_demo__'

export type DemoPlan = 'basic' | 'pro' | 'premium'

export interface DemoSession {
  plan: DemoPlan
}

// ─── Credenciais demo (usadas na tela /entrar) ───────────────────────────────

export const DEMO_CREDENTIALS: Record<DemoPlan, { email: string; password: string }> = {
  basic:   { email: 'demo-basico@barberos.io',  password: 'demo1234' },
  pro:     { email: 'demo-pro@barberos.io',     password: 'demo1234' },
  premium: { email: 'demo-premium@barberos.io', password: 'demo1234' },
}

/** Retorna o plano se o par email+senha bater com alguma conta demo, ou null. */
export function matchDemoCredentials(email: string, password: string): DemoPlan | null {
  for (const [plan, creds] of Object.entries(DEMO_CREDENTIALS) as [DemoPlan, { email: string; password: string }][]) {
    if (creds.email === email.trim().toLowerCase() && creds.password === password) {
      return plan
    }
  }
  return null
}

/** Rota /demo/:plan disponível em todos os ambientes */
export function isDemoRouteAllowed(): boolean {
  return true
}

// ─── Contas SaaS demo ────────────────────────────────────────────────────────

const DEMO_ACCOUNTS: Record<DemoPlan, SaasAccount> = {
  basic: {
    id: 'demo-basic',
    userId: 'demo-user-basic',
    ownerName: 'Carlos Mendes',
    email: 'carlos@demo.barberos.io',
    barbershopName: 'Barbearia Mendes',
    barbershopSlug: 'mendes',
    barbershopId: 'bs-001',
    plan: 'basic',
    planStatus: 'active',
    planStartedAt: '2026-01-01T00:00:00Z',
    trialEndsAt: null,
    cancelAt: null,
    createdAt: '2026-01-01T00:00:00Z',
  },
  pro: {
    id: 'demo-pro',
    userId: 'demo-user-pro',
    ownerName: 'Rafael Moura',
    email: 'rafael@demo.barberos.io',
    barbershopName: 'Barbearia Corvo',
    barbershopSlug: 'corvo',
    barbershopId: 'bs-002',
    plan: 'pro',
    planStatus: 'active',
    planStartedAt: '2026-01-01T00:00:00Z',
    trialEndsAt: null,
    cancelAt: null,
    createdAt: '2026-01-01T00:00:00Z',
  },
  premium: {
    id: 'demo-premium',
    userId: 'demo-user-premium',
    ownerName: 'Diego Matos',
    email: 'diego@demo.barberos.io',
    barbershopName: 'Atlas Barber Shop',
    barbershopSlug: 'atlas',
    barbershopId: 'bs-003',
    plan: 'premium',
    planStatus: 'active',
    planStartedAt: '2026-01-01T00:00:00Z',
    trialEndsAt: null,
    cancelAt: null,
    createdAt: '2026-01-01T00:00:00Z',
  },
}

// ─── Barbearias demo ─────────────────────────────────────────────────────────

const DEMO_BARBERSHOPS: Record<DemoPlan, Barbershop> = {
  basic: {
    id: 'bs-demo-basic',
    slug: 'mendes',
    name: 'Barbearia Mendes',
    tagline: 'Seu horário, sem espera.',
    description: 'Barbearia de bairro com agenda online. Simples, rápido e sem fila.',
    phone: '(21) 98800-1234',
    whatsapp: '5521988001234',
    address: 'Rua das Flores, 45 — Tijuca',
    city: 'Rio de Janeiro',
    state: 'RJ',
    instagram: '@barbeariamendes',
    primaryColor: '#6B7280',
    accentColor: '#374151',
    logoText: 'MENDES',
    plan: 'basic',
    active: true,
    siteType: 'generic',
    customDomain: '',
    embedKey: '',
  },
  pro: {
    id: 'bs-001',
    slug: 'corvo',
    name: 'Barbearia Corvo',
    tagline: 'Precisão que fala por si.',
    description: 'Fundada em 2018 no coração da Vila Madalena. Cada corte é tratado como obra.',
    phone: '(11) 99823-4455',
    whatsapp: '5511998234455',
    address: 'Rua Wisard, 122 — Vila Madalena',
    city: 'São Paulo',
    state: 'SP',
    instagram: '@barbearia.corvo',
    primaryColor: '#C9A84C',
    accentColor: '#8B6914',
    logoText: 'CORVO',
    plan: 'pro',
    active: true,
    siteType: 'generic',
    customDomain: '',
    embedKey: 'bos_corvo_demo0000000000000000',
  },
  premium: {
    id: 'bs-002',
    slug: 'atlas',
    name: 'Atlas Barber Shop',
    tagline: 'O estilo que você carrega.',
    description: 'No Brooklin desde 2021. Referência em fade técnico e barba artesanal.',
    phone: '(11) 97765-3322',
    whatsapp: '5511977653322',
    address: 'Av. Santo Amaro, 870 — Brooklin',
    city: 'São Paulo',
    state: 'SP',
    instagram: '@atlasbarber.sp',
    primaryColor: '#3B82F6',
    accentColor: '#1D4ED8',
    logoText: 'ATLAS',
    plan: 'premium',
    active: true,
    siteType: 'external',
    customDomain: 'atlasbarber.com.br',
    embedKey: 'bos_atlas_demo0000000000000000',
  },
}

// Filtra dados de mock por barbershopId
const BS_ID: Record<DemoPlan, string> = {
  basic: 'bs-demo-basic',
  pro: 'bs-001',
  premium: 'bs-002',
}

export function getDemoAccount(plan: DemoPlan): SaasAccount {
  return DEMO_ACCOUNTS[plan]
}

export function getDemoBarbershop(plan: DemoPlan): Barbershop {
  return DEMO_BARBERSHOPS[plan]
}

export function getDemoBarbers(plan: DemoPlan): BarbershopBarber[] {
  const id = BS_ID[plan]
  if (plan === 'basic') {
    // Básico: apenas 2 barbeiros
    return MOCK_BARBERS.filter(b => b.barbershopId === 'bs-001').slice(0, 2).map(b => ({
      ...b, barbershopId: id,
    }))
  }
  return MOCK_BARBERS.filter(b => b.barbershopId === id)
}

export function getDemoServices(plan: DemoPlan): BarbershopService[] {
  const id = BS_ID[plan]
  if (plan === 'basic') {
    return MOCK_SERVICES.filter(s => s.barbershopId === 'bs-001').slice(0, 3).map(s => ({
      ...s, barbershopId: id,
    }))
  }
  return MOCK_SERVICES.filter(s => s.barbershopId === id)
}

export function getDemoAppointments(plan: DemoPlan): BarbershopAppointment[] {
  const id = BS_ID[plan]
  if (plan === 'basic') {
    return MOCK_APPOINTMENTS.filter(a => a.barbershopId === 'bs-001').slice(0, 3).map(a => ({
      ...a, barbershopId: id,
    }))
  }
  return MOCK_APPOINTMENTS.filter(a => a.barbershopId === id)
}

export function getDemoClients(plan: DemoPlan): BarbershopClient[] {
  const id = BS_ID[plan]
  if (plan === 'basic') {
    return MOCK_CLIENTS.filter(c => c.barbershopId === 'bs-001').slice(0, 3).map(c => ({
      ...c, barbershopId: id,
    }))
  }
  return MOCK_CLIENTS.filter(c => c.barbershopId === id)
}

export function getDemoMemberships(plan: DemoPlan): BarbershopMembership[] {
  const id = BS_ID[plan]
  if (plan === 'basic') return []
  if (plan === 'pro') {
    return [
      ...MOCK_MEMBERSHIPS.filter(m => m.barbershopId === id),
      // Plano vinculado ao barbeiro Lucas
      {
        id: 'mem-pro-barber',
        barbershopId: id,
        name: 'Lucas Premium',
        price: 199,
        period: 'monthly' as const,
        benefits: ['2 cortes/mês com Lucas', 'Whatsapp direto', 'Horário exclusivo sábado'],
        active: true,
        subscriberCount: 9,
        barberId: 'b-002',
        barberName: 'Lucas Ferreira',
      },
    ]
  }
  // premium
  return [
    ...MOCK_MEMBERSHIPS.filter(m => m.barbershopId === id),
    {
      id: 'mem-prem-barber-1',
      barbershopId: id,
      name: 'Diego VIP',
      price: 229,
      period: 'monthly' as const,
      benefits: ['2 atendimentos/mês com Diego', 'Prioridade máxima', 'Kit mensal'],
      active: true,
      subscriberCount: 14,
      barberId: 'b-101',
      barberName: 'Diego Matos',
    },
    {
      id: 'mem-prem-barber-2',
      barbershopId: id,
      name: 'Caio Club',
      price: 179,
      period: 'monthly' as const,
      benefits: ['2 cortes/mês com Caio', 'Barba incluída', 'Agendamento prioritário'],
      active: true,
      subscriberCount: 7,
      barberId: 'b-102',
      barberName: 'Caio Brito',
    },
  ]
}

export function getDemoPublicSiteBySlug(slug: string): {
  barbershop: Barbershop
  services: BarbershopService[]
  barbers: BarbershopBarber[]
  memberships: BarbershopMembership[]
} | null {
  const normalizedSlug = slug.trim().toLowerCase()
  const plans: DemoPlan[] = ['basic', 'pro', 'premium']

  for (const plan of plans) {
    const barbershop = getDemoBarbershop(plan)
    if (barbershop.slug !== normalizedSlug) continue

    return {
      barbershop,
      services: getDemoServices(plan),
      barbers: getDemoBarbers(plan),
      memberships: getDemoMemberships(plan),
    }
  }

  return null
}

// ─── Dados financeiros mock ──────────────────────────────────────────────────

const FINANCIAL_DATA: Record<DemoPlan, MonthRevenue[]> = {
  basic: [
    {
      month: '2026-02', label: 'Fevereiro',
      total: 1_240,
      byCategory: { Corte: 650, Barba: 360, Combo: 230 },
    },
    {
      month: '2026-03', label: 'Março',
      total: 1_480,
      byCategory: { Corte: 780, Barba: 420, Combo: 280 },
    },
    {
      month: '2026-04', label: 'Abril',
      total: 690,
      byCategory: { Corte: 360, Barba: 200, Combo: 130 },
    },
  ],
  pro: [
    {
      month: '2026-02', label: 'Fevereiro',
      total: 6_800,
      byCategory: { Corte: 2_900, Barba: 1_600, Combo: 1_800, Coloração: 500 },
    },
    {
      month: '2026-03', label: 'Março',
      total: 8_200,
      byCategory: { Corte: 3_500, Barba: 1_900, Combo: 2_200, Coloração: 600 },
    },
    {
      month: '2026-04', label: 'Abril',
      total: 3_740,
      byCategory: { Corte: 1_600, Barba: 870, Combo: 1_000, Coloração: 270 },
    },
  ],
  premium: [
    {
      month: '2026-02', label: 'Fevereiro',
      total: 14_600,
      byCategory: { Corte: 5_800, Barba: 3_200, Combo: 4_100, Coloração: 1_500 },
    },
    {
      month: '2026-03', label: 'Março',
      total: 17_400,
      byCategory: { Corte: 6_900, Barba: 3_800, Combo: 5_000, Coloração: 1_700 },
    },
    {
      month: '2026-04', label: 'Abril',
      total: 8_050,
      byCategory: { Corte: 3_200, Barba: 1_750, Combo: 2_300, Coloração: 800 },
    },
  ],
}

export function getDemoFinancials(plan: DemoPlan): MonthRevenue[] {
  return FINANCIAL_DATA[plan]
}

// ─── Política de cancelamento mock ───────────────────────────────────────────

const DEFAULT_POLICY: CancellationPolicy = {
  enabled: true,
  freeWindowHours: 24,
  fineType: 'percent',
  fineValue: 50,
}

export function getDefaultCancellationPolicy(): CancellationPolicy {
  return { ...DEFAULT_POLICY }
}

export function isDemoMode(): boolean {
  try {
    return !!sessionStorage.getItem(DEMO_SESSION_KEY)
  } catch {
    return false
  }
}

export function getDemoPlan(): DemoPlan | null {
  try {
    const raw = sessionStorage.getItem(DEMO_SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as DemoSession
    return session.plan
  } catch {
    return null
  }
}

export function setDemoSession(plan: DemoPlan): void {
  sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify({ plan }))
}

export function clearDemoSession(): void {
  sessionStorage.removeItem(DEMO_SESSION_KEY)
}
