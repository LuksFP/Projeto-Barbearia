// Multi-tenant types — preparados para integração futura com Supabase + RLS

export type BarbershopRole = 'owner' | 'admin' | 'barber' | 'receptionist'

export interface Barbershop {
  id: string
  slug: string
  name: string
  tagline: string
  description: string
  phone: string
  whatsapp: string
  address: string
  city: string
  state: string
  instagram: string
  primaryColor: string      // hex — identidade visual da barbearia
  accentColor: string
  logoText: string          // fallback quando não há logo
  coverImage?: string
  plan: 'basic' | 'pro' | 'premium'
  active: boolean
  // Site
  siteType: 'generic' | 'external'
  customDomain?: string
  embedKey?: string
  cancellationPolicy?: CancellationPolicy | null
  clubPixKey?: string       // chave PIX usada nas cobranças do Clube VIP
  openTime?: string         // horário de abertura 'HH:MM'
  closeTime?: string        // horário de fechamento 'HH:MM'
}

export interface BarbershopMember {
  userId: string
  barbershopId: string
  role: BarbershopRole
  joinedAt: string
}

export interface TenantUser {
  id: string
  name: string
  email: string
  avatar?: string
  // O papel do usuário é sempre relativo à barbearia ativa — não existe role global
  membership: BarbershopMember | null
}

export interface BarbershopService {
  id: string
  barbershopId: string
  name: string
  description: string
  price: number
  durationMin: number
  category: string
  active: boolean
}

export interface BarbershopBarber {
  id: string
  barbershopId: string
  userId: string
  name: string
  bio: string
  specialty: string
  cutDurationMin: number
  commissionPercent: number
  avatar?: string
  active: boolean
}

export interface BarbershopAppointment {
  id: string
  barbershopId: string
  clientName: string
  clientPhone: string
  barberId: string
  barberName: string
  serviceId: string
  serviceName: string
  serviceCategory?: string
  date: string
  time: string
  durationMin: number
  status: 'pending' | 'confirmed' | 'done' | 'cancelled'
  membershipType?: 'vip' | 'standard'
  price?: number
}

export interface BarbershopClient {
  id: string
  barbershopId: string
  name: string
  phone: string
  email?: string
  membershipType: 'vip' | 'standard' | null
  totalVisits: number
  lastVisit: string
  notes?: string
}

export interface BarbershopMembership {
  id: string
  barbershopId: string
  name: string
  price: number
  period: 'monthly' | 'quarterly' | 'annual'
  benefits: string[]
  active: boolean
  subscriberCount: number
  // Plano vinculado a um barbeiro específico (opcional)
  barberId?: string
  barberName?: string
}

export interface CancellationPolicy {
  enabled: boolean
  freeWindowHours: number       // até X horas antes = cancelamento sem multa
  fineType: 'fixed' | 'percent' // R$ fixo ou % do serviço
  fineValue: number
}

export interface MonthRevenue {
  month: string           // 'YYYY-MM'
  label: string           // 'Março', 'Abril' etc.
  total: number
  byCategory: Record<string, number>
}
