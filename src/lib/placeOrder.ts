// Pedido da loja feito no site do cliente. Barbearia demo (id não é uuid)
// grava no navegador com as mesmas regras; real vai pela RPC do banco.
import { publicStoreRepository } from '@/repositories/publicStoreRepository'
import { demoPlaceOrder } from '@/hooks/useProducts'
import type { OrderItem } from '@/repositories/productRepository'

export const isRealBarbershopId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id)

export async function placeOrder(barbershopId: string, input: {
  items: OrderItem[]
  clientName: string
  clientPhone: string
  appointmentId?: string
}): Promise<string> {
  if (!isRealBarbershopId(barbershopId)) {
    return demoPlaceOrder(barbershopId, { ...input, withBooking: !!input.appointmentId })
  }
  return publicStoreRepository.placeOrder({ barbershopId, ...input })
}
