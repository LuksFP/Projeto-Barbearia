// Estado das cobranças do Clube VIP (assinantes + PIX).
// Modo real: persiste no Supabase (club_subscribers + barbershops.club_pix_key).
// Modo demo: localStorage, semeando dados fictícios.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import { isDemoMode, getDemoPlan } from '@/lib/demo'
import { subscriberRepository, type SubscriberRow } from '@/repositories/subscriberRepository'
import {
  loadClubBilling, saveClubBilling, seedDemoSubscribers,
  computeBilling, markPaid as markPaidFn, revertPaid as revertPaidFn,
  type ClubSubscriber, type SubscriberBilling,
} from '@/lib/clubBilling'

export interface NewSubscriberInput {
  name: string
  phone: string
  membershipId: string
  billingDay: number
}

function mapRow(r: SubscriberRow): ClubSubscriber {
  return {
    id: r.id,
    barbershopId: r.barbershop_id,
    membershipId: r.membership_id ?? '',
    name: r.name,
    phone: r.phone,
    billingDay: r.billing_day,
    createdAt: r.created_at,
    paidUntil: r.paid_until,
    active: r.active,
  }
}

export function useClubBilling() {
  const { barbershop, memberships, updateBarbershop } = useTenant()
  const barbershopId = barbershop?.id ?? null
  const demo = isDemoMode()

  const [subscribers, setSubscribers] = useState<ClubSubscriber[]>([])
  const [pixKey, setPixKeyState] = useState('')
  const [ready, setReady] = useState(false)
  const loadedFor = useRef<string | null>(null)

  // ── Carregamento ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!barbershopId) return
    setReady(false)

    if (demo) {
      const stored = loadClubBilling(barbershopId)
      if (stored) {
        setSubscribers(stored.subscribers)
        setPixKeyState(stored.pixKey)
      } else {
        const plan = getDemoPlan()
        const subs = plan ? seedDemoSubscribers(plan, barbershopId, memberships) : []
        setSubscribers(subs)
        setPixKeyState(barbershop?.whatsapp ?? '')
        saveClubBilling(barbershopId, { pixKey: barbershop?.whatsapp ?? '', subscribers: subs })
      }
      setReady(true)
      return
    }

    // Modo real: busca do Supabase
    setPixKeyState(barbershop?.clubPixKey || barbershop?.whatsapp || '')
    subscriberRepository.listByBarbershop(barbershopId)
      .then(rows => { setSubscribers(rows.map(mapRow)); loadedFor.current = barbershopId })
      .catch(err => { console.error('Falha ao carregar assinantes:', err); setSubscribers([]) })
      .finally(() => setReady(true))
  }, [barbershopId, demo, memberships.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Persiste no localStorage (só demo)
  const persistDemo = useCallback((subs: ClubSubscriber[], pix: string) => {
    if (demo && barbershopId) saveClubBilling(barbershopId, { pixKey: pix, subscribers: subs })
  }, [demo, barbershopId])

  // ── Ações ─────────────────────────────────────────────────────────────────────
  const addSubscriber = useCallback(async (input: NewSubscriberInput) => {
    if (!barbershopId) return
    const base: ClubSubscriber = {
      id: `sub-${Date.now()}`,
      barbershopId,
      membershipId: input.membershipId,
      name: input.name.trim(),
      phone: input.phone.replace(/\D/g, ''),
      billingDay: Math.min(28, Math.max(1, input.billingDay)),
      createdAt: new Date().toISOString(),
      paidUntil: null,
      active: true,
    }

    if (demo) {
      setSubscribers(prev => { const next = [...prev, base]; persistDemo(next, pixKey); return next })
      return
    }

    const row = await subscriberRepository.create({
      barbershop_id: barbershopId,
      membership_id: input.membershipId || null,
      name: base.name,
      phone: base.phone,
      billing_day: base.billingDay,
    })
    setSubscribers(prev => [...prev, mapRow(row)])
  }, [barbershopId, demo, pixKey, persistDemo])

  const updateSubscriber = useCallback(async (id: string, patch: Partial<ClubSubscriber>) => {
    if (demo) {
      setSubscribers(prev => {
        const next = prev.map(s => s.id === id ? { ...s, ...patch } : s)
        persistDemo(next, pixKey)
        return next
      })
      return
    }
    const row = await subscriberRepository.update(id, {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      ...(patch.membershipId !== undefined ? { membership_id: patch.membershipId || null } : {}),
      ...(patch.billingDay !== undefined ? { billing_day: patch.billingDay } : {}),
      ...(patch.paidUntil !== undefined ? { paid_until: patch.paidUntil } : {}),
    })
    setSubscribers(prev => prev.map(s => s.id === id ? mapRow(row) : s))
  }, [demo, pixKey, persistDemo])

  const removeSubscriber = useCallback(async (id: string) => {
    if (demo) {
      setSubscribers(prev => { const next = prev.filter(s => s.id !== id); persistDemo(next, pixKey); return next })
      return
    }
    await subscriberRepository.remove(id)
    setSubscribers(prev => prev.filter(s => s.id !== id))
  }, [demo, pixKey, persistDemo])

  const applyPaid = useCallback(async (id: string, fn: (s: ClubSubscriber) => ClubSubscriber) => {
    const current = subscribers.find(s => s.id === id)
    if (!current) return
    const updated = fn(current)
    if (demo) {
      setSubscribers(prev => { const next = prev.map(s => s.id === id ? updated : s); persistDemo(next, pixKey); return next })
      return
    }
    const row = await subscriberRepository.update(id, { paid_until: updated.paidUntil })
    setSubscribers(prev => prev.map(s => s.id === id ? mapRow(row) : s))
  }, [subscribers, demo, pixKey, persistDemo])

  const markPaid = useCallback((id: string) => applyPaid(id, s => markPaidFn(s)), [applyPaid])
  const revertPaid = useCallback((id: string) => applyPaid(id, s => revertPaidFn(s)), [applyPaid])

  const setPixKey = useCallback(async (next: string) => {
    const val = next.trim()
    setPixKeyState(val)
    if (demo) {
      persistDemo(subscribers, val)
      return
    }
    try { await updateBarbershop({ clubPixKey: val }) }
    catch (err) { console.error('Falha ao salvar PIX:', err) }
  }, [demo, subscribers, persistDemo, updateBarbershop])

  // ── Derivações ────────────────────────────────────────────────────────────────
  const billings: SubscriberBilling[] = useMemo(() => {
    const now = new Date()
    const rank: Record<SubscriberBilling['status'], number> = { overdue: 0, today: 1, 'due-soon': 2, paid: 3 }
    return subscribers
      .map(s => computeBilling(s, memberships, now))
      .sort((a, b) => {
        if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status]
        return a.dueDate.getTime() - b.dueDate.getTime()
      })
  }, [subscribers, memberships])

  const summary = useMemo(() => {
    const overdue = billings.filter(b => b.status === 'overdue')
    const today = billings.filter(b => b.status === 'today')
    const dueSoon = billings.filter(b => b.status === 'due-soon' && b.daysUntil <= 7)
    const paidThisMonth = billings.filter(b => b.status === 'paid')
    const received = paidThisMonth.reduce((acc, b) => acc + b.amount, 0)
    const openAmount = billings.filter(b => b.status !== 'paid').reduce((acc, b) => acc + b.amount, 0)
    return {
      overdueCount: overdue.length,
      todayCount: today.length,
      dueSoonCount: dueSoon.length,
      paidCount: paidThisMonth.length,
      received,
      openAmount,
    }
  }, [billings])

  return {
    ready,
    pixKey,
    subscribers,
    billings,
    summary,
    addSubscriber,
    updateSubscriber,
    removeSubscriber,
    markPaid,
    revertPaid,
    setPixKey,
  }
}
