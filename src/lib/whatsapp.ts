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

/** Igual ao waUrl, mas telefone fora do padrão brasileiro segue como foi digitado
 *  (só dígitos) em vez de não gerar link. Usado no site da barbearia e nas cobranças. */
export function waLink(phone: string, message?: string): string {
  const n = waNumber(phone) ?? phone.replace(/\D/g, '')
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
  /** Link "meu horário" (só se a barbearia deixa mexer por ele). */
  manageUrl?: string
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
    b.manageUrl ? `Precisa remarcar ou cancelar? É por aqui: ${b.manageUrl}` : `Se precisar remarcar, é só responder aqui.`,
  ]
  return linhas.filter((l): l is string => l !== null).join('\n')
}

/** Pedido de avaliação no Google depois do atendimento. */
export function buildReviewRequest(clientName: string, shopName: string, url: string): string {
  const first = clientName.trim().split(/\s+/)[0] || ''
  return `Oi${first ? ` ${first}` : ''}! Valeu por vir na ${shopName} hoje. Se curtiu o corte, deixa uma avaliação pra gente no Google? Leva um minutinho e ajuda demais a barbearia: ${url}`
}

/** Pedido de avaliação no site da barbearia, pelo link do horário. */
export function buildOwnReviewRequest(clientName: string, shopName: string, url: string): string {
  const first = clientName.trim().split(/\s+/)[0] || ''
  return `Oi${first ? ` ${first}` : ''}! Valeu por vir na ${shopName}. Conta pra gente como foi? É só dar sua nota aqui: ${url}`
}

/** Aviso pra quem está na lista de espera. */
export function buildWaitlistNotice(clientName: string, shopName: string, dayLabel: string, times: string[]): string {
  const first = clientName.trim().split(/\s+/)[0] || ''
  const when = times.length ? ` às ${times.join(', ')}` : ''
  return `Oi${first ? ` ${first}` : ''}! Aqui é da ${shopName}. Abriu horário ${dayLabel}${when}. Quer? Me responde aqui que eu já deixo marcado pra você.`
}
