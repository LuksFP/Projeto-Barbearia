// Agendamentos criados durante a demo (site público ou Agenda do painel).
// Ficam no localStorage, por barbearia demo, pra que o horário marcado no site
// apareça na Agenda — inclusive em outra aba do mesmo navegador.
// Não zera ao entrar no painel (quem marca no site e depois abre a demo perderia
// o horário); some sozinho depois de algumas horas ou ao sair do painel.
import type { BarbershopAppointment } from '@/types/tenant'

const KEY_PREFIX = '__barberos_demo_apts__:'
export const DEMO_BOOKINGS_EVENT = 'barberos:demo-bookings'
const TTL_MS = 6 * 60 * 60 * 1000

type Stored = BarbershopAppointment & { savedAt?: number }

const key = (barbershopId: string) => `${KEY_PREFIX}${barbershopId}`

export function listDemoBookings(barbershopId: string): BarbershopAppointment[] {
  try {
    const raw = localStorage.getItem(key(barbershopId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const cutoff = Date.now() - TTL_MS
    return (parsed as Stored[]).filter(a => typeof a.savedAt === 'number' && a.savedAt > cutoff)
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
  const stored: Stored = { ...apt, savedAt: Date.now() }
  save(apt.barbershopId, [...listDemoBookings(apt.barbershopId), stored])
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

/** Apaga os horários de todas as barbearias demo (ao sair do painel). */
export function clearAllDemoBookings(): void {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith(KEY_PREFIX))
      .forEach(k => localStorage.removeItem(k))
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
