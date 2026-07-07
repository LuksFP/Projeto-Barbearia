// Lembretes de agendamento: próximos horários (hoje + amanhã), confirmar/faltou,
// e marcação de "já lembrei". Modo real busca do Supabase; demo gera dados.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import { mapAppointment } from '@/contexts/TenantContext'
import { isDemoMode } from '@/lib/demo'
import { appointmentRepository } from '@/repositories/appointmentRepository'
import {
  ymd, dayOffset, generateDemoUpcoming, loadReminded, toggleReminded,
} from '@/lib/reminders'
import type { BarbershopAppointment } from '@/types/tenant'

export function useReminders() {
  const { barbershop, barbers, services } = useTenant()
  const bsId = barbershop?.id ?? null
  const demo = isDemoMode()

  const [appts, setAppts] = useState<BarbershopAppointment[]>([])
  const [reminded, setReminded] = useState<string[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!bsId) return
    setReminded(loadReminded(bsId))
    setReady(false)

    if (demo) {
      setAppts(generateDemoUpcoming(bsId, barbers, services))
      setReady(true)
      return
    }
    appointmentRepository.listByBarbershop(bsId, ymd(new Date()))
      .then(rows => setAppts(rows.map(mapAppointment)))
      .catch(err => { console.error('Falha ao carregar agendamentos:', err); setAppts([]) })
      .finally(() => setReady(true))
  }, [bsId, demo, barbers.length, services.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Próximos: hoje + amanhã, ainda em aberto (pending/confirmed)
  const upcoming = useMemo(() =>
    appts
      .filter(a => (a.status === 'pending' || a.status === 'confirmed') && [0, 1].includes(dayOffset(a.date)))
      .sort((a, b) => a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date))
  , [appts])

  const todayList = useMemo(() => upcoming.filter(a => dayOffset(a.date) === 0), [upcoming])
  const tomorrowList = useMemo(() => upcoming.filter(a => dayOffset(a.date) === 1), [upcoming])
  const pendingCount = useMemo(() => upcoming.filter(a => a.status === 'pending').length, [upcoming])
  const remindedTodayCount = useMemo(
    () => todayList.filter(a => reminded.includes(a.id)).length,
    [todayList, reminded],
  )

  const setStatus = useCallback(async (id: string, status: BarbershopAppointment['status']) => {
    if (demo) {
      setAppts(prev => prev.map(a => a.id === id ? { ...a, status } : a))
      return
    }
    try {
      const row = await appointmentRepository.updateStatus(id, status)
      setAppts(prev => prev.map(a => a.id === id ? mapAppointment(row) : a))
    } catch (err) {
      console.error('Falha ao atualizar status:', err)
    }
  }, [demo])

  const markReminded = useCallback((id: string) => {
    if (!bsId) return
    setReminded(toggleReminded(bsId, id))
  }, [bsId])

  return {
    ready,
    upcoming,
    todayList,
    tomorrowList,
    pendingCount,
    remindedTodayCount,
    reminded,
    setStatus,
    markReminded,
  }
}
