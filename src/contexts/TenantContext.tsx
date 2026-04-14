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
import type { ClientRow } from '@/repositories/clientRepository'
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
    plan: 'pro' as Barbershop['plan'], // resolvido via saas_account.plan
    active: row.active,
    siteType: row.site_type as Barbershop['siteType'],
    customDomain: row.custom_domain ?? '',
    embedKey: row.embed_key,
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

    const slug = account?.barbershopSlug
    if (!slug) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    barbershopRepository.getBySlug(slug).then(async (bs) => {
      if (!bs) { setIsLoading(false); return }
      setBarbershop(mapBarbershop(bs))

      const today = new Date().toISOString().split('T')[0]

      // Carrega dados da barbearia + role real do usuário logado em paralelo
      const { data: { session } } = await supabase.auth.getSession()

      Promise.all([
        serviceRepository.listByBarbershop(bs.id),
        teamRepository.listByBarbershop(bs.id),
        membershipRepository.listByBarbershop(bs.id),
        appointmentRepository.listByBarbershop(bs.id, today),
        clientRepository.listByBarbershop(bs.id),
        session ? teamRepository.getByUserAndBarbershop(session.user.id, bs.id) : Promise.resolve(null),
      ]).then(([svcs, team, mems, apts, cls, memberRow]) => {
        setServices(svcs.map(mapService))
        setBarbers(team.map(mapBarber))
        setMemberships(mems.map(mapMembership))
        setAppointments(apts.map(mapAppointment))
        setClients(cls.map(mapClient))
        // memberRow presente = barbeiro/admin/recepcionista. Ausente = owner (dono da conta SaaS)
        setUserRole(memberRow ? (memberRow.role as BarbershopRole) : 'owner')
      }).finally(() => setIsLoading(false))
    })
  }, [account?.barbershopSlug])

  // Injeta o plan real da conta SaaS no objeto barbershop (não é coluna do barbershops table)
  useEffect(() => {
    if (barbershop && account?.plan !== undefined) {
      setBarbershop(prev => prev ? { ...prev, plan: account.plan as Barbershop['plan'] } : null)
    }
  }, [account?.plan, barbershop?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateBarbershop = useCallback(async (updates: Partial<Barbershop>) => {
    if (!barbershop) return
    const row = await barbershopRepository.update(barbershop.id, {
      name: updates.name,
      tagline: updates.tagline,
      description: updates.description,
      phone: updates.phone,
      whatsapp: updates.whatsapp,
      address: updates.address,
      city: updates.city,
      state: updates.state,
      instagram: updates.instagram,
      primary_color: updates.primaryColor,
      accent_color: updates.accentColor,
      logo_text: updates.logoText,
      cover_image: updates.coverImage,
      site_type: updates.siteType,
      custom_domain: updates.customDomain,
    })
    setBarbershop(mapBarbershop(row))
  }, [barbershop])

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
