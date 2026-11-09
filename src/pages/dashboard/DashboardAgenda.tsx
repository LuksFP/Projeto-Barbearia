import { useState, useEffect, useMemo, useRef } from 'react'
import { Crown, Clock, CheckCircle2, AlertCircle, XCircle, Trash2, Plus, ChevronLeft, ChevronRight, ChevronDown, Loader2, X, Check, MessageCircle } from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
import { appointmentRepository } from '@/repositories/appointmentRepository'
import { mapAppointment } from '@/contexts/TenantContext'
import { isDemoMode } from '@/lib/demo'
import { motion, AnimatePresence } from 'framer-motion'
import type { BarbershopAppointment } from '@/types/tenant'
import { toast } from '@/hooks/use-toast'
import { buildDaySlots, busyRanges, isTimeAvailable, toMin, toHHMM } from '@/lib/scheduling'
import { useAppointmentsLive } from '@/hooks/useAppointmentsLive'
import { buildBookingConfirmation, waUrl } from '@/lib/whatsapp'

const STATUS_CONFIG = {
  done:      { label: 'Concluído', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', icon: CheckCircle2 },
  confirmed: { label: 'Confirmado', color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/20',  icon: Clock },
  pending:   { label: 'Pendente',   color: 'text-white/70',   bg: 'bg-white/5 border-white/10',            icon: AlertCircle },
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
  const { barbershop, barbers, services, clients, addClient, refreshClients, appointments: demoAppointments, isAdmin } = useTenant()
  const [suggestField, setSuggestField] = useState<'name' | 'phone' | null>(null)
  const [clientPickerOpen, setClientPickerOpen] = useState(false)
  const [weekOffset, setWeekOffset]     = useState(0)
  const [selectedIdx, setSelectedIdx]   = useState(todayIndex)
  const [filterBarber, setFilterBarber] = useState<string>('all')
  const [appointments, setAppointments] = useState<BarbershopAppointment[]>([])
  const [loading, setLoading]           = useState(false)
  const [updatingId, setUpdatingId]     = useState<string | null>(null)
  // Apagar pede dois toques: o 1º arma ("Confirmar?"), o 2º apaga. Desarma sozinho.
  const [armedDelete, setArmedDelete]   = useState<string | null>(null)
  const [deleting, setDeleting]         = useState(false)
  const canDelete = isAdmin || isDemoMode()

  useEffect(() => {
    if (!armedDelete) return
    const t = setTimeout(() => setArmedDelete(null), 4000)
    return () => clearTimeout(t)
  }, [armedDelete])

  // Modal "Novo agendamento"
  const [modalOpen, setModalOpen] = useState(false)
  const backdropPress = useRef(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<NewAptForm>(EMPTY_APT)
  // Depois de salvar: tela de "Agendado" com o botão que abre o WhatsApp do
  // cliente já com a confirmação escrita. Precisa ser um toque do barbeiro —
  // abrir sozinho depois do salvamento o celular bloqueia como pop-up.
  const [justBooked, setJustBooked] = useState<{ clientName: string; summary: string; waHref: string } | null>(null)
  useEffect(() => { if (!modalOpen) setJustBooked(null) }, [modalOpen])
  // Clientes já cadastrados que batem com o que está sendo digitado (nome ou telefone)
  const clientSuggestions = useMemo(() => {
    if (!suggestField) return []
    const plain = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    const q = plain((suggestField === 'name' ? form.clientName : form.clientPhone).trim())
    const qDigits = q.replace(/\D/g, '')
    if (q.length < 2) return []
    return clients
      .filter(c => suggestField === 'name'
        ? plain(c.name).includes(q)
        : qDigits.length >= 2 && c.phone.replace(/\D/g, '').includes(qDigits))
      .filter(c => !(c.name === form.clientName && c.phone === form.clientPhone))
      .slice(0, 5)
  }, [suggestField, form.clientName, form.clientPhone, clients])

  const pickClient = (c: { name: string; phone: string }) => {
    setForm(f => ({ ...f, clientName: c.name, clientPhone: c.phone }))
    setSuggestField(null)
    setClientPickerOpen(false)
  }

  const [servicesOpen, setServicesOpen] = useState(false)   // accordion da lista de serviços

  const weekDays    = getWeekDays(weekOffset)
  const selectedDate = weekDays[selectedIdx]?.date ?? ''
  const todayStr = new Date().toISOString().split('T')[0]

  const formBarber   = barbers.find(b => b.id === form.barberId)
  // Vários serviços somam preço E tempo (cada serviço tem sua duração)
  const formServices = services.filter(s => form.serviceNames.includes(s.name))
  const servicesTotalPrice = formServices.reduce((acc, s) => acc + s.price, 0)
  const servicesTotalDuration = formServices.reduce((acc, s) => acc + (s.durationMin || 0), 0)
  // Duração do bloco = soma dos serviços (editável no campo); sem serviços, tempo de corte do barbeiro
  const slotDuration = Math.max(5, Number(form.durationMin) || formBarber?.cutDurationMin || 30)

  // Marca/desmarca um serviço e reajusta preço e duração pela soma dos serviços
  const toggleService = (name: string) => {
    setForm(f => {
      const names = f.serviceNames.includes(name)
        ? f.serviceNames.filter(n => n !== name)
        : [...f.serviceNames, name]
      const picked = services.filter(s => names.includes(s.name))
      const totalPrice = picked.reduce((acc, s) => acc + s.price, 0)
      const totalDuration = picked.reduce((acc, s) => acc + (s.durationMin || 0), 0)
      const barber = barbers.find(b => b.id === f.barberId)
      return {
        ...f,
        serviceNames: names,
        price: names.length ? String(totalPrice) : '',
        // Tempo total = soma dos serviços; sem serviços, volta pro tempo de corte do barbeiro
        durationMin: totalDuration > 0 ? String(totalDuration) : String(barber?.cutDurationMin || 30),
        time: '',
      }
    })
  }

  // A lista da tela só tem o dia aberto na Agenda. Se o formulário estiver em
  // outra data, busca os agendamentos daquele dia — senão tudo pareceria livre.
  const [formDayApts, setFormDayApts] = useState<BarbershopAppointment[] | null>(null)
  const [formDayNonce, setFormDayNonce] = useState(0)
  const formDateIsOpenDay = form.date === selectedDate
  useEffect(() => {
    setFormDayApts(null)
    if (!modalOpen || !barbershop || !form.date || formDateIsOpenDay || isDemoMode()) return
    let active = true
    appointmentRepository
      .listByBarbershop(barbershop.id, form.date)
      .then(rows => { if (active) setFormDayApts(rows.map(mapAppointment)) })
      .catch(() => { if (active) setFormDayApts([]) })
    return () => { active = false }
  }, [modalOpen, barbershop?.id, form.date, formDateIsOpenDay, formDayNonce]) // eslint-disable-line react-hooks/exhaustive-deps
  const formApts = formDateIsOpenDay || isDemoMode() ? appointments : formDayApts
  const formDayLoading = formApts === null

  // Grade do dia do barbeiro (início–fim): passo fino,
  // reservando o bloco cheio (soma dos serviços / duração) e escondendo os
  // ocupados. É o que aparece ao abrir a lista de horário.
  const daySlots = useMemo(() => {
    if (!form.date || !form.barberId || !formApts) return []
    const busy = busyRanges(formApts, form.barberId, form.date)
    return buildDaySlots({
      step: Math.min(30, slotDuration),
      duration: slotDuration,
      busy,
      open: barbershop?.openTime,
      close: barbershop?.closeTime,
      now: new Date(),
      date: form.date,
    })
  }, [form.date, form.barberId, slotDuration, formApts, barbershop?.openTime, barbershop?.closeTime])
  const freeSlotCount = daySlots.filter(s => s.available).length

  // Término do horário escolhido (usado no resumo e na trava do botão)
  const bookingCheck = useMemo(() => {
    if (!form.date || !form.time || !formApts) return null
    const busy = form.barberId ? busyRanges(formApts, form.barberId, form.date) : []
    const end = toMin(form.time) + slotDuration
    return { end: toHHMM(end), available: isTimeAvailable(form.time, slotDuration, busy) }
  }, [form.date, form.time, form.barberId, slotDuration, formApts])

  const openNewModal = () => {
    setForm({ ...EMPTY_APT, date: selectedDate })
    setServicesOpen(false)
    setClientPickerOpen(false)
    setModalOpen(true)
    // Pega também quem agendou pelo site público desde que o painel abriu.
    // Depois da animação: a rebusca re-renderiza o painel todo e engasgava a abertura.
    setTimeout(() => { void refreshClients() }, 400)
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

  // Agendamento feito em outro aparelho (site público, outro barbeiro): rebusca o dia aberto
  useAppointmentsLive(barbershop?.id, event => {
    if (!barbershop) return
    if (event.type !== 'RESYNC' && event.type !== 'DELETE' && event.row.date !== selectedDate) return
    appointmentRepository
      .listByBarbershop(barbershop.id, selectedDate)
      .then(rows => setAppointments(rows.map(mapAppointment)))
      .catch(() => { /* próximo evento/foco tenta de novo */ })
  })

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

  // Só agendamento cancelado pode ser apagado (o resto entra no faturamento).
  const handleDelete = async (ids: string[], key: string) => {
    if (!ids.length) return
    if (armedDelete !== key) { setArmedDelete(key); return }
    setArmedDelete(null)
    if (isDemoMode()) {
      setAppointments(prev => prev.filter(a => !ids.includes(a.id)))
      return
    }
    setDeleting(true)
    try {
      const removed = await appointmentRepository.remove(ids)
      if (removed === 0) {
        toast({ title: 'Não deu pra apagar', description: 'Só o dono ou um administrador pode apagar agendamentos.', variant: 'destructive' })
        return
      }
      setAppointments(prev => prev.filter(a => !ids.includes(a.id)))
      toast({ title: removed === 1 ? 'Agendamento apagado' : `${removed} agendamentos apagados` })
    } catch {
      toast({ title: 'Erro ao apagar', variant: 'destructive' })
    } finally {
      setDeleting(false)
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
      if (!formApts) return
      const busy = busyRanges(formApts, form.barberId, form.date)
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

    const finishBooked = () => {
      const price = form.price ? Number(form.price) : totalPrice
      const waHref = waUrl(form.clientPhone, buildBookingConfirmation({
        clientName: form.clientName,
        shopName: barbershop.name,
        date: form.date,
        time: form.time,
        serviceLabel: label,
        barberName: brb?.name,
        price,
        address: barbershop.address,
      }))
      ensureClient()
      setForm(EMPTY_APT)
      if (!waHref) {
        // Telefone sem DDD/curto: não dá pra montar o link, fecha como antes
        toast({ title: 'Agendamento criado', description: 'O telefone não parece completo (com DDD) para mandar no WhatsApp.' })
        setModalOpen(false)
        return
      }
      const dia = new Date(form.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '')
      setJustBooked({ clientName: form.clientName, summary: `${dia} · ${form.time} · ${label}`, waHref })
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
        finishBooked()
        return
      }
      // Resolve serviço e barbeiro selecionados para gravar os campos que
      // alimentam os relatórios financeiros (service_category, barber_id).
      const row = await appointmentRepository.create({
        barbershop_id: barbershop.id,
        client_name: form.clientName,
        client_phone: form.clientPhone,
        service_name: label,
        service_ids: picked.map(s => s.id),
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
      finishBooked()
    } catch (err: unknown) {
      // 23P01 = exclusion_violation da trava de sobreposição por barbeiro
      const msg = (err && typeof err === 'object' && 'message' in err) ? String((err as { message: unknown }).message) : ''
      const overlap = msg.includes('23P01') || msg.includes('appointments_no_overlap_per_barber')
      if (overlap) {
        // Alguém marcou antes (site/outro aparelho): rebusca pra o horário aparecer em vermelho
        setForm(f => ({ ...f, time: '' }))
        if (formDateIsOpenDay) {
          appointmentRepository.listByBarbershop(barbershop.id, selectedDate)
            .then(rows => setAppointments(rows.map(mapAppointment)))
            .catch(() => {})
        } else {
          setFormDayNonce(n => n + 1)
        }
      }
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

  const cancelledIds = filtered.filter(a => a.status === 'cancelled').map(a => a.id)

  const grouped = filtered.reduce<Record<string, BarbershopAppointment[]>>((acc, apt) => {
    if (!acc[apt.barberName]) acc[apt.barberName] = []
    acc[apt.barberName].push(apt)
    return acc
  }, {})

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/55 text-sm font-body mb-1">
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
        <button onClick={prevWeek} className="p-2 rounded-lg border border-[#262626] text-white/65 hover:text-white hover:border-[#333] transition-all">
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
                      : 'border border-[#262626] text-white/65 hover:border-[#333] hover:text-white/70'
                }`}
              >
                {day.label}
              </button>
            )
          })}
        </div>
        <button onClick={nextWeek} className="p-2 rounded-lg border border-[#262626] text-white/65 hover:text-white hover:border-[#333] transition-all">
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
              : 'border border-[#262626] text-white/65 hover:border-[#333] hover:text-white/70'
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
                : 'border border-[#262626] text-white/65 hover:border-[#333] hover:text-white/70'
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
        <p className="text-white/55 text-sm font-body text-center py-12">
          Nenhum agendamento para {weekDays[selectedIdx]?.label ?? 'este dia'}.
        </p>
      )}

      {/* Limpa os cancelados do dia (e do barbeiro filtrado) de uma vez */}
      {!loading && canDelete && cancelledIds.length > 1 && (
        <div className="flex justify-end">
          <button
            onClick={() => void handleDelete(cancelledIds, 'all')}
            disabled={deleting}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body font-semibold border transition-all disabled:opacity-40 ${
              armedDelete === 'all'
                ? 'bg-red-500 text-white border-red-500'
                : 'text-red-400/80 border-red-400/20 hover:bg-red-400/10'
            }`}
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            {armedDelete === 'all'
              ? `Toque de novo pra apagar ${cancelledIds.length}`
              : `Apagar cancelados (${cancelledIds.length})`}
          </button>
        </div>
      )}

      {/* Lista agrupada por barbeiro */}
      {!loading && Object.entries(grouped).map(([barberName, apts]) => (
        <motion.div key={barberName} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <p className="text-white/55 text-xs font-semibold tracking-widest uppercase font-body px-1 mb-3">
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
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="font-heading text-xl text-white/75 w-14 shrink-0 text-center">
                    {apt.time}
                  </span>
                  <div className="w-px h-10 bg-[#2a2a2a] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{apt.clientName}</p>
                    <p className="text-white/65 text-xs">
                      {apt.serviceName}
                      {apt.price != null && (
                        <span className="text-white/55"> · R$ {apt.price.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</span>
                      )}
                    </p>
                  </div>
                  {/* No celular as etiquetas descem pra uma linha própria; senão comem o nome */}
                  <div className="flex items-center gap-2 max-sm:w-full max-sm:pl-[74px]">
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

                {/* Cancelado: pode apagar (dono/admin) */}
                {apt.status === 'cancelled' && canDelete && (
                  <div className="flex items-center gap-2 mt-3 pl-[74px]">
                    <button
                      onClick={() => void handleDelete([apt.id], apt.id)}
                      disabled={deleting}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-body font-semibold border transition-all disabled:opacity-40 ${
                        armedDelete === apt.id
                          ? 'bg-red-500 text-white border-red-500'
                          : 'text-white/65 border-[#2a2a2a] hover:text-red-400 hover:border-red-400/30'
                      }`}
                    >
                      <Trash2 className="w-3 h-3" />
                      {armedDelete === apt.id ? 'Confirmar exclusão' : 'Apagar'}
                    </button>
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
            animate={{ opacity: 1, transition: { duration: 0.15 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-4"
          >
            {/* Fundo só fecha se o toque COMEÇOU e TERMINOU nele: arrastar a
                lista, abrir o teclado ou errar por 1px não fecha o formulário. */}
            <div
              className="absolute inset-0 bg-black/70"
              onPointerDown={e => { backdropPress.current = e.target === e.currentTarget }}
              onClick={e => {
                if (backdropPress.current && e.target === e.currentTarget) setModalOpen(false)
                backdropPress.current = false
              }}
            />
            <motion.div
              initial={{ y: 16 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="relative w-full max-w-3xl bg-[#111] sm:border border-[#222] sm:rounded-2xl overflow-hidden flex flex-col h-[100dvh] sm:h-auto sm:max-h-[92vh]"
            >
              {/* Cabeçalho */}
              <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-[#1f1f1f]">
                <div>
                  <p className="text-amber-500/80 text-[11px] font-body font-semibold tracking-[0.18em] uppercase">Agenda</p>
                  <h2 className="font-heading text-2xl tracking-wide text-white leading-none mt-1">NOVO AGENDAMENTO</h2>
                </div>
                <button onClick={() => setModalOpen(false)} aria-label="Fechar" className="text-white/55 hover:text-white transition-colors p-1 -mr-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {justBooked ? (
                <div className="px-6 py-10 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <Check className="w-7 h-7 text-emerald-400" />
                  </div>
                  <p className="font-heading text-2xl tracking-wide text-white mt-4">AGENDADO</p>
                  <p className="text-sm font-body text-white/70 mt-1">{justBooked.clientName}</p>
                  <p className="text-xs font-body text-white/60 mt-0.5">{justBooked.summary}</p>
                  <a
                    href={justBooked.waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setModalOpen(false)}
                    className="mt-7 w-full max-w-sm py-3.5 px-6 rounded-xl bg-[#25D366] text-[#0a0a0a] text-sm font-bold font-body tracking-wide hover:bg-[#3ee07a] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Confirmar no WhatsApp
                  </a>
                  <p className="text-[11px] font-body text-white/55 mt-2 max-w-sm">
                    Abre a conversa com dia, horário, serviço e valor já escritos — é só tocar em enviar.
                  </p>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="mt-5 text-sm font-body text-white/65 hover:text-white/70 transition-colors"
                  >
                    Agora não
                  </button>
                </div>
              ) : (<>
              {/* Corpo: quem/o quê à esquerda, quando à direita (painel mais escuro) */}
              <div className="flex-1 overflow-y-auto scrollbar-none grid lg:grid-cols-[1.1fr_0.9fr]">
                <div className="p-6 space-y-6">
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-white/60 text-[11px] font-body font-semibold tracking-[0.18em] uppercase">Cliente</h3>
                      {clients.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setClientPickerOpen(o => !o)}
                          className="flex items-center gap-1 text-xs font-body text-amber-400 hover:text-amber-300 transition-colors"
                        >
                          Já é cliente? Buscar ({clients.length})
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${clientPickerOpen ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>
                    {clientPickerOpen && (
                        <div className="mt-2 space-y-1.5 max-h-52 overflow-y-auto scrollbar-none pr-0.5">
                          {clients.map(c => (
                            <button
                              type="button"
                              key={c.id}
                              onClick={() => pickClient(c)}
                              className="group w-full flex items-center gap-3 px-3 py-2 rounded-xl border border-[#272727] bg-[#161616] hover:border-amber-500/40 hover:bg-amber-500/5 text-left transition-colors"
                            >
                              <span className="w-7 h-7 rounded-full bg-[#222] text-white/75 group-hover:text-amber-400 flex items-center justify-center text-[11px] font-heading shrink-0 transition-colors">
                                {c.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                              </span>
                              <span className="text-sm font-body text-white/80 group-hover:text-white flex-1 min-w-0 truncate">{c.name}</span>
                              <span className="text-xs font-body text-white/60 shrink-0">{c.phone}</span>
                            </button>
                          ))}
                        </div>
                      )}

                    <div className="grid sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="block text-white/65 text-xs font-body mb-1.5">Nome do cliente *</label>
                    <input
                      type="text"
                      value={form.clientName}
                      onChange={e => { setForm(f => ({ ...f, clientName: e.target.value })); setSuggestField('name') }}
                      onFocus={() => setSuggestField('name')}
                      onBlur={() => setSuggestField(null)}
                      autoComplete="off"
                      placeholder="Nome completo"
                      className="w-full bg-[#161616] border border-[#272727] rounded-xl px-3.5 py-2.5 text-white text-sm font-body placeholder:text-white/40 focus:outline-none focus-visible:outline-none focus:border-amber-500/40 transition-colors"
                    />
                    {suggestField === 'name' && clientSuggestions.length > 0 && (
                      <ul className="absolute z-20 left-0 right-0 mt-1 rounded-lg border border-[#2a2a2a] bg-[#161616] shadow-xl overflow-hidden">
                        {clientSuggestions.map(c => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onMouseDown={e => { e.preventDefault(); pickClient(c) }}
                              className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-white/5 transition-colors"
                            >
                              <span className="text-white text-sm font-body truncate">{c.name}</span>
                              <span className="text-white/65 text-xs font-body shrink-0">{c.phone}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="relative">
                    <label className="block text-white/65 text-xs font-body mb-1.5">Telefone *</label>
                    <input
                      type="tel"
                      value={form.clientPhone}
                      onChange={e => { setForm(f => ({ ...f, clientPhone: e.target.value })); setSuggestField('phone') }}
                      onFocus={() => setSuggestField('phone')}
                      onBlur={() => setSuggestField(null)}
                      autoComplete="off"
                      placeholder="(00) 00000-0000"
                      className="w-full bg-[#161616] border border-[#272727] rounded-xl px-3.5 py-2.5 text-white text-sm font-body placeholder:text-white/40 focus:outline-none focus-visible:outline-none focus:border-amber-500/40 transition-colors"
                    />
                    {suggestField === 'phone' && clientSuggestions.length > 0 && (
                      <ul className="absolute z-20 left-0 right-0 mt-1 rounded-lg border border-[#2a2a2a] bg-[#161616] shadow-xl overflow-hidden">
                        {clientSuggestions.map(c => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onMouseDown={e => { e.preventDefault(); pickClient(c) }}
                              className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-white/5 transition-colors"
                            >
                              <span className="text-white text-sm font-body truncate">{c.name}</span>
                              <span className="text-white/65 text-xs font-body shrink-0">{c.phone}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-white/60 text-[11px] font-body font-semibold tracking-[0.18em] uppercase">Atendimento</h3>
                  <div>
                    <label className="block text-white/65 text-xs font-body mb-1.5">Serviços *</label>
                    {/* Trigger do accordion — fechado mostra só o resumo */}
                    <button
                      type="button"
                      onClick={() => setServicesOpen(o => !o)}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-colors"
                      style={form.serviceNames.length > 0
                        ? { borderColor: 'rgba(245,158,11,0.45)', backgroundColor: 'rgba(245,158,11,0.08)' }
                        : { borderColor: '#272727', backgroundColor: '#161616' }}
                    >
                      <span className={`text-sm font-body flex-1 min-w-0 truncate ${form.serviceNames.length > 0 ? 'text-white font-medium' : 'text-white/65'}`}>
                        {form.serviceNames.length === 0
                          ? 'Selecionar serviços…'
                          : form.serviceNames.length === 1
                            ? formServices[0]?.name
                            : `${formServices[0]?.name} +${form.serviceNames.length - 1}`}
                      </span>
                      {form.serviceNames.length > 0 && (
                        <span className="text-amber-400 text-sm font-heading shrink-0">R$ {servicesTotalPrice}</span>
                      )}
                      <ChevronDown className={`w-4 h-4 text-white/65 shrink-0 transition-transform duration-200 ${servicesOpen ? 'rotate-180' : ''}`} />
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
                              <span className="text-[11px] font-body text-white/60 shrink-0 tabular-nums">{s.durationMin}min</span>
                              <span className="text-sm font-heading text-amber-400 shrink-0">R$ {s.price}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-white/65 text-xs font-body mb-1.5">Barbeiro *</label>
                    <div className="relative">
<select
                      value={form.barberId}
                      onChange={e => {
                        const b = barbers.find(x => x.id === e.target.value)
                        setForm(f => ({
                          ...f,
                          barberId: e.target.value,
                          // Com serviços escolhidos mantém a soma; sem serviços usa o tempo de corte do barbeiro
                          durationMin: f.serviceNames.length > 0 ? f.durationMin : (b ? String(b.cutDurationMin) : f.durationMin),
                          time: '',
                        }))
                      }}
                      className={`appearance-none pr-9 w-full bg-[#161616] border border-[#272727] rounded-xl px-3.5 py-2.5 text-sm font-body focus:outline-none focus-visible:outline-none focus:border-amber-500/40 transition-colors ${form.barberId ? 'text-white' : 'text-white/65'}`}
                    >
                      <option value="">Selecione o barbeiro…</option>
                      {barbers.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
<ChevronDown className="w-4 h-4 text-white/65 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
</div>
                    <p className="text-white/55 text-[11px] font-body mt-1.5">Garante que ninguém marque em cima do horário de outro.</p>
                  </div>
                    <div>
                      <label className="block text-white/65 text-xs font-body mb-1.5">Observação <span className="text-white/55">(vai para o cadastro do cliente)</span></label>
                      <textarea
                        value={form.notes}
                        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                        rows={2}
                        placeholder="Ex: pai e filho, cabelo cacheado…"
                        className="w-full bg-[#161616] border border-[#272727] rounded-xl px-3.5 py-2.5 text-white text-sm font-body placeholder:text-white/40 focus:outline-none focus-visible:outline-none focus:border-amber-500/40 transition-colors resize-none"
                      />
                    </div>
                  </section>
                </div>

                <div className="p-6 space-y-5 bg-[#0d0d0d] lg:border-l border-t lg:border-t-0 border-[#1f1f1f]">
                  <section className="space-y-3">
                    <h3 className="text-white/60 text-[11px] font-body font-semibold tracking-[0.18em] uppercase">Quando</h3>
                    <input
                      type="date"
                      aria-label="Data"
                      min={todayStr}
                      value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value, time: '' }))}
                      className="w-full bg-[#161616] border border-[#272727] rounded-xl px-3.5 py-2.5 text-white text-sm font-body placeholder:text-white/40 focus:outline-none focus-visible:outline-none focus:border-amber-500/40 transition-colors"
                      style={{ colorScheme: 'dark' }}
                    />
                    {!form.barberId || !form.date ? (
                      <p className="rounded-xl border border-dashed border-[#2a2a2a] px-4 py-6 text-center text-white/60 text-xs font-body">
                        {!form.barberId ? 'Escolha o barbeiro para ver os horários livres.' : 'Escolha a data para ver os horários livres.'}
                      </p>
                    ) : formDayLoading ? (
                      <p className="rounded-xl border border-dashed border-[#2a2a2a] px-4 py-6 text-center text-white/60 text-xs font-body">
                        Vendo os horários ocupados desse dia…
                      </p>
                    ) : daySlots.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-red-400/25 px-4 py-6 text-center text-red-300/70 text-xs font-body">
                        Sem horários livres nesse dia. Tente outra data.
                      </p>
                    ) : (
                      <div>
                        <p className="text-white/65 text-xs font-body mb-2">
                          Horários <span className="text-white/55">· bloco de {slotDuration} min · {freeSlotCount} {freeSlotCount === 1 ? 'livre' : 'livres'}</span>
                        </p>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {daySlots.map(sl => {
                            if (!sl.available) {
                              return (
                                <div
                                  key={sl.time}
                                  aria-disabled="true"
                                  title={sl.block === 'nao-cabe'
                                    ? `Às ${sl.time} não dá: ${slotDuration} min iriam até ${sl.end} e invadem o próximo cliente.`
                                    : `${sl.time} já tem cliente marcado com ${formBarber?.name ?? 'esse barbeiro'}.`}
                                  className="py-1.5 rounded-lg border border-red-500/20 bg-red-500/[0.06] text-center cursor-not-allowed select-none"
                                >
                                  <span className="block text-sm font-heading tracking-wide tabular-nums text-red-300/50 line-through leading-tight">{sl.time}</span>
                                  <span className="block text-[10px] font-body text-red-300/70 leading-tight">{sl.block === 'nao-cabe' ? 'Não cabe' : 'Ocupado'}</span>
                                </div>
                              )
                            }
                            const on = form.time === sl.time
                            return (
                              <button
                                type="button"
                                key={sl.time}
                                onClick={() => setForm(f => ({ ...f, time: sl.time }))}
                                aria-pressed={on}
                                className={`py-2 rounded-lg border text-sm font-heading tracking-wide tabular-nums transition-colors focus-visible:outline-none ${on
                                  ? 'bg-amber-500 border-amber-500 text-[#0a0a0a]'
                                  : 'bg-[#161616] border-[#272727] text-white/70 hover:border-amber-500/40 hover:text-white'}`}
                              >
                                {sl.time}
                              </button>
                            )
                          })}
                        </div>
                        <p className="text-white/55 text-[11px] font-body mt-2">
                          {freeSlotCount === 0
                            ? `${formBarber?.name ?? 'Esse barbeiro'} está lotado nesse dia com ${slotDuration} min. Tente outra data ou outro barbeiro.`
                            : `Vermelho = não dá pra marcar. “Não cabe”: o horário está livre, mas ${slotDuration} min invadem o próximo cliente.`}
                        </p>
                      </div>
                    )}
                  </section>

                  <section className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-white/65 text-xs font-body mb-1.5">
                        Duração (min)
                        {servicesTotalDuration > 0 && <span className="text-white/55"> · soma dos serviços</span>}
                      </label>
                      <input
                        type="number"
                        min="5"
                        step="5"
                        value={form.durationMin}
                        onChange={e => setForm(f => ({ ...f, durationMin: e.target.value, time: '' }))}
                        placeholder="30"
                        className="w-full bg-[#161616] border border-[#272727] rounded-xl px-3.5 py-2.5 text-white text-sm font-body placeholder:text-white/40 focus:outline-none focus-visible:outline-none focus:border-amber-500/40 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-white/65 text-xs font-body mb-1.5">Valor (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.price}
                        onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                        placeholder="0,00"
                        className="w-full bg-[#161616] border border-[#272727] rounded-xl px-3.5 py-2.5 text-white text-sm font-body placeholder:text-white/40 focus:outline-none focus-visible:outline-none focus:border-amber-500/40 transition-colors"
                      />
                    </div>
                  </section>
                </div>
              </div>

              {/* Rodapé fixo: resumo + confirmar */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 px-6 py-4 border-t border-[#1f1f1f] bg-[#111]">
                <p className="flex-1 min-w-0 text-xs font-body text-white/65 leading-relaxed">
                  {[
                    form.clientName.trim() || null,
                    form.date ? new Date(form.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '') : null,
                    form.time ? `${form.time}${bookingCheck ? '–' + bookingCheck.end : ''}` : null,
                    barbers.find(b => b.id === form.barberId)?.name ?? null,
                  ].filter(Boolean).join(' · ') || 'Preencha os dados ao lado para marcar.'}
                  {(form.price || servicesTotalPrice > 0) && (
                    <span className="text-amber-400 font-heading text-sm ml-2">R$ {form.price || servicesTotalPrice}</span>
                  )}
                </p>
                <button
                  onClick={handleNewAppointment}
                  disabled={saving || !form.clientName || !form.clientPhone || form.serviceNames.length === 0 || !form.barberId || !form.date || !form.time || (bookingCheck ? !bookingCheck.available : false)}
                  className="sm:min-w-[220px] py-3 px-6 rounded-xl bg-amber-500 text-[#0a0a0a] text-sm font-bold font-body tracking-wide hover:bg-amber-400 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando…</> : 'Confirmar agendamento'}
                </button>
              </div>
              </>)}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DashboardAgenda
