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
    { month: '2025-05', label: 'Maio',     total: 980,   byCategory: { Corte: 540,   Barba: 295,   Combo: 145 } },
    { month: '2025-06', label: 'Junho',    total: 1_050, byCategory: { Corte: 580,   Barba: 315,   Combo: 155 } },
    { month: '2025-07', label: 'Julho',    total: 1_120, byCategory: { Corte: 615,   Barba: 335,   Combo: 170 } },
    { month: '2025-08', label: 'Agosto',   total: 1_000, byCategory: { Corte: 550,   Barba: 300,   Combo: 150 } },
    { month: '2025-09', label: 'Setembro', total: 1_150, byCategory: { Corte: 635,   Barba: 345,   Combo: 170 } },
    { month: '2025-10', label: 'Outubro',  total: 1_280, byCategory: { Corte: 705,   Barba: 385,   Combo: 190 } },
    { month: '2025-11', label: 'Novembro', total: 1_350, byCategory: { Corte: 745,   Barba: 405,   Combo: 200 } },
    { month: '2025-12', label: 'Dezembro', total: 1_420, byCategory: { Corte: 780,   Barba: 425,   Combo: 215 } },
    { month: '2026-01', label: 'Janeiro',  total: 1_100, byCategory: { Corte: 605,   Barba: 330,   Combo: 165 } },
    { month: '2026-02', label: 'Fevereiro',total: 1_240, byCategory: { Corte: 650,   Barba: 360,   Combo: 230 } },
    { month: '2026-03', label: 'Março',    total: 1_480, byCategory: { Corte: 780,   Barba: 420,   Combo: 280 } },
    { month: '2026-04', label: 'Abril',    total: 690,   byCategory: { Corte: 360,   Barba: 200,   Combo: 130 } },
  ],
  pro: [
    { month: '2025-05', label: 'Maio',     total: 5_200, byCategory: { Corte: 2_250, Barba: 1_200, Combo: 1_400, Coloração: 350 } },
    { month: '2025-06', label: 'Junho',    total: 5_600, byCategory: { Corte: 2_400, Barba: 1_300, Combo: 1_500, Coloração: 400 } },
    { month: '2025-07', label: 'Julho',    total: 5_900, byCategory: { Corte: 2_550, Barba: 1_360, Combo: 1_600, Coloração: 390 } },
    { month: '2025-08', label: 'Agosto',   total: 5_300, byCategory: { Corte: 2_280, Barba: 1_220, Combo: 1_430, Coloração: 370 } },
    { month: '2025-09', label: 'Setembro', total: 6_100, byCategory: { Corte: 2_620, Barba: 1_400, Combo: 1_650, Coloração: 430 } },
    { month: '2025-10', label: 'Outubro',  total: 6_500, byCategory: { Corte: 2_800, Barba: 1_500, Combo: 1_750, Coloração: 450 } },
    { month: '2025-11', label: 'Novembro', total: 7_100, byCategory: { Corte: 3_050, Barba: 1_630, Combo: 1_920, Coloração: 500 } },
    { month: '2025-12', label: 'Dezembro', total: 7_400, byCategory: { Corte: 3_180, Barba: 1_700, Combo: 2_000, Coloração: 520 } },
    { month: '2026-01', label: 'Janeiro',  total: 5_800, byCategory: { Corte: 2_500, Barba: 1_340, Combo: 1_570, Coloração: 390 } },
    { month: '2026-02', label: 'Fevereiro',total: 6_800, byCategory: { Corte: 2_900, Barba: 1_600, Combo: 1_800, Coloração: 500 } },
    { month: '2026-03', label: 'Março',    total: 8_200, byCategory: { Corte: 3_500, Barba: 1_900, Combo: 2_200, Coloração: 600 } },
    { month: '2026-04', label: 'Abril',    total: 3_740, byCategory: { Corte: 1_600, Barba: 870,   Combo: 1_000, Coloração: 270 } },
  ],
  premium: [
    { month: '2025-05', label: 'Maio',     total: 11_200, byCategory: { Corte: 4_480, Barba: 2_460, Combo: 3_135, Coloração: 1_125 } },
    { month: '2025-06', label: 'Junho',    total: 12_000, byCategory: { Corte: 4_800, Barba: 2_640, Combo: 3_360, Coloração: 1_200 } },
    { month: '2025-07', label: 'Julho',    total: 12_800, byCategory: { Corte: 5_120, Barba: 2_816, Combo: 3_584, Coloração: 1_280 } },
    { month: '2025-08', label: 'Agosto',   total: 11_500, byCategory: { Corte: 4_600, Barba: 2_530, Combo: 3_220, Coloração: 1_150 } },
    { month: '2025-09', label: 'Setembro', total: 13_200, byCategory: { Corte: 5_280, Barba: 2_904, Combo: 3_696, Coloração: 1_320 } },
    { month: '2025-10', label: 'Outubro',  total: 14_100, byCategory: { Corte: 5_640, Barba: 3_102, Combo: 3_948, Coloração: 1_410 } },
    { month: '2025-11', label: 'Novembro', total: 15_400, byCategory: { Corte: 6_160, Barba: 3_388, Combo: 4_312, Coloração: 1_540 } },
    { month: '2025-12', label: 'Dezembro', total: 16_200, byCategory: { Corte: 6_480, Barba: 3_564, Combo: 4_536, Coloração: 1_620 } },
    { month: '2026-01', label: 'Janeiro',  total: 12_500, byCategory: { Corte: 5_000, Barba: 2_750, Combo: 3_500, Coloração: 1_250 } },
    { month: '2026-02', label: 'Fevereiro',total: 14_600, byCategory: { Corte: 5_800, Barba: 3_200, Combo: 4_100, Coloração: 1_500 } },
    { month: '2026-03', label: 'Março',    total: 17_400, byCategory: { Corte: 6_900, Barba: 3_800, Combo: 5_000, Coloração: 1_700 } },
    { month: '2026-04', label: 'Abril',    total: 8_050,  byCategory: { Corte: 3_200, Barba: 1_750, Combo: 2_300, Coloração: 800  } },
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
