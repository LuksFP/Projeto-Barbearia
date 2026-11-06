// Loja no site do cliente (anon). Só RPC: o cliente não lê nem grava tabela.
//   vitrine → public_barbershop_products (só o que a barbearia marcou pro site)
//   pedido  → public_place_product_order (tudo ou nada; baixa o estoque no banco)
import { supabasePublic } from '@/lib/supabase-public'
import type { OrderItem } from '@/repositories/productRepository'

export interface PublicProduct {
  id: string
  name: string
  description: string
  category: string
  price: number
  imageUrls: string[]
  available: number   // até 10; 0 = esgotado
}

export interface PlaceOrderInput {
  barbershopId: string
  items: OrderItem[]
  clientName: string
  clientPhone: string
  appointmentId?: string
}

export const publicStoreRepository = {
  async list(barbershopId: string): Promise<PublicProduct[]> {
    const { data, error } = await supabasePublic.rpc('public_barbershop_products', { p_barbershop_id: barbershopId })
    if (error) throw error
    return (data ?? []).map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category,
      price: Number(r.price),
      imageUrls: r.image_urls ?? [],
      available: r.available,
    }))
  },

  async placeOrder(input: PlaceOrderInput): Promise<string> {
    const { data, error } = await supabasePublic.rpc('public_place_product_order', {
      p_barbershop_id: input.barbershopId,
      p_items: input.items.map(i => ({ product_id: i.productId, quantity: i.quantity })),
      p_client_name: input.clientName,
      p_client_phone: input.clientPhone,
      ...(input.appointmentId ? { p_appointment_id: input.appointmentId } : {}),
    })
    if (error) throw error
    return data
  },
}

/** Mensagens do banco que fazem sentido pro cliente; o resto vira genérica. */
export function orderErrorMessage(err: unknown): string {
  const msg = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : ''
  if (/Sem estoque suficiente|Produto indisponível|Muitas reservas|Telefone inválido|Informe seu nome|Escolha de 1 a 10/.test(msg)) return msg
  return 'Não deu pra reservar agora. Tente de novo em instantes.'
}
