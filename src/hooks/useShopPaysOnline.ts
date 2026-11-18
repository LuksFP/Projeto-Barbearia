import { useEffect, useState } from 'react'
import { onlinePaymentRepository } from '@/repositories/onlinePaymentRepository'

/** A barbearia está recebendo online agora? (conectou e não pausou) */
export function useShopPaysOnline(barbershopId: string | undefined): boolean {
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!barbershopId) return
    let alive = true
    void onlinePaymentRepository.paysOnline(barbershopId).then(v => { if (alive) setOn(v) })
    return () => { alive = false }
  }, [barbershopId])
  return on
}
