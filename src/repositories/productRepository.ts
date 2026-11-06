// Loja da barbearia: catálogo (products) e vendas no balcão (product_sales).
// RLS: equipe lê e registra venda; dono/admin mexe no catálogo e estorna.
// O estoque desce/volta por gatilho no banco — o app não faz conta de estoque.
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/database'

export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao'

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
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  unitCost: number | null
  total: number
  sellerName: string
  clientName: string | null
  paymentMethod: PaymentMethod | null
  createdAt: string
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

export interface SaleInput {
  productId: string
  quantity: number
  unitPrice: number
  sellerName: string
  clientName: string | null
  paymentMethod: PaymentMethod | null
}

const PAYMENTS: readonly string[] = ['dinheiro', 'pix', 'cartao']

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
  sellerName: r.seller_name,
  clientName: r.client_name,
  paymentMethod: r.payment_method && PAYMENTS.includes(r.payment_method) ? (r.payment_method as PaymentMethod) : null,
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

  async listSales(barbershopId: string, since: string): Promise<ProductSale[]> {
    const { data, error } = await supabase
      .from('product_sales')
      .select('*')
      .eq('barbershop_id', barbershopId)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw error
    return (data ?? []).map(mapSale)
  },

  async sell(barbershopId: string, input: SaleInput): Promise<ProductSale> {
    const { data, error } = await supabase
      .from('product_sales')
      .insert({
        barbershop_id: barbershopId,
        product_id: input.productId,
        product_name: '', // o banco grava o nome real do produto
        quantity: input.quantity,
        unit_price: input.unitPrice,
        seller_name: input.sellerName,
        client_name: input.clientName,
        payment_method: input.paymentMethod,
      })
      .select()
      .single()
    if (error) throw error
    return mapSale(data)
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

  async reverseSale(id: string): Promise<void> {
    const { error } = await supabase.from('product_sales').delete().eq('id', id)
    if (error) throw error
  },
}
