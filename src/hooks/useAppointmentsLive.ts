// Mantém telas do painel em dia com agendamentos feitos em OUTRO aparelho
// (cliente no site público, outro barbeiro). Duas fontes:
// - Supabase Realtime (postgres_changes, respeita RLS)
// - rebusca quando a aba volta ao foco / internet volta — cobre o celular que
//   dormiu e perdeu o websocket.
import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { isDemoMode } from '@/lib/demo'
import type { AppointmentRow } from '@/repositories/appointmentRepository'

export type AppointmentLiveEvent =
  | { type: 'INSERT' | 'UPDATE'; row: AppointmentRow }
  | { type: 'DELETE' }
  | { type: 'RESYNC' }

export function useAppointmentsLive(
  barbershopId: string | null | undefined,
  onEvent: (event: AppointmentLiveEvent) => void,
) {
  const handler = useRef(onEvent)
  handler.current = onEvent

  useEffect(() => {
    if (!barbershopId || isDemoMode()) return

    const channel = supabase
      .channel(`appointments:${barbershopId}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments', filter: `barbershop_id=eq.${barbershopId}` },
        payload => {
          if (payload.eventType === 'DELETE') handler.current({ type: 'DELETE' })
          else handler.current({ type: payload.eventType, row: payload.new as AppointmentRow })
        },
      )
      .subscribe()

    const resync = () => {
      if (document.visibilityState === 'visible') handler.current({ type: 'RESYNC' })
    }
    document.addEventListener('visibilitychange', resync)
    window.addEventListener('online', resync)

    return () => {
      document.removeEventListener('visibilitychange', resync)
      window.removeEventListener('online', resync)
      supabase.removeChannel(channel)
    }
  }, [barbershopId])
}
