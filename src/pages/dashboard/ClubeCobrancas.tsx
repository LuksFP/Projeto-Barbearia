import { useMemo, useState } from 'react'
import {
  AlertTriangle, CalendarClock, CheckCircle2, Wallet, Plus, X, Check,
  MessageCircle, Printer, Trash2, KeyRound, Pencil, Loader2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTenant } from '@/contexts/TenantContext'
import { useClubBilling, type NewSubscriberInput } from '@/hooks/useClubBilling'
import { toast } from '@/hooks/use-toast'
import {
  competenceLabel, formatDueDate, formatBRL,
  buildPixMessage, buildWhatsappUrl, openBoletoPrint,
  type SubscriberBilling, type BillingStatus,
} from '@/lib/clubBilling'
import type { Barbershop } from '@/types/tenant'

// ─── Config de status ──────────────────────────────────────────────────────────

const STATUS: Record<BillingStatus, { label: string; text: string; bg: string; dot: string }> = {
  overdue:    { label: 'Atrasado',  text: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',       dot: 'bg-red-400' },
  today:      { label: 'Vence hoje', text: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/25',   dot: 'bg-amber-400' },
  'due-soon': { label: 'A vencer',   text: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',     dot: 'bg-blue-400' },
  paid:       { label: 'Em dia',     text: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
}

function statusHint(b: SubscriberBilling): string {
  if (b.status === 'overdue') return `${b.daysLate} ${b.daysLate === 1 ? 'dia' : 'dias'} em atraso`
  if (b.status === 'today') return 'vence hoje'
  if (b.status === 'due-soon') return `em ${b.daysUntil} ${b.daysUntil === 1 ? 'dia' : 'dias'}`
  return `pago até ${competenceLabel(b.sub.paidUntil ?? b.openMonth)}`
}

// ─── Linha de cobrança ───────────────────────────────────────────────────────

interface RowProps {
  b: SubscriberBilling
  barbershop: Barbershop
  pixKey: string
  onMarkPaid: () => void
  onRevert: () => void
  onEdit: () => void
  onRemove: () => void
}

const ChargeRow = ({ b, barbershop, pixKey, onMarkPaid, onRevert, onEdit, onRemove }: RowProps) => {
  const s = STATUS[b.status]
  const paid = b.status === 'paid'

  const sendWhatsapp = () => {
    if (!b.sub.phone) {
      toast({ title: 'Assinante sem telefone', description: 'Edite o assinante e adicione um número.', variant: 'destructive' })
      return
    }
    const msg = buildPixMessage(b, barbershop, pixKey)
    window.open(buildWhatsappUrl(b.sub.phone, msg), '_blank')
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 p-4 rounded-xl border transition-colors ${
      b.status === 'overdue' ? 'bg-red-500/[0.04] border-red-500/15'
      : 'bg-[#161616] border-[#262626] hover:border-[#303030]'
    }`}>
      {/* Nome + plano */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
        <div className="min-w-0">
          <p className="text-white text-sm font-semibold font-body truncate">{b.sub.name}</p>
          <p className="text-white/40 text-xs font-body truncate">
            {b.membership?.name ?? '—'} · vence dia {b.sub.billingDay}
          </p>
        </div>
      </div>

      {/* Valor + vencimento */}
      <div className="text-right shrink-0">
        <p className="text-white font-heading text-base leading-none">{formatBRL(b.amount)}</p>
        <p className="text-white/35 text-xs font-body mt-1">{formatDueDate(b.dueDate)}</p>
      </div>

      {/* Status */}
      <div className={`shrink-0 px-2.5 py-1 rounded-full border text-xs font-body ${s.bg} ${s.text}`}>
        {STATUS[b.status].label} · {statusHint(b)}
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={sendWhatsapp}
          title="Cobrar via WhatsApp (PIX)"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-xs font-body transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">WhatsApp</span>
        </button>
        <button
          onClick={() => openBoletoPrint(b, barbershop)}
          title="Gerar / imprimir boleto"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-[#2e2e2e] text-white/50 hover:text-white text-xs font-body transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Boleto</span>
        </button>
        {paid ? (
          <button
            onClick={onRevert}
            title="Desfazer pagamento"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs font-body transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pago</span>
          </button>
        ) : (
          <button
            onClick={onMarkPaid}
            title="Marcar mensalidade como paga"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 text-[#0a0a0a] hover:bg-amber-400 text-xs font-semibold font-body transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dar baixa</span>
          </button>
        )}
        <button onClick={onEdit} title="Editar" className="p-1.5 rounded-lg text-white/30 hover:text-white transition-colors">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={onRemove} title="Remover" className="p-1.5 rounded-lg text-white/30 hover:text-red-400 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Form de assinante ─────────────────────────────────────────────────────────

interface SubDraft { name: string; phone: string; membershipId: string; billingDay: string }
const EMPTY: SubDraft = { name: '', phone: '', membershipId: '', billingDay: '5' }

interface SubFormProps {
  draft: SubDraft
  onChange: (d: SubDraft) => void
  onSave: () => void
  onCancel: () => void
  memberships: { id: string; name: string }[]
  title: string
}

const SubForm = ({ draft, onChange, onSave, onCancel, memberships, title }: SubFormProps) => {
  const set = (k: keyof SubDraft, v: string) => onChange({ ...draft, [k]: v })
  const valid = draft.name.trim() && draft.membershipId && Number(draft.billingDay) >= 1 && Number(draft.billingDay) <= 28

  return (
    <div className="p-5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl space-y-4">
      <p className="text-white/30 text-xs font-semibold tracking-widest uppercase font-body">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-white/35 text-xs font-body mb-1.5 block">Nome do assinante</label>
          <input
            value={draft.name} onChange={e => set('name', e.target.value)} placeholder="ex: João Almeida"
            className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white font-body placeholder:text-white/20 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <div>
          <label className="text-white/35 text-xs font-body mb-1.5 block">WhatsApp (com DDD)</label>
          <input
            value={draft.phone} onChange={e => set('phone', e.target.value)} placeholder="ex: 11 99999-8888"
            className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white font-body placeholder:text-white/20 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-white/35 text-xs font-body mb-1.5 block">Plano</label>
          <select
            value={draft.membershipId} onChange={e => set('membershipId', e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white font-body focus:outline-none focus:border-amber-500/50 appearance-none"
          >
            <option value="">Selecione…</option>
            {memberships.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-white/35 text-xs font-body mb-1.5 block">Dia do vencimento (1–28)</label>
          <input
            type="number" min="1" max="28" value={draft.billingDay} onChange={e => set('billingDay', e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white font-body focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white/40 hover:text-white font-body transition-colors">
          <X className="w-3.5 h-3.5" />Cancelar
        </button>
        <button
          onClick={onSave} disabled={!valid}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 text-[#0a0a0a] text-sm font-semibold font-body hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <Check className="w-3.5 h-3.5" />Salvar
        </button>
      </div>
    </div>
  )
}

// ─── Página de cobranças ────────────────────────────────────────────────────────

const ClubeCobrancas = () => {
  const { barbershop, memberships } = useTenant()
  const {
    ready, pixKey, subscribers, billings, summary,
    addSubscriber, updateSubscriber, removeSubscriber, markPaid, revertPaid, setPixKey,
  } = useClubBilling()

  const [creating, setCreating] = useState(false)
  const [newDraft, setNewDraft] = useState<SubDraft>(EMPTY)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<SubDraft>(EMPTY)
  const [editingPix, setEditingPix] = useState(false)
  const [pixInput, setPixInput] = useState(pixKey)
  const [filter, setFilter] = useState<'all' | BillingStatus>('all')

  const memOptions = useMemo(() => memberships.map(m => ({ id: m.id, name: m.name })), [memberships])

  const filtered = filter === 'all' ? billings : billings.filter(b => b.status === filter)

  const kpis = [
    { key: 'overdue' as const, label: 'Atrasados', value: summary.overdueCount, icon: AlertTriangle, color: 'text-red-400', ring: 'border-red-500/25 bg-red-500/[0.06]' },
    { key: 'today' as const, label: 'Vencem hoje', value: summary.todayCount, icon: CalendarClock, color: 'text-amber-400', ring: 'border-amber-500/25 bg-amber-500/[0.06]' },
    { key: 'due-soon' as const, label: 'A vencer (7d)', value: summary.dueSoonCount, icon: CalendarClock, color: 'text-blue-400', ring: 'border-blue-500/25 bg-blue-500/[0.06]' },
    { key: 'paid' as const, label: 'Recebido no mês', value: formatBRL(summary.received), icon: Wallet, color: 'text-emerald-400', ring: 'border-emerald-500/25 bg-emerald-500/[0.06]' },
  ]

  const startCreate = () => {
    setNewDraft({ ...EMPTY, membershipId: memOptions[0]?.id ?? '' })
    setCreating(true); setEditingId(null)
  }

  const saveCreate = () => {
    const input: NewSubscriberInput = {
      name: newDraft.name, phone: newDraft.phone,
      membershipId: newDraft.membershipId, billingDay: Number(newDraft.billingDay),
    }
    addSubscriber(input)
    setCreating(false)
    toast({ title: 'Assinante adicionado', description: `${input.name} entrou no clube.` })
  }

  const startEdit = (id: string) => {
    const s = subscribers.find(x => x.id === id)
    if (!s) return
    setEditDraft({ name: s.name, phone: s.phone, membershipId: s.membershipId, billingDay: String(s.billingDay) })
    setEditingId(id); setCreating(false)
  }

  const saveEdit = () => {
    if (!editingId) return
    updateSubscriber(editingId, {
      name: editDraft.name.trim(),
      phone: editDraft.phone.replace(/\D/g, ''),
      membershipId: editDraft.membershipId,
      billingDay: Math.min(28, Math.max(1, Number(editDraft.billingDay))),
    })
    setEditingId(null)
  }

  const confirmRemove = (id: string, name: string) => {
    if (window.confirm(`Remover ${name} do clube? Isso apaga o histórico de cobrança dele.`)) {
      removeSubscriber(id)
      toast({ title: 'Assinante removido' })
    }
  }

  const savePix = () => {
    setPixKey(pixInput.trim())
    setEditingPix(false)
    toast({ title: 'Chave PIX atualizada' })
  }

  if (!barbershop) return null

  return (
    <div className="space-y-6">
      {/* Barra PIX + novo assinante */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <KeyRound className="w-4 h-4 text-amber-400/60 shrink-0" />
          {editingPix ? (
            <div className="flex items-center gap-2">
              <input
                value={pixInput} onChange={e => setPixInput(e.target.value)} autoFocus
                placeholder="chave PIX da barbearia"
                className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg px-3 py-1.5 text-sm text-white font-body placeholder:text-white/20 focus:outline-none focus:border-amber-500/50 w-56"
              />
              <button onClick={savePix} className="p-1.5 rounded-lg bg-amber-500 text-[#0a0a0a] hover:bg-amber-400 transition-colors"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => { setEditingPix(false); setPixInput(pixKey) }} className="p-1.5 rounded-lg text-white/40 hover:text-white transition-colors"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <button onClick={() => { setPixInput(pixKey); setEditingPix(true) }} className="text-sm font-body text-white/50 hover:text-white transition-colors">
              PIX: <span className="text-white/70">{pixKey || 'configurar chave'}</span>
              <Pencil className="w-3 h-3 inline ml-1.5 -mt-0.5 opacity-50" />
            </button>
          )}
        </div>
        <button
          onClick={startCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-[#0a0a0a] text-sm font-semibold font-body hover:bg-amber-400 transition-colors"
        >
          <Plus className="w-4 h-4" />Novo assinante
        </button>
      </div>

      {/* KPIs (clicáveis = filtro) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => {
          const active = filter === k.key
          return (
            <motion.button
              key={k.key}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              onClick={() => setFilter(active ? 'all' : k.key)}
              className={`text-left p-5 rounded-xl border transition-all ${active ? k.ring : 'bg-[#161616] border-[#262626] hover:border-[#303030]'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/40 text-xs font-body">{k.label}</span>
                <k.icon className={`w-4 h-4 ${k.color}`} />
              </div>
              <p className="font-heading text-2xl text-white">{k.value}</p>
            </motion.button>
          )
        })}
      </div>

      {/* Form criação */}
      <AnimatePresence>
        {creating && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <SubForm draft={newDraft} onChange={setNewDraft} onSave={saveCreate} onCancel={() => setCreating(false)} memberships={memOptions} title="Novo assinante" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista */}
      {!ready ? (
        <div className="flex items-center justify-center py-16 text-white/30"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : billings.length === 0 ? (
        <div className="text-center py-16 text-white/25 font-body text-sm">
          Nenhum assinante ainda.{' '}
          <button onClick={startCreate} className="text-amber-400/70 hover:text-amber-400 underline underline-offset-2 transition-colors">
            Adicionar o primeiro
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filter !== 'all' && (
            <button onClick={() => setFilter('all')} className="text-xs font-body text-amber-400/70 hover:text-amber-400 transition-colors mb-1">
              ← ver todos ({billings.length})
            </button>
          )}
          {filtered.map(b => (
            <div key={b.sub.id}>
              <ChargeRow
                b={b} barbershop={barbershop} pixKey={pixKey}
                onMarkPaid={() => markPaid(b.sub.id)}
                onRevert={() => revertPaid(b.sub.id)}
                onEdit={() => editingId === b.sub.id ? setEditingId(null) : startEdit(b.sub.id)}
                onRemove={() => confirmRemove(b.sub.id, b.sub.name)}
              />
              <AnimatePresence>
                {editingId === b.sub.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="mt-2">
                      <SubForm draft={editDraft} onChange={setEditDraft} onSave={saveEdit} onCancel={() => setEditingId(null)} memberships={memOptions} title="Editar assinante" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center py-10 text-white/25 font-body text-sm">Nenhuma cobrança nesse filtro.</p>
          )}
        </div>
      )}
    </div>
  )
}

export default ClubeCobrancas
