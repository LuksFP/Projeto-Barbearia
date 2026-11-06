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
  imageUrl: string | null
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
  imageUrl: string | null
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
  imageUrl: r.image_url,
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
  image_url: i.imageUrl,
  visible_on_site: i.visibleOnSite,
})

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

  async reverseSale(id: string): Promise<void> {
    const { error } = await supabase.from('product_sales').delete().eq('id', id)
    if (error) throw error
  },
}
