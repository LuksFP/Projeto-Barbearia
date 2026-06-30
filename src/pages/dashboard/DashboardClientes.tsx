import { useState, useEffect, useMemo } from 'react'
import { Crown, Search, Phone, Mail, X, Loader2, Calendar, Scissors, Star, UserPlus, Pencil, MessageCircle, Award, Repeat, Ban, FileText, Check } from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
import { motion, AnimatePresence } from 'framer-motion'
import { appointmentRepository } from '@/repositories/appointmentRepository'
import type { BarbershopClient } from '@/types/tenant'
import type { AppointmentRow } from '@/repositories/appointmentRepository'
import { toast } from '@/hooks/use-toast'

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente', confirmed: 'Confirmado', done: 'Concluído', cancelled: 'Cancelado',
}
const STATUS_COLOR: Record<string, string> = {
  pending: 'text-amber-400', confirmed: 'text-blue-400', done: 'text-emerald-400', cancelled: 'text-red-400',
}

// Monta link de WhatsApp a partir do telefone livre. Assume Brasil (+55) se sem DDI.
function waLink(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 10) return null
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${withCountry}`
}

// Calcula insights derivados do histórico de agendamentos do cliente.
function computeInsights(history: AppointmentRow[]) {
  const mode = (arr: string[]): string | null => {
    const counts = new Map<string, number>()
    arr.forEach(s => counts.set(s, (counts.get(s) ?? 0) + 1))
    let best: string | null = null
    let bestN = 0
    counts.forEach((n, s) => { if (n > bestN) { bestN = n; best = s } })
    return best
  }

  const done = history.filter(a => a.status === 'done')
  const favoriteService = mode(history.map(a => a.service_name).filter((s): s is string => !!s))
  const favoriteBarber = mode(
    history.map(a => a.barber_name).filter((b): b is string => !!b && b !== 'A definir'),
  )

  const priced = done.filter(a => a.price != null)
  const avgTicket = priced.length
    ? priced.reduce((s, a) => s + Number(a.price), 0) / priced.length
    : null

  // Frequência: média de dias entre visitas concluídas
  const dates = done.map(a => new Date(a.date + 'T12:00:00').getTime()).sort((a, b) => a - b)
  let frequency: number | null = null
  if (dates.length >= 2) {
    let gaps = 0
    for (let i = 1; i < dates.length; i++) gaps += dates[i] - dates[i - 1]
    frequency = Math.round(gaps / (dates.length - 1) / 86_400_000)
  }

  const noShows = history.filter(a => a.status === 'cancelled').length

  return { favoriteService, favoriteBarber, avgTicket, frequency, noShows }
}

// ─── Painel lateral de perfil ─────────────────────────────────────────────────

const ClientDrawer = ({
  client,
  barbershopId,
  onClose,
}: {
  client: BarbershopClient
  barbershopId: string
  onClose: () => void
}) => {
  const { updateClient } = useTenant()
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<AppointmentRow[]>([])
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: client.name,
    phone: client.phone,
    email: client.email ?? '',
    membershipType: client.membershipType,
    notes: client.notes ?? '',
  })

  // Carrega histórico ao montar / quando troca de cliente
  useEffect(() => {
    setLoading(true)
    appointmentRepository
      .listByContact(barbershopId, client.email, client.phone)
      .then(rows => setHistory(rows))
      .catch(() => toast({ title: 'Erro ao carregar histórico', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [barbershopId, client.email, client.phone])

  // Reseta o form quando o cliente muda (mantém em sync com a fonte de verdade)
  useEffect(() => {
    setForm({
      name: client.name,
      phone: client.phone,
      email: client.email ?? '',
      membershipType: client.membershipType,
      notes: client.notes ?? '',
    })
  }, [client])

  const totalSpend = history
    .filter(a => a.status === 'done' && a.price)
    .reduce((s, a) => s + Number(a.price), 0)

  const insights = useMemo(() => computeInsights(history), [history])
  const waUrl = waLink(client.phone)
  const initials = client.name.split(' ').map(n => n[0]).slice(0, 2).join('')

  const handleSave = async () => {
    if (form.name.trim().length < 2 || form.phone.trim().length < 8) {
      toast({ title: 'Nome e telefone são obrigatórios', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await updateClient(client.id, {
        name: form.name,
        phone: form.phone,
        email: form.email,
        membershipType: form.membershipType,
        notes: form.notes,
      })
      toast({ title: 'Cliente atualizado' })
      setEditing(false)
    } catch (e) {
      toast({
        title: 'Erro ao salvar',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setForm({
      name: client.name,
      phone: client.phone,
      email: client.email ?? '',
      membershipType: client.membershipType,
      notes: client.notes ?? '',
    })
    setEditing(false)
  }

  const editFieldClass =
    'w-full px-3 py-2 rounded-lg bg-[#161616] border border-[#262626] text-white placeholder:text-white/30 text-sm font-body focus:outline-none focus:border-amber-500/50 transition-colors'

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className="fixed right-0 top-0 h-full w-full max-w-md bg-[#0f0f0f] border-l border-[#222] z-50 flex flex-col shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-[#1e1e1e]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#1e1e1e] border border-[#2e2e2e] flex items-center justify-center shrink-0">
            <span className="text-white/60 text-base font-heading">{initials}</span>
          </div>
          <div>
            <p className="text-white font-semibold font-body leading-tight">{client.name}</p>
            <p className="text-white/35 text-xs font-body mt-0.5">
              {client.membershipType === 'vip' ? 'VIP' : client.membershipType === 'standard' ? 'Standard' : 'Sem plano'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              title="Editar cliente"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-amber-300 hover:bg-white/5 transition-all"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {editing ? (
        /* Form de edição */
        <div className="px-6 py-4 border-b border-[#1a1a1a] space-y-3">
          <div>
            <label className="text-white/40 text-xs font-body block mb-1.5">Nome *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={editFieldClass} />
          </div>
          <div>
            <label className="text-white/40 text-xs font-body block mb-1.5">Telefone *</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} inputMode="tel" className={editFieldClass} />
          </div>
          <div>
            <label className="text-white/40 text-xs font-body block mb-1.5">Email</label>
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="opcional" inputMode="email" className={editFieldClass} />
          </div>
          <div>
            <label className="text-white/40 text-xs font-body block mb-1.5">Plano</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { v: null, l: 'Sem plano' },
                { v: 'standard', l: 'Standard' },
                { v: 'vip', l: 'VIP' },
              ] as { v: BarbershopClient['membershipType']; l: string }[]).map(opt => (
                <button
                  key={opt.l}
                  onClick={() => setForm(f => ({ ...f, membershipType: opt.v }))}
                  className={`py-2 rounded-lg text-xs font-body border transition-all ${
                    form.membershipType === opt.v
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-[#161616] border-[#262626] text-white/50 hover:border-[#333]'
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-white/40 text-xs font-body block mb-1.5">Observações</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Preferências, alergias, tipo de corte..."
              rows={3}
              className={`${editFieldClass} resize-none`}
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleCancelEdit}
              className="flex-1 py-2.5 rounded-lg border border-[#262626] text-white/60 text-sm font-body hover:bg-white/5 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-amber-500 text-black text-sm font-body font-semibold hover:bg-amber-400 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Salvar</>}
            </button>
          </div>
        </div>
      ) : (
        /* Contato (leitura) */
        <div className="px-6 py-4 border-b border-[#1a1a1a] space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-body">
              <Phone className="w-3.5 h-3.5 text-white/25 shrink-0" />
              <span className="text-white/65">{client.phone}</span>
            </div>
            {client.email && (
              <div className="flex items-center gap-2 text-sm font-body">
                <Mail className="w-3.5 h-3.5 text-white/25 shrink-0" />
                <span className="text-white/65 truncate">{client.email}</span>
              </div>
            )}
          </div>
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-sm font-body font-medium hover:bg-emerald-500/15 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              Chamar no WhatsApp
            </a>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-px bg-[#1a1a1a] border-b border-[#1a1a1a]">
        {[
          { label: 'Visitas', value: client.totalVisits },
          { label: 'Gasto total', value: `R$ ${fmt(totalSpend)}` },
          { label: 'Última visita', value: client.lastVisit ? fmtDate(client.lastVisit) : '—' },
        ].map(k => (
          <div key={k.label} className="bg-[#0f0f0f] px-4 py-3 text-center">
            <p className="text-white font-heading text-lg leading-tight">{loading && k.label === 'Gasto total' ? '…' : k.value}</p>
            <p className="text-white/30 text-xs font-body mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Notas (leitura) */}
      {!editing && client.notes && (
        <div className="px-6 py-4 border-b border-[#1a1a1a]">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-3.5 h-3.5 text-amber-400/70 shrink-0" />
            <p className="text-white/30 text-xs font-semibold uppercase tracking-widest font-body">Observações</p>
          </div>
          <p className="text-white/65 text-sm font-body leading-relaxed whitespace-pre-wrap">{client.notes}</p>
        </div>
      )}

      {/* Insights derivados do histórico */}
      {!loading && history.length > 0 && (
        <div className="px-6 py-4 border-b border-[#1a1a1a] space-y-2.5">
          <p className="text-white/30 text-xs font-semibold uppercase tracking-widest font-body mb-1">Insights</p>
          {insights.favoriteService && (
            <div className="flex items-center justify-between text-sm font-body">
              <span className="flex items-center gap-2 text-white/45"><Scissors className="w-3.5 h-3.5 text-white/25" /> Serviço favorito</span>
              <span className="text-white/80">{insights.favoriteService}</span>
            </div>
          )}
          {insights.favoriteBarber && (
            <div className="flex items-center justify-between text-sm font-body">
              <span className="flex items-center gap-2 text-white/45"><Award className="w-3.5 h-3.5 text-white/25" /> Barbeiro favorito</span>
              <span className="text-white/80">{insights.favoriteBarber}</span>
            </div>
          )}
          {insights.avgTicket != null && (
            <div className="flex items-center justify-between text-sm font-body">
              <span className="flex items-center gap-2 text-white/45"><Star className="w-3.5 h-3.5 text-white/25" /> Ticket médio</span>
              <span className="text-amber-400/90">R$ {fmt(insights.avgTicket)}</span>
            </div>
          )}
          {insights.frequency != null && (
            <div className="flex items-center justify-between text-sm font-body">
              <span className="flex items-center gap-2 text-white/45"><Repeat className="w-3.5 h-3.5 text-white/25" /> Frequência</span>
              <span className="text-white/80">a cada {insights.frequency} {insights.frequency === 1 ? 'dia' : 'dias'}</span>
            </div>
          )}
          {insights.noShows > 0 && (
            <div className="flex items-center justify-between text-sm font-body">
              <span className="flex items-center gap-2 text-white/45"><Ban className="w-3.5 h-3.5 text-red-400/50" /> Cancelamentos</span>
              <span className="text-red-400/80">{insights.noShows}</span>
            </div>
          )}
        </div>
      )}

      {/* Histórico */}
      <div className="flex-1 overflow-y-auto scrollbar-none px-6 py-4">
        <p className="text-white/30 text-xs font-semibold uppercase tracking-widest font-body mb-4">
          Histórico de agendamentos
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-white/25">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm font-body">Carregando...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="py-12 text-center">
            <Calendar className="w-8 h-8 text-white/10 mx-auto mb-3" />
            <p className="text-white/25 text-sm font-body">Nenhum agendamento encontrado.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map(apt => (
              <div
                key={apt.id}
                className="p-3.5 rounded-xl bg-[#161616] border border-[#222] space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-3.5 h-3.5 text-white/25 shrink-0 mt-0.5" />
                    <span className="text-white/80 text-sm font-body font-medium leading-tight">
                      {apt.service_name}
                    </span>
                  </div>
                  <span className={`text-xs font-body shrink-0 ${STATUS_COLOR[apt.status] ?? 'text-white/30'}`}>
                    {STATUS_LABEL[apt.status] ?? apt.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-body text-white/35 pl-5">
                  <span>{fmtDate(apt.date)} às {apt.time}</span>
                  <span className="flex items-center gap-2">
                    {apt.barber_name && apt.barber_name !== 'A definir' && (
                      <span>{apt.barber_name}</span>
                    )}
                    {apt.price != null && (
                      <span className="text-amber-400/70 font-medium">R$ {fmt(Number(apt.price))}</span>
                    )}
                  </span>
                </div>
                {apt.rating != null && (
                  <div className="flex items-center gap-1 pl-5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="w-3 h-3"
                        fill={i < apt.rating! ? '#f59e0b' : 'transparent'}
                        stroke={i < apt.rating! ? '#f59e0b' : 'rgba(255,255,255,0.15)'}
                      />
                    ))}
                    {apt.review && (
                      <span className="text-white/30 text-xs ml-1 italic">"{apt.review}"</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Modal de novo cliente ────────────────────────────────────────────────────

const AddClientModal = ({ onClose }: { onClose: () => void }) => {
  const { addClient } = useTenant()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [membership, setMembership] = useState<BarbershopClient['membershipType']>(null)
  const [saving, setSaving] = useState(false)

  const canSave = name.trim().length >= 2 && phone.trim().length >= 8 && !saving

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      await addClient({ name, phone, email, membershipType: membership })
      toast({ title: 'Cliente adicionado', description: name.trim() })
      onClose()
    } catch (e) {
      toast({
        title: 'Erro ao adicionar cliente',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const fieldClass =
    'w-full px-4 py-3 rounded-xl bg-[#161616] border border-[#262626] text-white placeholder:text-white/30 text-sm font-body focus:outline-none focus:border-amber-500/50 transition-colors'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ y: 12, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 12, scale: 0.96 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="relative w-full max-w-md bg-[#0f0f0f] border border-[#222] rounded-2xl shadow-2xl overflow-y-auto scrollbar-none max-h-[90vh]"
      >
      <div className="flex items-center justify-between px-6 py-5 border-b border-[#1e1e1e]">
        <h2 className="text-white font-heading text-xl tracking-wide">NOVO CLIENTE</h2>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-6 py-5 space-y-3">
        <div>
          <label className="text-white/40 text-xs font-body block mb-1.5">Nome *</label>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Nome do cliente" className={fieldClass} />
        </div>
        <div>
          <label className="text-white/40 text-xs font-body block mb-1.5">Telefone *</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" inputMode="tel" className={fieldClass} />
        </div>
        <div>
          <label className="text-white/40 text-xs font-body block mb-1.5">Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com (opcional)" inputMode="email" className={fieldClass} />
        </div>
        <div>
          <label className="text-white/40 text-xs font-body block mb-1.5">Plano</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { v: null, l: 'Sem plano' },
              { v: 'standard', l: 'Standard' },
              { v: 'vip', l: 'VIP' },
            ] as { v: BarbershopClient['membershipType']; l: string }[]).map(opt => (
              <button
                key={opt.l}
                onClick={() => setMembership(opt.v)}
                className={`py-2.5 rounded-xl text-xs font-body border transition-all ${
                  membership === opt.v
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-[#161616] border-[#262626] text-white/50 hover:border-[#333]'
                }`}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 px-6 py-4 border-t border-[#1e1e1e]">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl border border-[#262626] text-white/60 text-sm font-body hover:bg-white/5 transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="flex-1 py-3 rounded-xl bg-amber-500 text-black text-sm font-body font-semibold hover:bg-amber-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar'}
        </button>
      </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

const DashboardClientes = () => {
  const { clients, barbershop } = useTenant()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<BarbershopClient | null>(null)
  const [adding, setAdding] = useState(false)

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  // Sempre lê o cliente selecionado da fonte de verdade (reflete edições na hora)
  const selectedFresh = selected ? clients.find(c => c.id === selected.id) ?? selected : null

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-white/30 text-sm font-body mb-1">Base de clientes</p>
          <h1 className="font-heading text-3xl tracking-wide text-white">CLIENTES</h1>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-black text-sm font-body font-semibold hover:bg-amber-400 transition-all shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Novo cliente
        </button>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: clients.length },
          { label: 'VIP', value: clients.filter(c => c.membershipType === 'vip').length },
          { label: 'Standard', value: clients.filter(c => c.membershipType === 'standard').length },
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-xl bg-[#161616] border border-[#262626] text-center">
            <p className="font-heading text-2xl text-white">{s.value}</p>
            <p className="text-white/45 text-xs font-body mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
        <input
          type="text"
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#161616] border border-[#262626] text-white placeholder:text-white/30 text-sm font-body focus:outline-none focus:border-amber-500/50 transition-colors"
        />
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtered.map((client, i) => (
          <motion.button
            key={client.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => setSelected(client)}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-[#161616] border border-[#262626] hover:bg-[#1c1c1c] hover:border-[#303030] transition-all text-left"
          >
            <div className="w-10 h-10 rounded-full bg-[#222] border border-[#2e2e2e] flex items-center justify-center shrink-0">
              <span className="text-white/55 text-sm font-heading">
                {client.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white text-sm font-semibold font-body truncate">{client.name}</p>
                {client.membershipType === 'vip' && (
                  <span className="flex items-center gap-1 text-amber-400 text-xs px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 shrink-0">
                    <Crown className="w-2.5 h-2.5" />
                    VIP
                  </span>
                )}
                {client.membershipType === 'standard' && (
                  <span className="text-white/30 text-xs px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 shrink-0">
                    Standard
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3 h-3 text-white/20" />
                <p className="text-white/45 text-xs font-body">{client.phone}</p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="text-white/70 text-sm font-body">{client.totalVisits} visitas</p>
              <p className="text-white/35 text-xs font-body">
                {client.lastVisit ? `última: ${client.lastVisit}` : 'sem visitas'}
              </p>
            </div>
          </motion.button>
        ))}

        {filtered.length === 0 && (
          <div className="py-16 text-center text-white/20 font-body text-sm">
            Nenhum cliente encontrado.
          </div>
        )}
      </div>

      {/* Modal de novo cliente */}
      <AnimatePresence>
        {adding && <AddClientModal onClose={() => setAdding(false)} />}
      </AnimatePresence>

      {/* Backdrop + drawer */}
      <AnimatePresence>
        {selectedFresh && barbershop && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="fixed inset-0 bg-black/60 z-40"
            />
            <ClientDrawer
              client={selectedFresh}
              barbershopId={barbershop.id}
              onClose={() => setSelected(null)}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DashboardClientes
