// Lista de espera. Site (anon): só entra, pela RPC public_join_waitlist.
// Painel: lê a lista do dia e muda o status (avisado / agendou / removido).
// Demo (id não é uuid): localStorage compartilhado entre site e painel.
import { supabase } from '@/lib/supabase'
import { supabasePublic } from '@/lib/supabase-public'
import { isRealBarbershopId } from '@/lib/placeOrder'
import { errorText } from '@/lib/errors'

export type WaitPeriod = 'manha' | 'tarde' | 'noite' | 'qualquer'
export type WaitStatus = 'esperando' | 'avisado' | 'agendou' | 'removido'

export const PERIOD_LABEL: Record<WaitPeriod, string> = {
  manha: 'De manhã', tarde: 'À tarde', noite: 'À noite', qualquer: 'Qualquer horário',
}

export interface WaitEntry {
  id: string
  date: string
  period: WaitPeriod
  barberId: string | null
  clientName: string
  clientPhone: string
  status: WaitStatus
  notifiedAt: string | null
  createdAt: string
}

export interface JoinInput {
  barbershopId: string
  date: string
  clientName: string
  clientPhone: string
  period: WaitPeriod
  barberId?: string | null
}

const PERIODS: WaitPeriod[] = ['manha', 'tarde', 'noite', 'qualquer']
const STATUSES: WaitStatus[] = ['esperando', 'avisado', 'agendou', 'removido']
const asPeriod = (p: string): WaitPeriod => (PERIODS as string[]).includes(p) ? p as WaitPeriod : 'qualquer'
const asStatus = (s: string): WaitStatus => (STATUSES as string[]).includes(s) ? s as WaitStatus : 'esperando'

// ── Demo ───────────────────────────────────────────────────────────────────
const demoKey = (bsId: string) => `barberos:espera:${bsId}`
const demoLoad = (bsId: string): WaitEntry[] => {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(demoKey(bsId)) ?? '[]')
    return Array.isArray(raw) ? raw as WaitEntry[] : []
  } catch { return [] }
}
const demoSave = (bsId: string, list: WaitEntry[]) => {
  try { localStorage.setItem(demoKey(bsId), JSON.stringify(list)) } catch { /* ignora */ }
}

export const waitlistRepository = {
  /** Site: entra na lista (mesmo telefone no mesmo dia só atualiza). */
  async join(input: JoinInput): Promise<void> {
    const phone = input.clientPhone.replace(/\D/g, '')
    if (!isRealBarbershopId(input.barbershopId)) {
      const list = demoLoad(input.barbershopId).filter(e => !(e.date === input.date && e.clientPhone === phone))
      list.push({
        id: `w-${crypto.randomUUID()}`, date: input.date, period: input.period, barberId: input.barberId ?? null,
        clientName: input.clientName.trim(), clientPhone: phone, status: 'esperando', notifiedAt: null, createdAt: new Date().toISOString(),
      })
      demoSave(input.barbershopId, list)
      return
    }
    const { error } = await supabasePublic.rpc('public_join_waitlist', {
      p_barbershop_id: input.barbershopId,
      p_date: input.date,
      p_client_name: input.clientName,
      p_client_phone: phone,
      p_period: input.period,
      p_barber_id: input.barberId ?? null,
    })
    if (error) throw error
  },

  /** Painel: quem está esperando (ou já foi avisado) no dia. */
  async listForDate(barbershopId: string, date: string): Promise<WaitEntry[]> {
    if (!isRealBarbershopId(barbershopId)) {
      return demoLoad(barbershopId).filter(e => e.date === date && (e.status === 'esperando' || e.status === 'avisado'))
    }
    const { data, error } = await supabase
      .from('waitlist')
      .select('id, date, period, barber_id, client_name, client_phone, status, notified_at, created_at')
      .eq('barbershop_id', barbershopId)
      .eq('date', date)
      .in('status', ['esperando', 'avisado'])
      .order('created_at')
    if (error) throw error
    return (data ?? []).map(r => ({
      id: r.id, date: r.date, period: asPeriod(r.period), barberId: r.barber_id,
      clientName: r.client_name, clientPhone: r.client_phone, status: asStatus(r.status),
      notifiedAt: r.notified_at, createdAt: r.created_at,
    }))
  },

  async setStatus(barbershopId: string, id: string, status: WaitStatus): Promise<void> {
    const notifiedAt = status === 'avisado' ? new Date().toISOString() : undefined
    if (!isRealBarbershopId(barbershopId)) {
      demoSave(barbershopId, demoLoad(barbershopId).map(e => e.id === id ? { ...e, status, notifiedAt: notifiedAt ?? e.notifiedAt } : e))
      return
    }
    const { error } = await supabase.from('waitlist').update({ status, ...(notifiedAt ? { notified_at: notifiedAt } : {}) }).eq('id', id)
    if (error) throw error
  },
}

/** Mensagens do banco que fazem sentido pro cliente; o resto vira genérica. */
export function waitlistErrorMessage(err: unknown): string {
  const msg = errorText(err)
  if (/Telefone inválido|Informe seu nome|Escolha um dia|já está na lista|Período inválido|Muitos pedidos seguidos/.test(msg)) return msg
  return 'Não deu pra entrar na lista agora. Tente de novo em instantes.'
}
