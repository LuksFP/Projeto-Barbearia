// Pedidos da loja que vieram do site do cliente, agrupados por pedido.
// Reservado → "Retirou" (pagou na barbearia) ou "Cancelar" (estoque volta).
// Retirado ainda pode ser cancelado (devolução).
import { useState } from 'react'
import { MessageCircle, CalendarCheck } from 'lucide-react'
import { waUrl } from '@/lib/whatsapp'
import type { OrderStatus, ProductSale } from '@/repositories/productRepository'

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const when = (iso: string) => {
  const d = new Date(iso)
  const sameDay = d.toDateString() === new Date().toDateString()
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return sameDay ? `hoje ${time}` : `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${time}`
}

const STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  reservado: { label: 'Pra retirar', cls: 'text-amber-300 border-amber-500/40 bg-amber-500/10' },
  retirado: { label: 'Retirado', cls: 'text-emerald-300 border-emerald-500/30' },
  cancelado: { label: 'Cancelado', cls: 'text-white/35 border-white/10 line-through' },
}

interface Order {
  orderId: string
  clientName: string
  clientPhone: string
  withBooking: boolean
  createdAt: string
  status: OrderStatus
  lines: ProductSale[]
  total: number
}

export function groupOrders(sales: ProductSale[]): Order[] {
  const map = new Map<string, ProductSale[]>()
  for (const s of sales) map.set(s.orderId, [...(map.get(s.orderId) ?? []), s])
  return [...map.entries()].map(([orderId, lines]) => {
    // Status do pedido: reservado se sobrou item reservado; senão retirado se teve retirada
    const status: OrderStatus = lines.some(l => l.status === 'reservado') ? 'reservado'
      : lines.some(l => l.status === 'retirado') ? 'retirado' : 'cancelado'
    return {
      orderId,
      clientName: lines[0].clientName,
      clientPhone: lines[0].clientPhone,
      withBooking: lines.some(l => l.appointmentId),
      createdAt: lines[0].createdAt,
      status,
      lines,
      total: lines.filter(l => l.status !== 'cancelado').reduce((a, l) => a + l.total, 0),
    }
  }).sort((a, b) => Number(b.status === 'reservado') - Number(a.status === 'reservado') || b.createdAt.localeCompare(a.createdAt))
}

interface Props {
  orders: Order[]
  onStatus: (orderId: string, status: 'retirado' | 'cancelado') => Promise<void>
}

const OrdersList = ({ orders, onStatus }: Props) => {
  const [confirming, setConfirming] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const act = async (o: Order, status: 'retirado' | 'cancelado') => {
    if (status === 'cancelado' && confirming !== o.orderId) { setConfirming(o.orderId); return }
    setBusy(o.orderId)
    try { await onStatus(o.orderId, status) } finally { setBusy(null); setConfirming(null) }
  }

  return (
    <ol className="divide-y divide-[#1c1c1c] border-y border-[#1c1c1c]">
      {orders.map(o => {
        const st = STATUS[o.status]
        const wa = waUrl(o.clientPhone, `Oi ${o.clientName.split(' ')[0]}! Sua reserva de ${o.lines.map(l => l.productName).join(', ')} está separada aqui na barbearia.`)
        return (
          <li key={o.orderId} className={`py-4 ${o.status === 'cancelado' ? 'opacity-60' : ''}`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-white text-sm font-body font-medium">{o.clientName}</p>
              <span className={`text-[11px] px-1.5 py-0.5 rounded border font-body ${st.cls}`}>{st.label}</span>
              {o.withBooking && (
                <span className="flex items-center gap-1 text-[11px] text-white/45 font-body">
                  <CalendarCheck className="w-3.5 h-3.5" />junto com horário
                </span>
              )}
              <span className="text-white/30 text-xs font-body tabular-nums ml-auto">{when(o.createdAt)}</span>
            </div>
            <ul className="mt-1.5 text-sm font-body text-white/65">
              {o.lines.map(l => (
                <li key={l.id} className={`flex gap-2 ${l.status === 'cancelado' ? 'line-through text-white/30' : ''}`}>
                  <span className="min-w-0 flex-1 break-words">{l.quantity}× {l.productName}</span>
                  <span className="tabular-nums shrink-0">{brl(l.total)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="text-white text-sm font-body font-semibold tabular-nums mr-auto">{brl(o.total)}</span>
              {wa && o.status === 'reservado' && (
                <a href={wa} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-body border border-[#2a2a2a] text-white/55 hover:text-white">
                  <MessageCircle className="w-3.5 h-3.5" />WhatsApp
                </a>
              )}
              {o.status !== 'cancelado' && (
                <button type="button" disabled={busy === o.orderId} onClick={() => void act(o, 'cancelado')} onBlur={() => setConfirming(c => (c === o.orderId ? null : c))}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-body border transition-colors ${confirming === o.orderId ? 'border-red-500/50 bg-red-500/10 text-red-300' : 'border-[#2a2a2a] text-white/50 hover:text-red-300'}`}>
                  {confirming === o.orderId ? 'Toque de novo: volta pro estoque' : o.status === 'retirado' ? 'Devolução' : 'Cancelar'}
                </button>
              )}
              {o.status === 'reservado' && (
                <button type="button" disabled={busy === o.orderId} onClick={() => void act(o, 'retirado')}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold font-body bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-50">
                  Retirou
                </button>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export default OrdersList
