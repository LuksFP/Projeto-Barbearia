import { useCallback, useEffect, useState } from 'react'
import { scheduleBlockRepository } from '@/repositories/scheduleBlockRepository'
import type { NewScheduleBlock, ScheduleBlock } from '@/lib/blocks'

/** Bloqueios da barbearia no painel. `failed` = não carregou (a agenda segue
 *  funcionando; quem segura o horário bloqueado é o banco). */
export function useScheduleBlocks(barbershopId: string | undefined) {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const reload = useCallback(async () => {
    if (!barbershopId) return
    try {
      setBlocks(await scheduleBlockRepository.list(barbershopId))
      setFailed(false)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [barbershopId])

  useEffect(() => { void reload() }, [reload])

  const add = async (block: NewScheduleBlock) => {
    await scheduleBlockRepository.create(block)
    await reload()
  }
  const remove = async (id: string) => {
    if (!barbershopId) return
    await scheduleBlockRepository.remove(barbershopId, id)
    await reload()
  }

  return { blocks, loading, failed, reload, add, remove }
}
