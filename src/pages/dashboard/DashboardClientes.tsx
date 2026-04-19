import { useState } from 'react'
import { Crown, Search, Phone, Mail, X, Loader2, Calendar, Scissors, Star } from 'lucide-react'
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
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<AppointmentRow[]>([])

  // Carrega histórico ao montar
  useState(() => {
    appointmentRepository
      .listByContact(barbershopId, client.email, client.phone)
      .then(rows => setHistory(rows))
      .catch(() => toast({ title: 'Erro ao carregar histórico', variant: 'destructive' }))
      .finally(() => setLoading(false))
  })

  const totalSpend = history
    .filter(a => a.status === 'done' && a.price)
    .reduce((s, a) => s + Number(a.price), 0)

  const initials = client.name.split(' ').map(n => n[0]).slice(0, 2).join('')

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
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Contato */}
      <div className="px-6 py-4 border-b border-[#1a1a1a] space-y-2">
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

// ─── Página principal ─────────────────────────────────────────────────────────

const DashboardClientes = () => {
  const { clients, barbershop } = useTenant()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<BarbershopClient | null>(null)

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <p className="text-white/30 text-sm font-body mb-1">Base de clientes</p>
        <h1 className="font-heading text-3xl tracking-wide text-white">CLIENTES</h1>
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

      {/* Backdrop + drawer */}
      <AnimatePresence>
        {selected && barbershop && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="fixed inset-0 bg-black/60 z-40"
            />
            <ClientDrawer
              client={selected}
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
