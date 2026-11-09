// Agendamentos criados durante a demo (site público ou Agenda do painel).
// Ficam no localStorage, por barbearia demo, pra que o horário marcado no site
// apareça na Agenda — inclusive em outra aba do mesmo navegador.
import type { BarbershopAppointment } from '@/types/tenant'

const KEY_PREFIX = '__barberos_demo_apts__:'
export const DEMO_BOOKINGS_EVENT = 'barberos:demo-bookings'

const key = (barbershopId: string) => `${KEY_PREFIX}${barbershopId}`

export function listDemoBookings(barbershopId: string): BarbershopAppointment[] {
  try {
    const raw = localStorage.getItem(key(barbershopId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as BarbershopAppointment[]) : []
  } catch {
    return []
  }
}

function save(barbershopId: string, list: BarbershopAppointment[]): void {
  try {
    localStorage.setItem(key(barbershopId), JSON.stringify(list))
  } catch {
    // modo privado / storage bloqueado: a demo segue, só não persiste
  }
  window.dispatchEvent(new Event(DEMO_BOOKINGS_EVENT))
}

export function addDemoBooking(apt: BarbershopAppointment): void {
  save(apt.barbershopId, [...listDemoBookings(apt.barbershopId), apt])
}

export function updateDemoBooking(barbershopId: string, id: string, patch: Partial<BarbershopAppointment>): void {
  const list = listDemoBookings(barbershopId)
  if (!list.some(a => a.id === id)) return
  save(barbershopId, list.map(a => (a.id === id ? { ...a, ...patch } : a)))
}

export function removeDemoBookings(barbershopId: string, ids: string[]): void {
  const list = listDemoBookings(barbershopId)
  const next = list.filter(a => !ids.includes(a.id))
  if (next.length !== list.length) save(barbershopId, next)
}

export function clearDemoBookings(barbershopId: string): void {
  try {
    localStorage.removeItem(key(barbershopId))
  } catch {
    // ignora
  }
}

/** Avisa quando a lista muda nesta aba ou em outra aba do mesmo navegador. */
export function onDemoBookingsChange(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key.startsWith(KEY_PREFIX)) cb()
  }
  window.addEventListener(DEMO_BOOKINGS_EVENT, cb)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(DEMO_BOOKINGS_EVENT, cb)
    window.removeEventListener('storage', onStorage)
  }
}
