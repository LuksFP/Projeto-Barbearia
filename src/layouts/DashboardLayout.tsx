// Layout do dashboard da barbearia — sidebar + área de conteúdo
// Representa a operação diária de UMA barbearia por vez (multi-tenant)

import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UserCheck,
  Scissors,
  Crown,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Scissors as ScissorsIcon,
  Paintbrush2,
  CreditCard,
  BarChart2,
  Clock,
  BellRing,
  UserPlus,
} from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
import { useSaasAccount } from '@/contexts/SaasAccountContext'
import { motion, AnimatePresence } from 'framer-motion'
import FeatureAnnouncementModal from '@/components/FeatureAnnouncementModal'

const navItems = [
  { to: '/dashboard', label: 'Visão Geral', icon: LayoutDashboard, end: true },
  { to: '/dashboard/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/dashboard/lembretes', label: 'Lembretes', icon: BellRing },
  { to: '/dashboard/equipe', label: 'Equipe', icon: UserCheck },
  { to: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { to: '/dashboard/reativar', label: 'Reativação', icon: UserPlus },
  { to: '/dashboard/servicos', label: 'Serviços', icon: Scissors },
  { to: '/dashboard/clube', label: 'Clube VIP', icon: Crown },
  { to: '/dashboard/financeiro', label: 'Financeiro', icon: BarChart2 },
  { to: '/dashboard/personalizar', label: 'Personalizar', icon: Paintbrush2 },
  { to: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
  { to: '/dashboard/assinatura', label: 'Assinatura', icon: CreditCard },
]

const ROLE_LABELS: Record<string, string> = {
  owner: 'Proprietário',
  admin: 'Administrador',
  barber: 'Barbeiro',
  receptionist: 'Recepcionista',
}

const DashboardLayout = () => {
  const { barbershop, tenantUser, userRole, isLoading } = useTenant()
  const { account } = useSaasAccount()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  // Label do trial: dias quando > 24h, horas/minutos quando falta menos de 1 dia.
  // `urgent` deixa o banner vermelho na reta final (< 6h).
  const trial = (() => {
    if (account?.planStatus !== 'trial' || !account.trialEndsAt) return null
    const diffMs = new Date(account.trialEndsAt).getTime() - Date.now()
    if (diffMs <= 0) return null
    const hours = diffMs / (1000 * 60 * 60)
    let label: string
    if (hours >= 24) {
      const days = Math.ceil(hours / 24)
      label = `${days} ${days === 1 ? 'dia' : 'dias'}`
    } else if (hours >= 1) {
      const h = Math.floor(hours)
      label = `${h} ${h === 1 ? 'hora' : 'horas'}`
    } else {
      const mins = Math.max(1, Math.round(diffMs / (1000 * 60)))
      label = `${mins} ${mins === 1 ? 'minuto' : 'minutos'}`
    }
    return { label, urgent: hours < 6 }
  })()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
      </div>
    )
  }

  if (!barbershop) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white/40 font-body">
        Nenhuma barbearia ativa.
      </div>
    )
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Workspace header */}
      <div className="p-5 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-amber-500/[0.15] border border-amber-500/30">
            <ScissorsIcon className="w-4 h-4 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate font-heading tracking-wide">
              {barbershop.name}
            </p>
            <p className="text-xs text-white/40 font-body truncate">{barbershop.city}, {barbershop.state}</p>
          </div>
          <ChevronDown className="w-4 h-4 text-white/30 ml-auto shrink-0" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto scrollbar-none">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-amber-400/[0.13] to-transparent text-amber-300 font-medium shadow-[inset_3px_0_0_0_#C9A84C]'
                  : 'text-white/45 hover:text-white/80 hover:bg-white/[0.04]'
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-[#1f1f1f]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
            <span className="text-amber-400 text-xs font-bold font-heading">
              {tenantUser?.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white font-body truncate">{tenantUser?.name}</p>
            <p className="text-xs text-amber-400 font-body">
              {userRole ? ROLE_LABELS[userRole] : '—'}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/45 hover:text-white/80 hover:bg-white/[0.04] transition-all font-body"
        >
          <LogOut className="w-4 h-4" />
          Sair do painel
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-[#0d0d0d] text-white overflow-hidden">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-[#080808] border-r border-[#1f1f1f]">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="fixed top-0 left-0 bottom-0 z-50 w-60 bg-[#080808] border-r border-[#1f1f1f] md:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar mobile */}
        <div className="md:hidden flex items-center gap-4 px-4 h-14 border-b border-[#1f1f1f] bg-[#080808] shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white/60 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-heading text-lg tracking-wide text-amber-400">{barbershop.logoText}</span>
          <button
            className="ml-auto text-white/40 hover:text-white/70"
            onClick={() => setSidebarOpen(false)}
          >
            {sidebarOpen && <X className="w-4 h-4" />}
          </button>
        </div>

        {/* Banner de trial */}
        {trial !== null && (
          <div className={`flex items-center justify-between gap-3 px-5 py-2.5 border-b shrink-0 ${
            trial.urgent ? 'bg-red-500/[0.12] border-red-500/25' : 'bg-amber-500/[0.10] border-amber-500/20'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <Clock className={`w-4 h-4 shrink-0 ${trial.urgent ? 'text-red-400' : 'text-amber-400'}`} />
              <p className={`text-sm font-body truncate ${trial.urgent ? 'text-red-300' : 'text-amber-300'}`}>
                <span className="font-semibold">{trial.label}</span> restante{trial.label.startsWith('1 ') ? '' : 's'} no teste gratuito
              </p>
            </div>
            <button
              onClick={() => navigate('/planos')}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold font-body transition-colors ${
                trial.urgent
                  ? 'bg-red-500 text-white hover:bg-red-400'
                  : 'bg-amber-500 text-[#0a0a0a] hover:bg-amber-400'
              }`}
            >
              Assinar agora
            </button>
          </div>
        )}

        {/* Página */}
        <main className="flex-1 overflow-y-auto scrollbar-none p-6">
          <Outlet />
        </main>
      </div>

      {/* Aviso de feature nova (uma vez por conta) */}
      <FeatureAnnouncementModal />
    </div>
  )
}

export default DashboardLayout
