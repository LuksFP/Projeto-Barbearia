import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type {
  Barbershop, BarbershopRole, BarbershopService, BarbershopBarber,
  BarbershopMembership, BarbershopAppointment, BarbershopClient, TenantUser,
} from '@/types/tenant'
import { useSaasAccount } from '@/contexts/SaasAccountContext'
import { supabase } from '@/lib/supabase'
import { barbershopRepository } from '@/repositories/barbershopRepository'
import { serviceRepository } from '@/repositories/serviceRepository'
import { teamRepository } from '@/repositories/teamRepository'
import { membershipRepository } from '@/repositories/membershipRepository'
import { appointmentRepository } from '@/repositories/appointmentRepository'
import { clientRepository } from '@/repositories/clientRepository'
import type { BarbershopRow } from '@/repositories/barbershopRepository'
import type { ServiceRow } from '@/repositories/serviceRepository'
import type { MemberRow } from '@/repositories/teamRepository'
import type { MembershipRow } from '@/repositories/membershipRepository'
import type { AppointmentRow } from '@/repositories/appointmentRepository'
import type { ClientRow, ClientUpdate } from '@/repositories/clientRepository'
import {
  isDemoMode, getDemoPlan,
  getDemoBarbershop, getDemoBarbers, getDemoServices,
  getDemoAppointments, getDemoClients, getDemoMemberships,
} from '@/lib/demo'

interface TenantContextType {
  barbershop: Barbershop | null
  services: BarbershopService[]
  barbers: BarbershopBarber[]
  memberships: BarbershopMembership[]
  appointments: BarbershopAppointment[]
  clients: BarbershopClient[]
  tenantUser: TenantUser | null
  userRole: BarbershopRole | null
  canAccess: (minRole: BarbershopRole) => boolean
  updateBarbershop: (updates: Partial<Barbershop>) => Promise<void>
  addClient: (input: {
    name: string
    phone: string
    email?: string
    membershipType: BarbershopClient['membershipType']
  }) => Promise<void>
  updateClient: (id: string, input: {
    name?: string
    phone?: string
    email?: string
    membershipType?: BarbershopClient['membershipType']
    notes?: string
  }) => Promise<void>
  updateServices: (services: BarbershopService[]) => void
  updateBarbers: (barbers: BarbershopBarber[]) => void
  updateMemberships: (memberships: BarbershopMembership[]) => void
  isOwner: boolean
  isAdmin: boolean
  isBarber: boolean
  isLoading: boolean
}

const ROLE_HIERARCHY: Record<BarbershopRole, number> = {
  owner: 4, admin: 3, barber: 2, receptionist: 1,
}

// ─── Mappers DB row → tenant types ───────────────────────────────────────────

function mapBarbershop(row: BarbershopRow): Barbershop {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    phone: row.phone,
    whatsapp: row.whatsapp,
    address: row.address,
    city: row.city,
    state: row.state,
    instagram: row.instagram,
    primaryColor: row.primary_color,
    accentColor: row.accent_color,
    logoText: row.logo_text,
    coverImage: row.cover_image ?? undefined,
    plan: 'pro' as Barbershop['plan'],
    active: row.active,
    siteType: row.site_type as Barbershop['siteType'],
    customDomain: row.custom_domain ?? '',
    embedKey: row.embed_key,
    cancellationPolicy: row.cancellation_policy as Barbershop['cancellationPolicy'] ?? undefined,
    clubPixKey: row.club_pix_key ?? '',
  }
}

function mapService(row: ServiceRow): BarbershopService {
  return {
    id: row.id,
    barbershopId: row.barbershop_id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    durationMin: row.duration_min,
    category: row.category,
    active: row.active,
  }
}

function mapBarber(row: MemberRow): BarbershopBarber {
  return {
    id: row.id,
    barbershopId: row.barbershop_id,
    userId: row.user_id,
    name: row.name,
    bio: row.bio,
    specialty: row.specialty,
    cutDurationMin: row.cut_duration_minutes,
    avatar: row.avatar ?? undefined,
    active: row.active,
  }
}

function mapMembership(row: MembershipRow): BarbershopMembership {
  return {
    id: row.id,
    barbershopId: row.barbershop_id,
    name: row.name,
    price: Number(row.price),
    period: row.period as BarbershopMembership['period'],
    benefits: row.benefits,
    active: row.active,
    subscriberCount: row.subscriber_count,
  }
}

export function mapAppointment(row: AppointmentRow): BarbershopAppointment {
  return {
    id: row.id,
    barbershopId: row.barbershop_id,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    barberId: row.barber_id ?? '',
    barberName: row.barber_name,
    serviceId: row.service_id ?? '',
    serviceName: row.service_name,
    serviceCategory: row.service_category ?? undefined,
    date: row.date,
    time: row.time,
    durationMin: row.duration_min,
    status: row.status as BarbershopAppointment['status'],
    membershipType: row.membership_type as BarbershopAppointment['membershipType'],
    price: row.price ?? undefined,
  }
}

function mapClient(row: ClientRow): BarbershopClient {
  return {
    id: row.id,
    barbershopId: row.barbershop_id,
    name: row.name,
    phone: row.phone,
    email: row.email ?? undefined,
    membershipType: row.membership_type as BarbershopClient['membershipType'],
    totalVisits: row.total_visits,
    lastVisit: row.last_visit ?? '',
    notes: row.notes ?? undefined,
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export const useTenant = () => {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant must be used within TenantProvider')
  return ctx
}

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { account } = useSaasAccount()

  const [barbershop, setBarbershop] = useState<Barbershop | null>(null)
  const [services, setServices] = useState<BarbershopService[]>([])
  const [barbers, setBarbers] = useState<BarbershopBarber[]>([])
  const [memberships, setMemberships] = useState<BarbershopMembership[]>([])
  const [appointments, setAppointments] = useState<BarbershopAppointment[]>([])
  const [clients, setClients] = useState<BarbershopClient[]>([])
  const [userRole, setUserRole] = useState<BarbershopRole>('owner')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Demo mode — usa dados mock, sem chamadas ao Supabase
    if (isDemoMode()) {
      const plan = getDemoPlan()
      if (!plan) { setIsLoading(false); return }
      setBarbershop(getDemoBarbershop(plan))
      setBarbers(getDemoBarbers(plan))
      setServices(getDemoServices(plan))
      setAppointments(getDemoAppointments(plan))
      setClients(getDemoClients(plan))
      setMemberships(getDemoMemberships(plan))
      setIsLoading(false)
      return
    }

    const barbershopId = account?.barbershopId
    const userId       = account?.userId

    if (!account?.barbershopSlug && !barbershopId) {
      setIsLoading(false)
      return
    }

    // Sem barbershop_id ainda (conta legada ou slug-only) — fallback para lookup por slug
    const resolveId = barbershopId
      ? Promise.resolve(barbershopId)
      : barbershopRepository.getBySlug(account?.barbershopSlug ?? '').then(bs => bs?.id ?? null)

    setIsLoading(true)

    const today = new Date().toISOString().split('T')[0]

    resolveId.then(bsId => {
      if (!bsId) { setIsLoading(false); return }

      // Todos os 7 queries em paralelo — elimina roundtrip sequencial
      Promise.all([
        barbershopRepository.getById(bsId),
        serviceRepository.listByBarbershop(bsId),
        teamRepository.listByBarbershop(bsId),
        membershipRepository.listByBarbershop(bsId),
        appointmentRepository.listByBarbershop(bsId, today),
        clientRepository.listByBarbershop(bsId),
        userId ? teamRepository.getByUserAndBarbershop(userId, bsId) : Promise.resolve(null),
      ]).then(([bs, svcs, team, mems, apts, cls, memberRow]) => {
        if (bs) setBarbershop(mapBarbershop(bs))
        setServices(svcs.map(mapService))
        setBarbers(team.map(mapBarber))
        setMemberships(mems.map(mapMembership))
        setAppointments(apts.map(mapAppointment))
        setClients(cls.map(mapClient))
        setUserRole(memberRow ? (memberRow.role as BarbershopRole) : 'owner')
      }).finally(() => setIsLoading(false))
    })
  }, [account?.barbershopId ?? account?.barbershopSlug])

  // Injeta o plan real da conta SaaS no objeto barbershop (não é coluna do barbershops table)
  useEffect(() => {
    if (barbershop && account?.plan !== undefined) {
      setBarbershop(prev => prev ? { ...prev, plan: account.plan as Barbershop['plan'] } : null)
    }
  }, [account?.plan, barbershop?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateBarbershop = useCallback(async (updates: Partial<Barbershop>) => {
    if (!barbershop) return
    const payload: Record<string, unknown> = {}
    if (updates.name !== undefined) payload.name = updates.name
    if (updates.tagline !== undefined) payload.tagline = updates.tagline
    if (updates.description !== undefined) payload.description = updates.description
    if (updates.phone !== undefined) payload.phone = updates.phone
    if (updates.whatsapp !== undefined) payload.whatsapp = updates.whatsapp
    if (updates.address !== undefined) payload.address = updates.address
    if (updates.city !== undefined) payload.city = updates.city
    if (updates.state !== undefined) payload.state = updates.state
    if (updates.instagram !== undefined) payload.instagram = updates.instagram
    if (updates.primaryColor !== undefined) payload.primary_color = updates.primaryColor
    if (updates.accentColor !== undefined) payload.accent_color = updates.accentColor
    if (updates.logoText !== undefined) payload.logo_text = updates.logoText
    if (updates.coverImage !== undefined) payload.cover_image = updates.coverImage
    if (updates.siteType !== undefined) payload.site_type = updates.siteType
    if (updates.customDomain !== undefined) payload.custom_domain = updates.customDomain
    if (updates.cancellationPolicy !== undefined) payload.cancellation_policy = updates.cancellationPolicy
    if (updates.clubPixKey !== undefined) payload.club_pix_key = updates.clubPixKey
    const row = await barbershopRepository.update(barbershop.id, payload as any)
    setBarbershop(mapBarbershop(row))
  }, [barbershop])

  const addClient = useCallback(async (input: {
    name: string
    phone: string
    email?: string
    membershipType: BarbershopClient['membershipType']
  }) => {
    if (!barbershop) throw new Error('Barbearia não carregada')
    const byName = (a: BarbershopClient, b: BarbershopClient) => a.name.localeCompare(b.name, 'pt-BR')

    // Modo demo: só estado local, sem tocar no banco
    if (isDemoMode()) {
      const demo: BarbershopClient = {
        id: `demo-client-${Date.now()}`,
        barbershopId: barbershop.id,
        name: input.name.trim(),
        phone: input.phone.trim(),
        email: input.email?.trim() || undefined,
        membershipType: input.membershipType,
        totalVisits: 0,
        lastVisit: '',
      }
      setClients(prev => [...prev, demo].sort(byName))
      return
    }

    const row = await clientRepository.upsertByPhone({
      barbershop_id: barbershop.id,
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || null,
      membership_type: input.membershipType,
    })
    const mapped = mapClient(row)
    // upsert por telefone: substitui se já existir, senão adiciona
    setClients(prev => [...prev.filter(c => c.id !== mapped.id), mapped].sort(byName))
  }, [barbershop])

  const updateClient = useCallback(async (id: string, input: {
    name?: string
    phone?: string
    email?: string
    membershipType?: BarbershopClient['membershipType']
    notes?: string
  }) => {
    const byName = (a: BarbershopClient, b: BarbershopClient) => a.name.localeCompare(b.name, 'pt-BR')

    // Modo demo: só estado local
    if (isDemoMode()) {
      setClients(prev => prev.map(c => c.id === id ? {
        ...c,
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.phone !== undefined ? { phone: input.phone.trim() } : {}),
        ...(input.email !== undefined ? { email: input.email.trim() || undefined } : {}),
        ...(input.membershipType !== undefined ? { membershipType: input.membershipType } : {}),
        ...(input.notes !== undefined ? { notes: input.notes.trim() || undefined } : {}),
      } : c).sort(byName))
      return
    }

    const payload: ClientUpdate = {}
    if (input.name !== undefined) payload.name = input.name.trim()
    if (input.phone !== undefined) payload.phone = input.phone.trim()
    if (input.email !== undefined) payload.email = input.email.trim() || null
    if (input.membershipType !== undefined) payload.membership_type = input.membershipType
    if (input.notes !== undefined) payload.notes = input.notes.trim() || null

    const row = await clientRepository.update(id, payload)
    const mapped = mapClient(row)
    setClients(prev => prev.map(c => c.id === id ? mapped : c).sort(byName))
  }, [])

  const updateServices = useCallback((next: BarbershopService[]) => setServices(next), [])
  const updateBarbers = useCallback((next: BarbershopBarber[]) => setBarbers(next), [])
  const updateMemberships = useCallback((next: BarbershopMembership[]) => setMemberships(next), [])

  const tenantUser: TenantUser | null = account
    ? {
        id: account.id,
        name: account.ownerName,
        email: account.email,
        membership: barbershop
          ? { userId: account.id, barbershopId: barbershop.id, role: 'owner', joinedAt: account.createdAt }
          : null,
      }
    : null

  const canAccess = (minRole: BarbershopRole) => ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole]

  return (
    <TenantContext.Provider value={{
      barbershop,
      services,
      barbers,
      memberships,
      appointments,
      clients,
      tenantUser,
      userRole,
      canAccess,
      updateBarbershop,
      addClient,
      updateClient,
      updateServices,
      updateBarbers,
      updateMemberships,
      isOwner: userRole === 'owner',
      isAdmin: ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY['admin'],
      isBarber: userRole === 'barber',
      isLoading,
    }}>
      {children}
    </TenantContext.Provider>
  )
}
