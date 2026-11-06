// Loja da barbearia: catálogo (products) e pedidos (product_sales, um item por linha).
// A venda nasce no site do cliente (RPC public_place_product_order); no painel
// a equipe só marca retirado/cancelado. dono/admin mexe no catálogo.
// O estoque desce/volta por gatilho no banco — o app não faz conta de estoque.
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export type OrderStatus = 'reservado' | 'retirado' | 'cancelado'

export interface Product {
  id: string
  barbershopId: string
  name: string
  description: string
  category: string
  price: number
  cost: number | null
  stock: number
  lowStockAt: number
  imageUrls: string[]          // até 4; a primeira é a capa
  visibleOnSite: boolean
  active: boolean
}

export interface ProductSale {
  id: string
  orderId: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  unitCost: number | null
  total: number
  clientName: string
  clientPhone: string
  appointmentId: string | null
  status: OrderStatus
  createdAt: string
}

/** Item de pedido no site do cliente */
export interface OrderItem {
  productId: string
  quantity: number
}

export interface ProductInput {
  name: string
  description: string
  category: string
  price: number
  cost: number | null
  stock: number
  lowStockAt: number
  imageUrls: string[]          // até 4; a primeira é a capa
  visibleOnSite: boolean
}

const STATUSES: readonly string[] = ['reservado', 'retirado', 'cancelado']

export const mapProduct = (r: Tables<'products'>): Product => ({
  id: r.id,
  barbershopId: r.barbershop_id,
  name: r.name,
  description: r.description,
  category: r.category,
  price: Number(r.price),
  cost: r.cost === null ? null : Number(r.cost),
  stock: r.stock,
  lowStockAt: r.low_stock_at,
  imageUrls: r.image_urls ?? [],
  visibleOnSite: r.visible_on_site,
  active: r.active,
})

export const mapSale = (r: Tables<'product_sales'>): ProductSale => ({
  id: r.id,
  productId: r.product_id,
  productName: r.product_name,
  quantity: r.quantity,
  unitPrice: Number(r.unit_price),
  unitCost: r.unit_cost === null ? null : Number(r.unit_cost),
  total: Number(r.total),
  orderId: r.order_id,
  clientName: r.client_name,
  clientPhone: r.client_phone,
  appointmentId: r.appointment_id,
  status: STATUSES.includes(r.status) ? (r.status as OrderStatus) : 'reservado',
  createdAt: r.created_at,
})

const toRow = (i: ProductInput) => ({
  name: i.name,
  description: i.description,
  category: i.category,
  price: i.price,
  cost: i.cost,
  stock: i.stock,
  low_stock_at: i.lowStockAt,
  image_urls: i.imageUrls,
  visible_on_site: i.visibleOnSite,
})

export interface StoreMonth {
  month: string      // 'YYYY-MM'
  revenue: number
  profit: number
  items: number
  hasCost: boolean   // alguma venda do mês tinha custo (lucro só faz sentido assim)
}

export const productRepository = {
  async list(barbershopId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .eq('active', true)
      .order('name')
    if (error) throw error
    return (data ?? []).map(mapProduct)
  },

  async create(barbershopId: string, input: ProductInput): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert({ barbershop_id: barbershopId, ...toRow(input) })
      .select()
      .single()
    if (error) throw error
    return mapProduct(data)
  },

  async update(id: string, input: ProductInput): Promise<Product> {
    const { data, error } = await supabase.from('products').update(toRow(input)).eq('id', id).select().single()
    if (error) throw error
    return mapProduct(data)
  },

  /** Exclui de vez. Produto que já vendeu não pode (o histórico aponta pra ele):
   *  nesse caso arquiva e devolve 'archived'. */
  async remove(id: string): Promise<'deleted' | 'archived'> {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (!error) return 'deleted'
    // 23001 = RESTRICT da FK de product_sales (23503 se um dia virar NO ACTION)
    if (error.code === '23001' || error.code === '23503') {
      await this.archive(id)
      return 'archived'
    }
    throw error
  },

  async archive(id: string): Promise<void> {
    const { error } = await supabase.from('products').update({ active: false }).eq('id', id)
    if (error) throw error
  },

  /** Itens do mês + qualquer reserva ainda em aberto (mesmo de meses atrás). */
  async listSales(barbershopId: string, since: string): Promise<ProductSale[]> {
    const { data, error } = await supabase
      .from('product_sales')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .or(`created_at.gte.${since},status.eq.reservado`)
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw error
    return (data ?? []).map(mapSale)
  },

  /** Retirou: reservados viram retirados. Cancelar: tudo que não foi cancelado
   *  volta pro estoque (o gatilho devolve). */
  async setOrderStatus(orderId: string, status: 'retirado' | 'cancelado'): Promise<void> {
    const q = supabase.from('product_sales').update({ status }).eq('order_id', orderId)
    const { error } = status === 'retirado' ? await q.eq('status', 'reservado') : await q.neq('status', 'cancelado')
    if (error) throw error
  },

  /** Totais da loja por mês desde `from` ('YYYY-MM-DD'), somados no banco. */
  async salesByMonth(barbershopId: string, from: string): Promise<StoreMonth[]> {
    const { data, error } = await supabase.rpc('product_sales_by_month', { p_barbershop_id: barbershopId, p_from: from })
    if (error) throw error
    return (data ?? []).map(r => ({
      month: r.month,
      revenue: Number(r.revenue) || 0,
      profit: Number(r.profit) || 0,
      items: Number(r.items) || 0,
      hasCost: !!r.has_cost,
    }))
  },
}
