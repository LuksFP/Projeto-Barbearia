import { useState, useEffect, useMemo } from 'react'
import { Crown, Clock, CheckCircle2, AlertCircle, XCircle, Plus, ChevronLeft, ChevronRight, ChevronDown, Loader2, X, Check } from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
import { appointmentRepository } from '@/repositories/appointmentRepository'
import { mapAppointment } from '@/contexts/TenantContext'
import { isDemoMode } from '@/lib/demo'
import { motion, AnimatePresence } from 'framer-motion'
import type { BarbershopAppointment } from '@/types/tenant'
import { toast } from '@/hooks/use-toast'
import { buildDaySlots, busyRanges, isTimeAvailable, toMin, toHHMM } from '@/lib/scheduling'

const STATUS_CONFIG = {
  done:      { label: 'Concluído', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', icon: CheckCircle2 },
  confirmed: { label: 'Confirmado', color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/20',  icon: Clock },
  pending:   { label: 'Pendente',   color: 'text-white/50',   bg: 'bg-white/5 border-white/10',            icon: AlertCircle },
  cancelled: { label: 'Cancelado',  color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/20',       icon: XCircle },
}

const STATUS_TRANSITIONS: Record<string, { label: string; next: string }[]> = {
  pending:   [{ label: 'Confirmar', next: 'confirmed' }, { label: 'Cancelar', next: 'cancelled' }],
  confirmed: [{ label: 'Concluir',  next: 'done' },      { label: 'Cancelar', next: 'cancelled' }],
  done:      [],
  cancelled: [],
}

const DAY_NAMES = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

interface WeekDay {
  date: string
  label: string
}

function getWeekDays(weekOffset: number): WeekDay[] {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return {
      date: d.toISOString().split('T')[0],
      label: `${DAY_NAMES[i]} ${d.getDate()}`,
    }
  })
}

function todayIndex(): number {
  const day = new Date().getDay()
  return day === 0 ? 6 : day - 1
}

interface NewAptForm {
  clientName: string
  clientPhone: string
  serviceNames: string[]
  barberId: string
  date: string
  time: string
  durationMin: string
  price: string
  notes: string
}

const EMPTY_APT: NewAptForm = {
  clientName: '', clientPhone: '', serviceNames: [], barberId: '',
  date: '', time: '', durationMin: '30', price: '', notes: '',
}

const DashboardAgenda = () => {
  const { barbershop, barbers, services, clients, addClient, appointments: demoAppointments } = useTenant()
  const [weekOffset, setWeekOffset]     = useState(0)
  const [selectedIdx, setSelectedIdx]   = useState(todayIndex)
  const [filterBarber, setFilterBarber] = useState<string>('all')
  const [appointments, setAppointments] = useState<BarbershopAppointment[]>([])
  const [loading, setLoading]           = useState(false)
  const [updatingId, setUpdatingId]     = useState<string | null>(null)

  // Modal "Novo agendamento"
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<NewAptForm>(EMPTY_APT)
  const [servicesOpen, setServicesOpen] = useState(false)   // accordion da lista de serviços

  const weekDays    = getWeekDays(weekOffset)
  const selectedDate = weekDays[selectedIdx]?.date ?? ''
  const todayStr = new Date().toISOString().split('T')[0]

  const formBarber   = barbers.find(b => b.id === form.barberId)
  // Vários serviços somam só o preço (o tempo é definido no agendamento, não no serviço)
  const formServices = services.filter(s => form.serviceNames.includes(s.name))
  const servicesTotalPrice = formServices.reduce((acc, s) => acc + s.price, 0)
  // Duração editável no form (padrão = tempo de corte do barbeiro / 30)
  const slotDuration = Math.max(5, Number(form.durationMin) || formBarber?.cutDurationMin || 30)

  // Marca/desmarca um serviço e reajusta só o preço pela soma
  const toggleService = (name: string) => {
    setForm(f => {
      const names = f.serviceNames.includes(name)
        ? f.serviceNames.filter(n => n !== name)
        : [...f.serviceNames, name]
      const picked = services.filter(s => names.includes(s.name))
      const totalPrice = picked.reduce((acc, s) => acc + s.price, 0)
      return {
        ...f,
        serviceNames: names,
        price: names.length ? String(totalPrice) : '',
        time: '',
      }
    })
  }

  // Horários já calculados (início–fim) do barbeiro naquela data: passo fino,
  // reservando o bloco cheio (soma dos serviços / duração) e escondendo os
  // ocupados. É o que aparece ao abrir a lista de horário.
  const daySlots = useMemo(() => {
    if (!form.date || !form.barberId) return []
    const busy = busyRanges(appointments, form.barberId, form.date)
    return buildDaySlots({
      step: Math.min(30, slotDuration),
      duration: slotDuration,
      busy,
      open: barbershop?.openTime,
      close: barbershop?.closeTime,
      now: new Date(),
      date: form.date,
    }).filter(s => s.available)
  }, [form.date, form.barberId, slotDuration, appointments, barbershop?.openTime, barbershop?.closeTime])

  // Término do horário escolhido (usado no resumo e na trava do botão)
  const bookingCheck = useMemo(() => {
    if (!form.date || !form.time) return null
    const busy = form.barberId ? busyRanges(appointments, form.barberId, form.date) : []
    const end = toMin(form.time) + slotDuration
    return { end: toHHMM(end), available: isTimeAvailable(form.time, slotDuration, busy) }
  }, [form.date, form.time, form.barberId, slotDuration, appointments])

  const openNewModal = () => {
    setForm({ ...EMPTY_APT, date: selectedDate })
    setServicesOpen(false)
    setModalOpen(true)
  }

  useEffect(() => {
    if (!barbershop || !selectedDate) return

    if (isDemoMode()) {
      const filtered = demoAppointments.filter(a => a.date === selectedDate)
      setAppointments(filtered.length > 0 ? filtered : demoAppointments)
      return
    }

    setLoading(true)
    appointmentRepository
      .listByBarbershop(barbershop.id, selectedDate)
      .then(rows => setAppointments(rows.map(mapAppointment)))
      .catch(() => toast({ title: 'Erro ao carregar agendamentos', variant: 'destructive' }))
      .finally(() => setLoading(false))
  }, [barbershop?.id, selectedDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = async (apt: BarbershopAppointment, nextStatus: string) => {
    if (isDemoMode()) {
      setAppointments(prev =>
        prev.map(a => a.id === apt.id ? { ...a, status: nextStatus as BarbershopAppointment['status'] } : a)
      )
      return
    }
    setUpdatingId(apt.id)
    try {
      const updated = await appointmentRepository.updateStatus(apt.id, nextStatus)
      setAppointments(prev =>
        prev.map(a => a.id === apt.id ? mapAppointment(updated) : a)
      )
    } catch {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' })
    } finally {
      setUpdatingId(null)
    }
  }

  const handleNewAppointment = async () => {
    if (!barbershop || !form.clientName || !form.clientPhone || form.serviceNames.length === 0 || !form.barberId || !form.date || !form.time) return

    // Vários serviços viram um atendimento só: nomes juntos, preço somado
    const picked = services.filter(s => form.serviceNames.includes(s.name))
    const svc = picked[0]
    const label = picked.map(s => s.name).join(' + ')
    const category = picked.length > 1 ? 'Combo' : svc?.category
    const totalPrice = picked.reduce((acc, s) => acc + s.price, 0)
    const brb = barbers.find(b => b.id === form.barberId)
    const duration = slotDuration

    // Guarda: não deixa marcar em cima de um horário já ocupado do barbeiro
    if (form.barberId) {
      const busy = busyRanges(appointments, form.barberId, form.date)
      if (!isTimeAvailable(form.time, duration, busy)) {
        toast({ title: 'Horário ocupado', description: `${brb?.name ?? 'O barbeiro'} já tem atendimento nesse horário.`, variant: 'destructive' })
        return
      }
    }

    // Cliente entra automaticamente na aba Clientes (no banco é via trigger;
    // aqui reflete na hora na UI). Só se ainda não existir esse telefone.
    const ensureClient = () => {
      const digits = form.clientPhone.replace(/\D/g, '')
      if (digits && !clients.some(c => c.phone.replace(/\D/g, '') === digits)) {
        addClient({ name: form.clientName, phone: form.clientPhone, membershipType: null, notes: form.notes.trim() || undefined }).catch(() => {})
      }
    }

    setSaving(true)
    try {
      if (isDemoMode()) {
        // Demo: adiciona ao estado local pra o range ficar bloqueado na hora
        const demoApt: BarbershopAppointment = {
          id: `demo-apt-new-${Date.now()}`,
          barbershopId: barbershop.id,
          clientName: form.clientName,
          clientPhone: form.clientPhone,
          barberId: brb?.id ?? '',
          barberName: brb?.name ?? 'A definir',
          serviceId: svc?.id ?? '',
          serviceName: label,
          serviceCategory: category,
          date: form.date,
          time: form.time,
          durationMin: duration,
          status: 'confirmed',
          price: form.price ? Number(form.price) : totalPrice,
        }
        if (form.date === selectedDate) {
          setAppointments(prev => [...prev, demoApt].sort((a, b) => a.time.localeCompare(b.time)))
        }
        ensureClient()
        setModalOpen(false)
        setForm(EMPTY_APT)
        return
      }
      // Resolve serviço e barbeiro selecionados para gravar os campos que
      // alimentam os relatórios financeiros (service_category, barber_id).
      const row = await appointmentRepository.create({
        barbershop_id: barbershop.id,
        client_name: form.clientName,
        client_phone: form.clientPhone,
        service_name: label,
        service_category: category ?? null,
        barber_id: brb?.id ?? null,
        barber_name: brb?.name ?? 'A definir',
        date: form.date,
        time: form.time,
        duration_min: duration,
        price: form.price ? Number(form.price) : totalPrice,
        notes: form.notes.trim() || null,
        status: 'confirmed',
      })
      // Se a data do novo agendamento é a selecionada, adiciona à lista
      if (row.date === selectedDate) {
        setAppointments(prev => [...prev, mapAppointment(row)].sort((a, b) => a.time.localeCompare(b.time)))
      }
      ensureClient()
      setModalOpen(false)
      setForm(EMPTY_APT)
    } catch (err: unknown) {
      // 23P01 = exclusion_violation da trava de sobreposição por barbeiro
      const msg = (err && typeof err === 'object' && 'message' in err) ? String((err as { message: unknown }).message) : ''
      const overlap = msg.includes('23P01') || msg.includes('appointments_no_overlap_per_barber')
      toast({
        title: overlap ? 'Horário já ocupado' : 'Erro ao criar agendamento',
        description: overlap ? `${brb?.name ?? 'Esse barbeiro'} já tem um atendimento que bate com esse horário.` : undefined,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const prevWeek = () => { setWeekOffset(w => w - 1); setSelectedIdx(0) }
  const nextWeek = () => { setWeekOffset(w => w + 1); setSelectedIdx(0) }

  const filtered = appointments.filter(
    a => filterBarber === 'all' || a.barberId === filterBarber
  )

  const grouped = filtered.reduce<Record<string, BarbershopAppointment[]>>((acc, apt) => {
    if (!acc[apt.barberName]) acc[apt.barberName] = []
    acc[apt.barberName].push(apt)
    return acc
  }, {})

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/30 text-sm font-body mb-1">
            Semana {weekOffset === 0 ? 'atual' : weekOffset > 0 ? `+${weekOffset}` : weekOffset}
          </p>
          <h1 className="font-heading text-3xl tracking-wide text-white">AGENDA</h1>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-[#0a0a0a] text-sm font-semibold font-body hover:bg-amber-400 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo agendamento
        </button>
      </div>

      {/* Navegação dias */}
      <div className="flex items-center gap-2">
        <button onClick={prevWeek} className="p-2 rounded-lg border border-[#262626] text-white/45 hover:text-white hover:border-[#333] transition-all">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 flex gap-2 overflow-x-auto pb-1">
          {weekDays.map((day, i) => {
            const isToday = day.date === todayStr
            return (
              <button
                key={day.date}
                onClick={() => setSelectedIdx(i)}
                className={`shrink-0 px-4 py-2 rounded-lg text-sm font-body transition-all ${
                  selectedIdx === i
                    ? 'bg-amber-500/[0.12] border border-amber-500/30 text-amber-400'
                    : isToday
                      ? 'border border-white/15 text-white/70 hover:border-[#333]'
                      : 'border border-[#262626] text-white/45 hover:border-[#333] hover:text-white/70'
                }`}
              >
                {day.label}
              </button>
            )
          })}
        </div>
        <button onClick={nextWeek} className="p-2 rounded-lg border border-[#262626] text-white/45 hover:text-white hover:border-[#333] transition-all">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Filtro por barbeiro */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterBarber('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-body transition-all ${
            filterBarber === 'all'
              ? 'bg-amber-500/[0.12] border border-amber-500/30 text-amber-400'
              : 'border border-[#262626] text-white/45 hover:border-[#333] hover:text-white/70'
          }`}
        >
          Todos
        </button>
        {barbers.map(b => (
          <button
            key={b.id}
            onClick={() => setFilterBarber(b.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-body transition-all ${
              filterBarber === b.id
                ? 'bg-amber-500/[0.12] border border-amber-500/30 text-amber-400'
                : 'border border-[#262626] text-white/45 hover:border-[#333] hover:text-white/70'
            }`}
          >
            {b.name.split(' ')[0]}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-amber-400/50 animate-spin" />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="text-white/25 text-sm font-body text-center py-12">
          Nenhum agendamento para {weekDays[selectedIdx]?.label ?? 'este dia'}.
        </p>
      )}

      {/* Lista agrupada por barbeiro */}
      {!loading && Object.entries(grouped).map(([barberName, apts]) => (
        <motion.div key={barberName} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <p className="text-white/30 text-xs font-semibold tracking-widest uppercase font-body px-1 mb-3">
            {barberName}
          </p>
          {apts.map(apt => {
            const statusKey = apt.status in STATUS_CONFIG ? apt.status as keyof typeof STATUS_CONFIG : 'pending'
            const status = STATUS_CONFIG[statusKey]
            const StatusIcon = status.icon
            const transitions = STATUS_TRANSITIONS[apt.status] ?? []
            const isUpdating = updatingId === apt.id

            return (
              <div
                key={apt.id}
                className="p-4 rounded-xl bg-[#161616] border border-[#262626] hover:bg-[#1c1c1c] hover:border-[#303030] transition-all"
              >
                <div className="flex items-center gap-4">
                  <span className="font-heading text-xl text-white/60 w-14 shrink-0 text-center">
                    {apt.time}
                  </span>
                  <div className="w-px h-10 bg-[#2a2a2a] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{apt.clientName}</p>
                    <p className="text-white/45 text-xs">
                      {apt.serviceName}
                      {apt.price != null && (
                        <span className="text-white/25"> · R$ {apt.price.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                      )}
                    </p>
                  </div>
                  {apt.membershipType === 'vip' && (
                    <span className="flex items-center gap-1 text-amber-400 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                      <Crown className="w-2.5 h-2.5" />
                      VIP
                    </span>
                  )}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${status.bg} ${status.color}`}>
                    {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : <StatusIcon className="w-3 h-3" />}
                    {status.label}
                  </div>
                </div>

                {/* Ações de status */}
                {transitions.length > 0 && !isUpdating && (
                  <div className="flex items-center gap-2 mt-3 pl-[74px]">
                    {transitions.map(({ label, next }) => (
                      <button
                        key={next}
                        onClick={() => handleStatusChange(apt, next)}
                        className={`px-3 py-1 rounded-md text-xs font-body font-semibold transition-all ${
                          next === 'cancelled'
                            ? 'bg-red-400/10 text-red-400 border border-red-400/20 hover:bg-red-400/20'
                            : next === 'done'
                              ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 hover:bg-emerald-400/20'
                              : 'bg-amber-400/10 text-amber-400 border border-amber-400/20 hover:bg-amber-400/20'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </motion.div>
      ))}

      {/* Modal — Novo agendamento */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => setModalOpen(false)}
            />
            <motion.div
              initial={{ y: 24, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 12, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-[#111] border border-[#222] rounded-2xl p-6 overflow-y-auto scrollbar-none max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-xl tracking-wide text-white">NOVO AGENDAMENTO</h2>
                <button onClick={() => setModalOpen(false)} className="text-white/30 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-white/45 text-xs font-body mb-1.5">Nome do cliente *</label>
                    <input
                      type="text"
                      value={form.clientName}
                      onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                      placeholder="Nome completo"
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm font-body placeholder:text-white/20 focus:outline-none focus:border-[#3a3a3a]"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-white/45 text-xs font-body mb-1.5">Telefone *</label>
                    <input
                      type="tel"
                      value={form.clientPhone}
                      onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))}
                      placeholder="(00) 00000-0000"
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm font-body placeholder:text-white/20 focus:outline-none focus:border-[#3a3a3a]"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-white/45 text-xs font-body mb-1.5">Serviços *</label>
                    {/* Trigger do accordion — fechado mostra só o resumo */}
                    <button
                      type="button"
                      onClick={() => setServicesOpen(o => !o)}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-colors"
                      style={form.serviceNames.length > 0
                        ? { borderColor: 'rgba(245,158,11,0.45)', backgroundColor: 'rgba(245,158,11,0.08)' }
                        : { borderColor: '#272727', backgroundColor: '#161616' }}
                    >
                      <span className={`text-sm font-body flex-1 min-w-0 truncate ${form.serviceNames.length > 0 ? 'text-white font-medium' : 'text-white/40'}`}>
                        {form.serviceNames.length === 0
                          ? 'Selecionar serviços…'
                          : form.serviceNames.length === 1
                            ? formServices[0]?.name
                            : `${formServices[0]?.name} +${form.serviceNames.length - 1}`}
                      </span>
                      {form.serviceNames.length > 0 && (
                        <span className="text-amber-400 text-sm font-heading shrink-0">R$ {servicesTotalPrice}</span>
                      )}
                      <ChevronDown className={`w-4 h-4 text-white/40 shrink-0 transition-transform duration-200 ${servicesOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {form.serviceNames.length > 0 && !servicesOpen && (
                      <p className="text-amber-400/70 text-[11px] font-body mt-1 px-1">
                        {form.serviceNames.length} serviço{form.serviceNames.length > 1 ? 's' : ''} selecionado{form.serviceNames.length > 1 ? 's' : ''}
                      </p>
                    )}

                    {/* Lista expansível */}
                    {servicesOpen && (
                      <div className="mt-2 space-y-2 max-h-56 overflow-y-auto scrollbar-none pr-0.5">
                        {services.map(s => {
                          const checked = form.serviceNames.includes(s.name)
                          return (
                            <button
                              type="button"
                              key={s.id}
                              onClick={() => toggleService(s.name)}
                              className="group w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all duration-150"
                              style={checked
                                ? { borderColor: 'rgba(245,158,11,0.55)', backgroundColor: 'rgba(245,158,11,0.10)', boxShadow: 'inset 0 0 0 1px rgba(245,158,11,0.12)' }
                                : { borderColor: '#272727', backgroundColor: '#161616' }}
                            >
                              <span
                                className="w-[18px] h-[18px] rounded-md flex items-center justify-center shrink-0 transition-all duration-150"
                                style={checked
                                  ? { backgroundColor: '#f59e0b', color: '#0a0a0a' }
                                  : { border: '1.5px solid #3a3a3a' }}
                              >
                                {checked && <Check className="w-3 h-3" strokeWidth={3} />}
                              </span>
                              <span className={`text-sm font-body flex-1 min-w-0 truncate transition-colors ${checked ? 'text-white font-medium' : 'text-white/70 group-hover:text-white/90'}`}>
                                {s.name}
                              </span>
                              <span className="text-sm font-heading text-amber-400 shrink-0">R$ {s.price}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-white/45 text-xs font-body mb-1.5">Barbeiro *</label>
                    <select
                      value={form.barberId}
                      onChange={e => {
                        const b = barbers.find(x => x.id === e.target.value)
                        setForm(f => ({
                          ...f,
                          barberId: e.target.value,
                          // Duração padrão = tempo de corte do barbeiro (editável no campo Duração)
                          durationMin: b ? String(b.cutDurationMin) : f.durationMin,
                          time: '',
                        }))
                      }}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm font-body focus:outline-none focus:border-[#3a3a3a]"
                    >
                      <option value="">Selecione o barbeiro…</option>
                      {barbers.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                    <p className="text-white/30 text-[11px] font-body mt-1.5">Obrigatório — é o que garante que ninguém marque em cima do horário de outro.</p>
                  </div>
                  <div>
                    <label className="block text-white/45 text-xs font-body mb-1.5">Data *</label>
                    <input
                      type="date"
                      min={todayStr}
                      value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value, time: '' }))}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm font-body focus:outline-none focus:border-[#3a3a3a]"
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div>
                    <label className="block text-white/45 text-xs font-body mb-1.5">Horário * <span className="text-white/25">(início–fim)</span></label>
                    <select
                      value={form.time}
                      onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                      disabled={!form.date || !form.barberId}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm font-body focus:outline-none focus:border-[#3a3a3a] disabled:opacity-50"
                    >
                      <option value="">
                        {!form.barberId ? 'Escolha o barbeiro primeiro' : !form.date ? 'Escolha a data primeiro' : daySlots.length ? 'Selecione…' : 'Sem horários livres nesse dia'}
                      </option>
                      {daySlots.map(s => (
                        <option key={s.time} value={s.time}>{s.time} – {s.end}</option>
                      ))}
                    </select>
                    <p className="text-white/30 text-[11px] font-body mt-1.5">
                      Bloco de {slotDuration} min · só aparecem horários livres do barbeiro
                    </p>
                  </div>
                  <div>
                    <label className="block text-white/45 text-xs font-body mb-1.5">Duração (min)</label>
                    <input
                      type="number"
                      min="5"
                      step="5"
                      value={form.durationMin}
                      onChange={e => setForm(f => ({ ...f, durationMin: e.target.value, time: '' }))}
                      placeholder="30"
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm font-body placeholder:text-white/20 focus:outline-none focus:border-[#3a3a3a]"
                    />
                  </div>
                  <div>
                    <label className="block text-white/45 text-xs font-body mb-1.5">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price}
                      onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      placeholder="0,00"
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm font-body placeholder:text-white/20 focus:outline-none focus:border-[#3a3a3a]"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-white/45 text-xs font-body mb-1.5">Observação</label>
                    <textarea
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      rows={2}
                      placeholder="Ex: pai e filho, cliente do plano, cabelo cacheado…"
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm font-body placeholder:text-white/20 focus:outline-none focus:border-[#3a3a3a] resize-none"
                    />
                    <p className="text-white/25 text-[11px] font-body mt-1.5">Vai para a descrição do cliente na aba Clientes.</p>
                  </div>
                </div>

                <button
                  onClick={handleNewAppointment}
                  disabled={saving || !form.clientName || !form.clientPhone || form.serviceNames.length === 0 || !form.barberId || !form.date || !form.time || (bookingCheck ? !bookingCheck.available : false)}
                  className="w-full py-3 rounded-lg bg-amber-500 text-[#0a0a0a] text-sm font-bold font-body tracking-wide hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando…</> : 'Confirmar Agendamento'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DashboardAgenda
