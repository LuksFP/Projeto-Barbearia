import { useState } from 'react'
import { Crown, Search, Phone } from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
import { motion } from 'framer-motion'

const DashboardClientes = () => {
  const { clients } = useTenant()
  const [search, setSearch] = useState('')

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
          <motion.div
            key={client.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-4 p-4 rounded-xl bg-[#161616] border border-[#262626] hover:bg-[#1c1c1c] hover:border-[#303030] transition-all"
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
              <p className="text-white/35 text-xs font-body">última: {client.lastVisit}</p>
            </div>
          </motion.div>
        ))}

        {filtered.length === 0 && (
          <div className="py-16 text-center text-white/20 font-body text-sm">
            Nenhum cliente encontrado.
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardClientes
