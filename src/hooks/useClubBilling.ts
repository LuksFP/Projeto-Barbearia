// Estado das cobranças do Clube VIP (assinantes + PIX), persistido em localStorage.
// Usa o TenantContext pra saber a barbearia e os planos; semeia dados no modo demo.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import { isDemoMode, getDemoPlan } from '@/lib/demo'
import {
  loadClubBilling, saveClubBilling, seedDemoSubscribers,
  computeBilling, markPaid as markPaidFn, revertPaid as revertPaidFn,
  type ClubSubscriber, type ClubBillingState, type SubscriberBilling,
} from '@/lib/clubBilling'

export interface NewSubscriberInput {
  name: string
  phone: string
  membershipId: string
  billingDay: number
}

export function useClubBilling() {
  const { barbershop, memberships } = useTenant()
  const barbershopId = barbershop?.id ?? null

  const [state, setState] = useState<ClubBillingState>({ pixKey: '', subscribers: [] })
  const [ready, setReady] = useState(false)

  // Carrega do storage; se demo e vazio, semeia
  useEffect(() => {
    if (!barbershopId) return
    setReady(false)
    const stored = loadClubBilling(barbershopId)
    if (stored) {
      setState(stored)
      setReady(true)
      return
    }
    if (isDemoMode()) {
      const plan = getDemoPlan()
      const subs = plan ? seedDemoSubscribers(plan, barbershopId, memberships) : []
      const seeded: ClubBillingState = { pixKey: barbershop?.whatsapp ?? '', subscribers: subs }
      setState(seeded)
      saveClubBilling(barbershopId, seeded)
      setReady(true)
      return
    }
    setState({ pixKey: barbershop?.whatsapp ?? '', subscribers: [] })
    setReady(true)
  }, [barbershopId, memberships.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback((next: ClubBillingState) => {
    setState(next)
    if (barbershopId) saveClubBilling(barbershopId, next)
  }, [barbershopId])

  const addSubscriber = useCallback((input: NewSubscriberInput) => {
    if (!barbershopId) return
    const sub: ClubSubscriber = {
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
    setState(prev => {
      const next = { ...prev, subscribers: [...prev.subscribers, sub] }
      if (barbershopId) saveClubBilling(barbershopId, next)
      return next
    })
  }, [barbershopId])

  const updateSubscriber = useCallback((id: string, patch: Partial<ClubSubscriber>) => {
    setState(prev => {
      const next = { ...prev, subscribers: prev.subscribers.map(s => s.id === id ? { ...s, ...patch } : s) }
      if (barbershopId) saveClubBilling(barbershopId, next)
      return next
    })
  }, [barbershopId])

  const removeSubscriber = useCallback((id: string) => {
    setState(prev => {
      const next = { ...prev, subscribers: prev.subscribers.filter(s => s.id !== id) }
      if (barbershopId) saveClubBilling(barbershopId, next)
      return next
    })
  }, [barbershopId])

  const markPaid = useCallback((id: string) => {
    setState(prev => {
      const next = { ...prev, subscribers: prev.subscribers.map(s => s.id === id ? markPaidFn(s) : s) }
      if (barbershopId) saveClubBilling(barbershopId, next)
      return next
    })
  }, [barbershopId])

  const revertPaid = useCallback((id: string) => {
    setState(prev => {
      const next = { ...prev, subscribers: prev.subscribers.map(s => s.id === id ? revertPaidFn(s) : s) }
      if (barbershopId) saveClubBilling(barbershopId, next)
      return next
    })
  }, [barbershopId])

  const setPixKey = useCallback((pixKey: string) => {
    persist({ ...state, pixKey })
  }, [persist, state])

  // Cobranças calculadas + ordenadas por urgência (atrasado → vence hoje → a vencer → em dia)
  const billings: SubscriberBilling[] = useMemo(() => {
    const now = new Date()
    const rank: Record<SubscriberBilling['status'], number> = {
      overdue: 0, today: 1, 'due-soon': 2, paid: 3,
    }
    return state.subscribers
      .map(s => computeBilling(s, memberships, now))
      .sort((a, b) => {
        if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status]
        return a.dueDate.getTime() - b.dueDate.getTime()
      })
  }, [state.subscribers, memberships])

  const summary = useMemo(() => {
    const overdue = billings.filter(b => b.status === 'overdue')
    const today = billings.filter(b => b.status === 'today')
    const dueSoon = billings.filter(b => b.status === 'due-soon' && b.daysUntil <= 7)
    const paidThisMonth = billings.filter(b => b.status === 'paid')
    const received = paidThisMonth.reduce((acc, b) => acc + b.amount, 0)
    const openAmount = [...overdue, ...today, ...billings.filter(b => b.status === 'due-soon')]
      .reduce((acc, b) => acc + b.amount, 0)
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
    pixKey: state.pixKey,
    subscribers: state.subscribers,
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
