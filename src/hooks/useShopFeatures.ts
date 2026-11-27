import { useEffect, useState } from 'react'
import { featuresRepository } from '@/repositories/featuresRepository'
import { DEFAULT_FEATURES, type ShopFeatures } from '@/lib/extras'

/** Recursos ligados na barbearia. Se não carregar, os opcionais ficam escondidos. */
export function useShopFeatures(barbershopId: string | undefined) {
  const [features, setFeatures] = useState<ShopFeatures>(DEFAULT_FEATURES)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!barbershopId) return
    let alive = true
    featuresRepository.get(barbershopId)
      .then(f => { if (alive) { setFeatures(f); setLoaded(true); setFailed(false) } })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [barbershopId])

  const save = async (next: ShopFeatures) => {
    if (!barbershopId) return
    setFeatures(await featuresRepository.save(barbershopId, next))
  }
  return { features, loaded, failed, save }
}
