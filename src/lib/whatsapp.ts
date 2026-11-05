// Links de WhatsApp (wa.me) a partir de telefone digitado livre.
// Sem API paga: abre a conversa com a mensagem pronta e o barbeiro só toca em enviar.

/** Número no formato do wa.me (só dígitos, com DDI). null se não dá pra montar. */
export function waNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, '').replace(/^0+/, '')
  // 10–11 dígitos = DDD + número brasileiro (DDD 55 existe, então não dá pra
  // olhar só o começo); 12–13 começando com 55 = já veio com o DDI.
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) return digits
  return null
}

export function waUrl(phone: string, message?: string): string | null {
  const n = waNumber(phone)
  if (!n) return null
  return message ? `https://wa.me/${n}?text=${encodeURIComponent(message)}` : `https://wa.me/${n}`
}

interface BookingMessage {
  clientName: string
  shopName: string
  date: string // YYYY-MM-DD
  time: string // HH:MM
  serviceLabel: string
  barberName?: string
  price?: number
  address?: string
}

/** Mensagem de confirmação de horário marcado pelo painel. */
export function buildBookingConfirmation(b: BookingMessage): string {
  const first = b.clientName.trim().split(/\s+/)[0] || b.clientName.trim()
  const dia = new Date(b.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })
  const linhas = [
    `Olá, ${first}! Seu horário na ${b.shopName} está confirmado ✅`,
    ``,
    `📅 ${dia.charAt(0).toUpperCase() + dia.slice(1)} às ${b.time.slice(0, 5)}`,
    `✂️ ${b.serviceLabel}${b.barberName && b.barberName !== 'A definir' ? ` com ${b.barberName}` : ''}`,
    b.price && b.price > 0 ? `💰 ${b.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : null,
    b.address?.trim() ? `📍 ${b.address.trim()}` : null,
    ``,
    `Se precisar remarcar, é só responder aqui.`,
  ]
  return linhas.filter((l): l is string => l !== null).join('\n')
}
