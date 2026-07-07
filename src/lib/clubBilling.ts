// Cobranças do Clube VIP — assinantes individuais, dias de vencimento,
// cobrança PIX (WhatsApp) e boleto visual (impressão). SEM gateway de pagamento:
// tudo é controle manual + documentos gerados localmente. Persistência em localStorage.
import type { DemoPlan } from '@/lib/demo'
import type { Barbershop, BarbershopMembership } from '@/types/tenant'

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface ClubSubscriber {
  id: string
  barbershopId: string
  membershipId: string
  name: string
  phone: string          // só dígitos, com DDI: ex '5511999998888'
  billingDay: number     // dia do vencimento (1-28)
  createdAt: string       // ISO
  paidUntil: string | null // 'YYYY-MM' da última competência QUITADA (null = nada pago)
  active: boolean
}

export interface ClubBillingState {
  pixKey: string
  subscribers: ClubSubscriber[]
}

export type BillingStatus = 'paid' | 'due-soon' | 'today' | 'overdue'

export interface SubscriberBilling {
  sub: ClubSubscriber
  membership: BarbershopMembership | null
  openMonth: string        // competência em aberto ('YYYY-MM')
  dueDate: Date            // vencimento da competência em aberto
  status: BillingStatus
  daysLate: number         // >0 só quando 'overdue'
  daysUntil: number        // dias até vencer (>=0) quando 'due-soon'/'today'
  amount: number
}

// ─── Persistência ────────────────────────────────────────────────────────────

const KEY = (barbershopId: string) => `barberos:club-billing:${barbershopId}`

export function loadClubBilling(barbershopId: string): ClubBillingState | null {
  try {
    const raw = localStorage.getItem(KEY(barbershopId))
    if (!raw) return null
    return JSON.parse(raw) as ClubBillingState
  } catch {
    return null
  }
}

export function saveClubBilling(barbershopId: string, state: ClubBillingState): void {
  try {
    localStorage.setItem(KEY(barbershopId), JSON.stringify(state))
  } catch {
    /* storage cheio / indisponível — ignora */
  }
}

// ─── Datas ────────────────────────────────────────────────────────────────────

export function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function daysInMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate() // month1 é 1-based
}

function addMonthsYm(ymStr: string, n: number): string {
  const [y, m] = ymStr.split('-').map(Number)
  return ym(new Date(y, m - 1 + n, 1))
}

/** Vencimento real: clampa o dia ao último dia do mês (ex: dia 30 em fevereiro). */
function dueDateOf(ymStr: string, billingDay: number): Date {
  const [y, m] = ymStr.split('-').map(Number)
  const day = Math.min(billingDay, daysInMonth(y, m))
  return new Date(y, m - 1, day)
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function diffDays(a: Date, b: Date): number {
  const MS = 86_400_000
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / MS)
}

// ─── Cálculo de cobrança ───────────────────────────────────────────────────────

export function computeBilling(
  sub: ClubSubscriber,
  memberships: BarbershopMembership[],
  now: Date = new Date(),
): SubscriberBilling {
  const membership = memberships.find(m => m.id === sub.membershipId) ?? null
  const currentMonth = ym(now)

  // competência em aberto = mês seguinte ao último pago, ou o mês atual se nada foi pago
  const openMonth = sub.paidUntil ? addMonthsYm(sub.paidUntil, 1) : currentMonth
  const dueDate = dueDateOf(openMonth, sub.billingDay)

  let status: BillingStatus
  let daysLate = 0
  let daysUntil = 0

  if (openMonth > currentMonth) {
    // já pagou o mês atual (competência em aberto é futura) → em dia
    status = 'paid'
    daysUntil = diffDays(dueDate, now)
  } else {
    const delta = diffDays(dueDate, now) // dueDate - hoje
    if (delta > 0) { status = 'due-soon'; daysUntil = delta }
    else if (delta === 0) { status = 'today'; daysUntil = 0 }
    else { status = 'overdue'; daysLate = -delta }
  }

  return {
    sub,
    membership,
    openMonth,
    dueDate,
    status,
    daysLate,
    daysUntil,
    amount: membership?.price ?? 0,
  }
}

const MONTH_LABELS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

export function competenceLabel(ymStr: string): string {
  const [y, m] = ymStr.split('-').map(Number)
  return `${MONTH_LABELS[m - 1]}/${y}`
}

export function formatDueDate(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Avança paidUntil para a competência em aberto (marca a mensalidade como paga). */
export function markPaid(sub: ClubSubscriber, now: Date = new Date()): ClubSubscriber {
  const currentMonth = ym(now)
  const openMonth = sub.paidUntil ? addMonthsYm(sub.paidUntil, 1) : currentMonth
  return { ...sub, paidUntil: openMonth }
}

/** Desfaz o último pagamento (volta uma competência). */
export function revertPaid(sub: ClubSubscriber): ClubSubscriber {
  if (!sub.paidUntil) return sub
  return { ...sub, paidUntil: addMonthsYm(sub.paidUntil, -1) }
}

// ─── Cobrança PIX (WhatsApp) ───────────────────────────────────────────────────

export function buildPixMessage(b: SubscriberBilling, barbershop: Barbershop, pixKey: string): string {
  const first = b.sub.name.trim().split(/\s+/)[0]
  const plan = b.membership?.name ?? 'Clube VIP'
  const venc = formatDueDate(b.dueDate)
  const valor = formatBRL(b.amount)
  const key = pixKey.trim() || barbershop.whatsapp || ''

  const linhas = [
    `Olá, ${first}! 💈`,
    ``,
    `Passando pra lembrar da sua mensalidade *${plan}* (${competenceLabel(b.openMonth)}) na ${barbershop.name}.`,
    ``,
    `📅 Vencimento: ${venc}`,
    `💰 Valor: ${valor}`,
    key ? `🔑 PIX: ${key}` : ``,
    ``,
    `Assim que pagar, é só mandar o comprovante por aqui. Obrigado! 🙏`,
  ].filter(l => l !== null)

  return linhas.join('\n')
}

export function buildWhatsappUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

// ─── Boleto visual (impressão) ─────────────────────────────────────────────────

// Linha digitável FAKE, determinística — não é bancável, é só visual/controle interno.
function pseudoDigits(seed: string, len: number): string {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  let out = ''
  while (out.length < len) {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5
    out += Math.abs(h % 100000000).toString().padStart(8, '0')
  }
  return out.slice(0, len)
}

export function fakeDigitLine(b: SubscriberBilling): string {
  const cents = Math.round(b.amount * 100).toString().padStart(10, '0')
  const seed = `${b.sub.id}:${b.openMonth}:${cents}`
  const d = pseudoDigits(seed, 37) + cents.slice(-0) // 37 + valor implícito abaixo
  const raw = (d + cents).slice(0, 47)
  // agrupa no formato 00000.00000 00000.000000 00000.000000 0 00000000000000
  return [
    `${raw.slice(0, 5)}.${raw.slice(5, 10)}`,
    `${raw.slice(10, 15)}.${raw.slice(15, 21)}`,
    `${raw.slice(21, 26)}.${raw.slice(26, 32)}`,
    `${raw.slice(32, 33)}`,
    `${raw.slice(33, 47)}`,
  ].join(' ')
}

export function openBoletoPrint(b: SubscriberBilling, barbershop: Barbershop): void {
  const w = window.open('', '_blank', 'width=840,height=1000')
  if (!w) return

  const linha = fakeDigitLine(b)
  const venc = formatDueDate(b.dueDate)
  const valor = formatBRL(b.amount)
  const plan = b.membership?.name ?? 'Clube VIP'
  const accent = barbershop.primaryColor || '#C9A84C'
  const emitido = new Date().toLocaleDateString('pt-BR')

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Boleto ${b.sub.name} — ${plan}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; margin: 0; padding: 32px; color: #111; background: #f4f4f5; }
  .doc { max-width: 720px; margin: 0 auto; background: #fff; border: 1px solid #ddd; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 24px; border-bottom: 3px solid ${accent}; }
  .head .shop { font-size: 20px; font-weight: 800; letter-spacing: .5px; }
  .head .sub { font-size: 12px; color: #666; margin-top: 2px; }
  .head .tag { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: ${accent}; font-weight: 700; }
  .linha { padding: 14px 24px; border-bottom: 1px dashed #ccc; }
  .linha .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; }
  .linha .val { font-family: 'Courier New', monospace; font-size: 16px; font-weight: 700; margin-top: 4px; letter-spacing: .5px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; }
  .cell { padding: 14px 24px; border-bottom: 1px solid #eee; border-right: 1px solid #eee; }
  .cell:nth-child(even) { border-right: none; }
  .cell .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; }
  .cell .v { font-size: 15px; font-weight: 600; margin-top: 4px; }
  .cell .v.big { font-size: 22px; color: ${accent}; }
  .barcode { display: flex; gap: 1px; padding: 24px; align-items: flex-end; height: 90px; }
  .barcode i { display: block; background: #111; width: 2px; height: 100%; }
  .foot { padding: 14px 24px; font-size: 11px; color: #999; text-align: center; border-top: 1px dashed #ccc; }
  .warn { padding: 10px 24px; font-size: 11px; color: #a15c00; background: #fff7e6; }
  .actions { max-width: 720px; margin: 16px auto 0; text-align: right; }
  button { font: inherit; font-weight: 700; padding: 10px 18px; border: none; border-radius: 8px; background: ${accent}; color: #111; cursor: pointer; }
  @media print { body { background: #fff; padding: 0; } .doc { border: none; } .actions { display: none; } }
</style></head><body>
  <div class="doc">
    <div class="head">
      <div>
        <div class="shop">${escapeHtml(barbershop.name)}</div>
        <div class="sub">${escapeHtml([barbershop.address, barbershop.city].filter(Boolean).join(' · '))}</div>
      </div>
      <div class="tag">Recibo / Boleto de mensalidade</div>
    </div>
    <div class="linha">
      <div class="lbl">Linha digitável</div>
      <div class="val">${linha}</div>
    </div>
    <div class="grid">
      <div class="cell"><div class="lbl">Assinante</div><div class="v">${escapeHtml(b.sub.name)}</div></div>
      <div class="cell"><div class="lbl">Plano</div><div class="v">${escapeHtml(plan)}</div></div>
      <div class="cell"><div class="lbl">Competência</div><div class="v">${escapeHtml(competenceLabel(b.openMonth))}</div></div>
      <div class="cell"><div class="lbl">Vencimento</div><div class="v">${venc}</div></div>
      <div class="cell"><div class="lbl">Emitido em</div><div class="v">${emitido}</div></div>
      <div class="cell"><div class="lbl">Valor</div><div class="v big">${valor}</div></div>
    </div>
    <div class="barcode">${bars(linha)}</div>
    <div class="warn">⚠️ Documento de controle interno — não possui validade bancária. Pagamento via PIX ou presencial na barbearia.</div>
    <div class="foot">Gerado pelo BarberOS · ${escapeHtml(barbershop.name)}</div>
  </div>
  <div class="actions"><button onclick="window.print()">Imprimir / Salvar PDF</button></div>
</body></html>`

  w.document.write(html)
  w.document.close()
}

function bars(seed: string): string {
  const digits = seed.replace(/\D/g, '')
  let out = ''
  for (let i = 0; i < 90; i++) {
    const wide = Number(digits[i % digits.length]) % 3 === 0
    out += `<i style="width:${wide ? 4 : 2}px"></i>`
  }
  return out
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ))
}

// ─── Seed demo ──────────────────────────────────────────────────────────────

// Nomes fictícios pra popular o demo com assinantes reais (não só um número).
const DEMO_NAMES = [
  'João Almeida', 'Pedro Rocha', 'Lucas Barreto', 'Rafael Nunes', 'Bruno Tavares',
  'Felipe Souza', 'Marcos Vieira', 'Thiago Lima', 'Gustavo Freitas', 'André Pires',
  'Diego Campos', 'Vinícius Melo', 'Rodrigo Alves', 'Caio Moreira', 'Henrique Dias',
]

/**
 * Gera assinantes demo distribuídos entre os planos, com vencimentos e status
 * variados (em dia, a vencer, atrasado) pra tela ficar interessante.
 */
export function seedDemoSubscribers(
  plan: DemoPlan,
  barbershopId: string,
  memberships: BarbershopMembership[],
  now: Date = new Date(),
): ClubSubscriber[] {
  if (memberships.length === 0) return []
  const currentMonth = ym(now)
  const prevMonth = addMonthsYm(currentMonth, -1)
  const count = plan === 'basic' ? 4 : plan === 'pro' ? 10 : 14

  return Array.from({ length: count }, (_, i) => {
    const membership = memberships[i % memberships.length]
    const day = now.getDate()
    // distribui vencimentos ao redor da data atual: uns já venceram, uns vencem em breve
    const billingDay = Math.min(28, Math.max(1, ((day + (i * 4 - 8)) % 28) + 1))
    // status: a cada 3, um atrasado (nunca pagou/atrasou), um em dia (pagou mês atual), resto a vencer
    let paidUntil: string | null
    if (i % 3 === 0) paidUntil = prevMonth        // atrasado ou a vencer no mês atual
    else if (i % 3 === 1) paidUntil = currentMonth // em dia
    else paidUntil = addMonthsYm(currentMonth, -2) // atrasado de verdade

    return {
      id: `demo-sub-${barbershopId}-${i}`,
      barbershopId,
      membershipId: membership.id,
      name: DEMO_NAMES[i % DEMO_NAMES.length],
      phone: `5511${String(90000000 + i * 111111).padStart(9, '0')}`,
      billingDay,
      createdAt: new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString(),
      paidUntil,
      active: true,
    }
  })
}
