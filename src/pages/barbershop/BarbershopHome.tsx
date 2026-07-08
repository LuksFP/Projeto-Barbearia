// Site público de uma barbearia — template profissional configurável por slug

import { useState, useEffect, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Phone, Instagram, MapPin, Clock, Star, Crown, Scissors, ChevronRight, Check, ChevronLeft, Loader2, CheckCircle2, User, Calendar, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import type { PublicSiteOutletCtx } from '@/layouts/PublicSiteLayout'
import type { BarbershopService, BarbershopBarber } from '@/types/tenant'
import { supabasePublic } from '@/lib/supabase-public'
import { buildDaySlots, toMin, type BusyRange } from '@/lib/scheduling'

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
}

const TESTIMONIALS = [
  { name: 'Bruno Alves', text: 'Melhor degradê da cidade. Não troco por nada.', stars: 5 },
  { name: 'Pedro Costa', text: 'Ambiente diferenciado, equipe atenciosa. Virei fixo.', stars: 5 },
  { name: 'Diego Santos', text: 'A barba saiu exatamente como eu pedi. Ótimo serviço.', stars: 5 },
]

type BookStep = 'service' | 'barber' | 'datetime' | 'contact' | 'done'

// Guarda nome/telefone/email no navegador do cliente pra prefill nos próximos agendamentos
const SAVED_CONTACT_KEY = 'barberos:client-contact'
function loadSavedContact(): { name?: string; phone?: string; email?: string } {
  try { return JSON.parse(localStorage.getItem(SAVED_CONTACT_KEY) || '{}') } catch { return {} }
}
function saveContact(name: string, phone: string, email: string) {
  try { localStorage.setItem(SAVED_CONTACT_KEY, JSON.stringify({ name, phone, email })) } catch { /* ignore */ }
}

// ─── Booking Section ──────────────────────────────────────────────────────────

function formatCancellationPolicy(policy: NonNullable<PublicSiteOutletCtx['barbershop']['cancellationPolicy']>) {
  const fineStr = policy.fineType === 'fixed'
    ? `R$ ${policy.fineValue.toFixed(0)}`
    : `${policy.fineValue}% do valor do serviço`
  return `Cancelamentos com menos de ${policy.freeWindowHours}h de antecedência estão sujeitos a multa de ${fineStr}.`
}

const BookingSection = ({
  barbershop,
  services,
  barbers,
}: {
  barbershop: PublicSiteOutletCtx['barbershop']
  services: BarbershopService[]
  barbers: BarbershopBarber[]
}) => {
  const primary = barbershop.primaryColor
  const [step, setStep] = useState<BookStep>('service')
  const [selectedServices, setSelectedServices] = useState<BarbershopService[]>([])
  const [selectedBarber, setSelectedBarber] = useState<BarbershopBarber | null | 'any'>('any')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [clientName, setClientName] = useState(() => loadSavedContact().name || '')
  const [clientPhone, setClientPhone] = useState(() => loadSavedContact().phone || '')
  const [clientEmail, setClientEmail] = useState(() => loadSavedContact().email || '')
  const [clientNotes, setClientNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [bookError, setBookError] = useState('')
  const [busy, setBusy] = useState<BusyRange[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const todayStr = new Date().toISOString().split('T')[0]

  // Barbeiro específico escolhido (ou null se "qualquer um")
  const pickedBarber = selectedBarber !== 'any' && selectedBarber ? selectedBarber : null
  // Vários serviços somam preço e duração (ex: barba + sobrancelha)
  const totalPrice = selectedServices.reduce((acc, s) => acc + s.price, 0)
  const totalDuration = selectedServices.reduce((acc, s) => acc + s.durationMin, 0)
  const servicesLabel = selectedServices.map(s => s.name).join(' + ')
  // Duração do atendimento = soma dos serviços (fallback: tempo de corte, ou 30 min)
  const slotDuration = totalDuration || pickedBarber?.cutDurationMin || 30

  const toggleService = (svc: BarbershopService) => {
    setSelectedServices(prev =>
      prev.some(s => s.id === svc.id) ? prev.filter(s => s.id !== svc.id) : [...prev, svc],
    )
    setSelectedTime('')
  }

  // Barbearia demo (id não-UUID) → não existe no banco real; simula ocupados
  const isDemoBarbershop = !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(barbershop.id)

  // Busca horários ocupados do barbeiro na data (RPC seguro — só horário+duração)
  useEffect(() => {
    if (step !== 'datetime' || !selectedDate || !pickedBarber) { setBusy([]); return }

    // Demo: injeta ocupados fixos pra dar pra ver o bloqueio na tela
    if (isDemoBarbershop) {
      setBusy([
        { start: toMin('10:00'), end: toMin('10:00') + 45 },
        { start: toMin('11:30'), end: toMin('11:30') + 30 },
        { start: toMin('15:00'), end: toMin('15:00') + 60 },
        { start: toMin('18:30'), end: toMin('18:30') + 45 },
      ])
      return
    }

    let active = true
    setLoadingSlots(true)
    supabasePublic
      .rpc('public_barber_busy_slots', {
        p_barbershop_id: barbershop.id,
        p_barber_id: pickedBarber.id,
        p_date: selectedDate,
      })
      .then(({ data, error }) => {
        if (!active) return
        if (error || !data) { setBusy([]); return }
        setBusy(data.map(r => {
          const start = toMin(r.slot_time)
          return { start, end: start + (r.slot_duration || 30) }
        }))
      })
      .finally(() => { if (active) setLoadingSlots(false) })
    return () => { active = false }
  }, [step, selectedDate, pickedBarber?.id, barbershop.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const slots = useMemo(() =>
    selectedDate ? buildDaySlots({
      step: slotDuration, duration: slotDuration, busy, now: new Date(), date: selectedDate,
      open: barbershop.openTime, close: barbershop.closeTime,
    }) : []
  , [selectedDate, slotDuration, busy, barbershop.openTime, barbershop.closeTime])

  // Limpa o horário escolhido se ele deixou de estar disponível
  useEffect(() => {
    if (selectedTime && !slots.some(s => s.time === selectedTime && s.available)) setSelectedTime('')
  }, [slots]) // eslint-disable-line react-hooks/exhaustive-deps

  const resetBooking = () => {
    setStep('service')
    setSelectedServices([])
    setSelectedBarber('any')
    setSelectedDate('')
    setSelectedTime('')
    // Mantém nome/telefone/email salvos pra o próximo agendamento
    const s = loadSavedContact()
    setClientName(s.name || '')
    setClientPhone(s.phone || '')
    setClientEmail(s.email || '')
    setClientNotes('')
    setBookError('')
  }

  const handleBook = async () => {
    if (selectedServices.length === 0 || !selectedDate || !selectedTime || !clientName || !clientPhone) return
    setSubmitting(true)
    setBookError('')

    const barberObj = selectedBarber === 'any' ? null : selectedBarber
    // Vários serviços viram um atendimento só: nomes juntos, preço e duração somados
    const category = selectedServices.length > 1 ? 'Combo' : selectedServices[0].category

    // Salva os dados no navegador do cliente pra prefill nos próximos agendamentos
    saveContact(clientName.trim(), clientPhone.trim(), clientEmail.trim())

    // Demo: não grava no banco (id não é real), só mostra a confirmação
    if (isDemoBarbershop) {
      setTimeout(() => { setSubmitting(false); setStep('done') }, 500)
      return
    }
    try {
      const { error } = await supabasePublic.from('appointments').insert({
        barbershop_id: barbershop.id,
        service_id: selectedServices[0].id,
        service_name: servicesLabel,
        service_category: category,
        price: totalPrice,
        barber_id: barberObj?.id ?? null,
        barber_name: barberObj?.name ?? 'A definir',
        date: selectedDate,
        time: selectedTime,
        duration_min: slotDuration,
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail || null,
        notes: clientNotes.trim() || null,
        status: 'pending',
      })
      if (error) throw error
      setStep('done')
    } catch (e: unknown) {
      // Mostra a mensagem do limite anti-abuse (trigger) se vier; senão, genérica.
      const msg = (e && typeof e === 'object' && 'message' in e) ? String((e as { message: unknown }).message) : ''
      setBookError(
        msg.includes('Muitos agendamentos')
          ? msg
          : 'Não foi possível criar o agendamento. Tente novamente.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const StepIndicator = ({ current }: { current: number }) => (
    <div className="flex items-center gap-2 mb-8">
      {['Serviço', 'Barbeiro', 'Data & Hora', 'Contato'].map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
            style={
              i + 1 <= current
                ? { backgroundColor: primary, color: '#0a0a0a' }
                : { backgroundColor: '#1f1f1f', color: 'rgba(255,255,255,0.3)', border: '1px solid #2a2a2a' }
            }
          >
            {i + 1 <= current - 1 ? <Check className="w-3 h-3" /> : i + 1}
          </div>
          <span
            className="text-xs font-body hidden sm:block"
            style={{ color: i + 1 <= current ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)' }}
          >
            {label}
          </span>
          {i < 3 && <div className="w-6 h-px" style={{ backgroundColor: i + 1 < current ? primary + '55' : '#2a2a2a' }} />}
        </div>
      ))}
    </div>
  )

  if (step === 'done') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto text-center py-12"
      >
        <div
          className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
          style={{ backgroundColor: primary + '18', border: `2px solid ${primary}44` }}
        >
          <CheckCircle2 className="w-10 h-10" style={{ color: primary }} />
        </div>
        <h3 className="font-heading text-3xl text-white mb-3 tracking-wide">AGENDADO!</h3>
        <p className="text-white/50 text-sm font-body leading-relaxed mb-2">
          {servicesLabel} em {new Date(selectedDate + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} às {selectedTime}
        </p>
        {selectedBarber !== 'any' && selectedBarber && (
          <p className="text-white/35 text-xs font-body mb-8">com {selectedBarber.name}</p>
        )}
        <p className="text-white/40 text-sm font-body mb-8">
          Em breve você receberá uma confirmação. Até lá!
        </p>
        <button
          onClick={resetBooking}
          className="text-sm font-body underline underline-offset-4 transition-colors"
          style={{ color: primary + 'aa' }}
        >
          Fazer outro agendamento
        </button>
      </motion.div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <StepIndicator current={['service','barber','datetime','contact'].indexOf(step) + 1} />

      {/* Step 1: Serviço */}
      {step === 'service' && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <h3 className="text-white/70 text-sm font-semibold tracking-widest uppercase font-body mb-1">
            Escolha os serviços
          </h3>
          <p className="text-white/35 text-xs font-body mb-4">Pode marcar mais de um (ex: barba + sobrancelha).</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services.map((svc) => {
              const checked = selectedServices.some(s => s.id === svc.id)
              return (
                <button
                  key={svc.id}
                  onClick={() => toggleService(svc)}
                  className="text-left p-4 rounded-xl border transition-all group relative"
                  style={
                    checked
                      ? { borderColor: primary + '66', backgroundColor: primary + '10' }
                      : { borderColor: '#252525', backgroundColor: '#161616' }
                  }
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="flex items-center gap-2 text-white font-semibold text-sm">
                      <span
                        className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors"
                        style={checked
                          ? { backgroundColor: primary, color: '#0a0a0a' }
                          : { border: '1.5px solid #3a3a3a' }}
                      >
                        {checked && <Check className="w-3 h-3" />}
                      </span>
                      {svc.name}
                    </span>
                    <span className="font-heading text-base shrink-0 ml-2" style={{ color: primary }}>
                      R$ {Number(svc.price).toFixed(0)}
                    </span>
                  </div>
                  <p className="text-white/40 text-xs leading-relaxed mb-2 pl-6">{svc.description}</p>
                  <span className="flex items-center gap-1 text-white/30 text-xs pl-6">
                    <Clock className="w-3 h-3" />
                    {svc.durationMin} min
                  </span>
                </button>
              )
            })}
          </div>

          {/* Total + continuar */}
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm font-body">
              {selectedServices.length > 0 ? (
                <span className="text-white/60">
                  {selectedServices.length} {selectedServices.length === 1 ? 'serviço' : 'serviços'} ·{' '}
                  <span className="text-white/90 font-semibold">R$ {totalPrice.toFixed(0)}</span>
                  <span className="text-white/35"> · ~{totalDuration} min</span>
                </span>
              ) : (
                <span className="text-white/30">Selecione ao menos um serviço</span>
              )}
            </div>
            <button
              onClick={() => setStep('barber')}
              disabled={selectedServices.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ backgroundColor: primary, color: '#0a0a0a' }}
            >
              Continuar
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 2: Barbeiro */}
      {step === 'barber' && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <h3 className="text-white/70 text-sm font-semibold tracking-widest uppercase font-body mb-4">
            Escolha o barbeiro
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {/* Qualquer barbeiro */}
            <button
              onClick={() => { setSelectedBarber('any'); setSelectedTime(''); setStep('datetime') }}
              className="text-left p-4 rounded-xl border transition-all"
              style={
                selectedBarber === 'any'
                  ? { borderColor: primary + '66', backgroundColor: primary + '10' }
                  : { borderColor: '#252525', backgroundColor: '#161616' }
              }
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: primary + '15', border: `1px solid ${primary}30` }}
                >
                  <Scissors className="w-4 h-4" style={{ color: primary + 'aa' }} />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">Qualquer barbeiro</p>
                  <p className="text-white/35 text-xs">Primeiro disponível</p>
                </div>
              </div>
            </button>

            {barbers.map((barber) => (
              <button
                key={barber.id}
                onClick={() => { setSelectedBarber(barber); setSelectedTime(''); setStep('datetime') }}
                className="text-left p-4 rounded-xl border transition-all"
                style={
                  selectedBarber !== 'any' && selectedBarber?.id === barber.id
                    ? { borderColor: primary + '66', backgroundColor: primary + '10' }
                    : { borderColor: '#252525', backgroundColor: '#161616' }
                }
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: primary + '15', border: `1px solid ${primary}30` }}
                  >
                    <span className="font-heading text-sm" style={{ color: primary }}>
                      {barber.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{barber.name}</p>
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: primary + 'aa' }}>
                      {barber.specialty}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep('service')}
            className="flex items-center gap-1.5 text-sm text-white/35 hover:text-white/60 font-body transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </button>
        </motion.div>
      )}

      {/* Step 3: Data + Hora */}
      {step === 'datetime' && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <h3 className="text-white/70 text-sm font-semibold tracking-widest uppercase font-body mb-4">
            Escolha a data e horário
          </h3>
          <div className="mb-6">
            <label className="block text-white/50 text-xs font-body mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Data
            </label>
            <input
              type="date"
              min={todayStr}
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime('') }}
              className="w-full bg-[#161616] border border-[#252525] rounded-xl px-4 py-3 text-white text-sm font-body focus:outline-none focus:border-[#333] transition-colors"
              style={{ colorScheme: 'dark' }}
            />
          </div>
          {selectedDate && (
            <div className="mb-6">
              <label className="block text-white/50 text-xs font-body mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Horário disponível <span className="text-white/30">(início–fim · {slotDuration} min)</span>
                {loadingSlots && <Loader2 className="w-3 h-3 animate-spin" />}
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slots.map((s) => {
                  const isSel = selectedTime === s.time
                  return (
                    <button
                      key={s.time}
                      onClick={() => s.available && setSelectedTime(s.time)}
                      disabled={!s.available}
                      className="py-2 rounded-lg font-body transition-all disabled:cursor-not-allowed"
                      style={
                        !s.available
                          ? { backgroundColor: '#111', color: 'rgba(255,255,255,0.2)', border: '1px solid #1c1c1c' }
                          : isSel
                            ? { backgroundColor: primary, color: '#0a0a0a' }
                            : { backgroundColor: '#161616', color: 'rgba(255,255,255,0.6)', border: '1px solid #252525' }
                      }
                    >
                      <span className="block text-xs font-semibold leading-none">{s.time}</span>
                      <span className="block text-[10px] opacity-60 leading-none mt-0.5">
                        {s.available ? `–${s.end}` : 'ocupado'}
                      </span>
                    </button>
                  )
                })}
              </div>
              {slots.length > 0 && slots.every(s => !s.available) && (
                <p className="text-white/35 text-xs font-body mt-3">Nenhum horário livre nesse dia. Tente outra data.</p>
              )}
            </div>
          )}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep('barber')}
              className="flex items-center gap-1.5 text-sm text-white/35 hover:text-white/60 font-body transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </button>
            <button
              onClick={() => setStep('contact')}
              disabled={!selectedDate || !selectedTime}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ backgroundColor: primary, color: '#0a0a0a' }}
            >
              Continuar
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 4: Contato */}
      {step === 'contact' && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <h3 className="text-white/70 text-sm font-semibold tracking-widest uppercase font-body mb-4">
            Seus dados
          </h3>

          {/* Resumo do agendamento */}
          <div className="p-4 rounded-xl bg-[#111] border border-[#222] mb-6 space-y-1.5">
            <p className="text-white/45 text-xs font-body uppercase tracking-widest mb-2">Resumo</p>
            <div className="flex items-center gap-2 text-sm">
              <Scissors className="w-3.5 h-3.5 shrink-0" style={{ color: primary }} />
              <span className="text-white/80">{servicesLabel}</span>
              <span className="ml-auto font-heading" style={{ color: primary }}>R$ {totalPrice.toFixed(0)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/40 pl-6">
              <Clock className="w-3 h-3 shrink-0" />
              ~{slotDuration} min
            </div>
            <div className="flex items-center gap-2 text-sm text-white/50">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              {new Date(selectedDate + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} · {selectedTime}
            </div>
            {selectedBarber !== 'any' && selectedBarber && (
              <div className="flex items-center gap-2 text-sm text-white/50">
                <User className="w-3.5 h-3.5 shrink-0" />
                {selectedBarber.name}
              </div>
            )}
          </div>

          {barbershop.cancellationPolicy?.enabled && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/8 border border-amber-500/20 mb-6">
              <AlertCircle className="w-4 h-4 text-amber-400/70 shrink-0 mt-0.5" />
              <p className="text-amber-400/80 text-xs font-body leading-relaxed">
                {formatCancellationPolicy(barbershop.cancellationPolicy)}
              </p>
            </div>
          )}

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-white/50 text-xs font-body mb-1.5">Nome completo *</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Seu nome"
                className="w-full bg-[#161616] border border-[#252525] rounded-xl px-4 py-3 text-white text-sm font-body placeholder:text-white/20 focus:outline-none focus:border-[#333] transition-colors"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs font-body mb-1.5">Telefone / WhatsApp *</label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full bg-[#161616] border border-[#252525] rounded-xl px-4 py-3 text-white text-sm font-body placeholder:text-white/20 focus:outline-none focus:border-[#333] transition-colors"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs font-body mb-1.5">Email (opcional)</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-[#161616] border border-[#252525] rounded-xl px-4 py-3 text-white text-sm font-body placeholder:text-white/20 focus:outline-none focus:border-[#333] transition-colors"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs font-body mb-1.5">Observação (opcional)</label>
              <textarea
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                rows={2}
                placeholder="Ex: agendamento para pai e filho, cabelo cacheado…"
                className="w-full bg-[#161616] border border-[#252525] rounded-xl px-4 py-3 text-white text-sm font-body placeholder:text-white/20 focus:outline-none focus:border-[#333] transition-colors resize-none"
              />
              <p className="text-white/25 text-[11px] font-body mt-1.5">Fica salvo na sua ficha pra facilitar os próximos.</p>
            </div>
          </div>

          {bookError && (
            <p className="text-red-400 text-sm font-body mb-4">{bookError}</p>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep('datetime')}
              className="flex items-center gap-1.5 text-sm text-white/35 hover:text-white/60 font-body transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </button>
            <button
              onClick={handleBook}
              disabled={submitting || !clientName || !clientPhone}
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-bold tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: primary, color: '#0a0a0a' }}
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Processando…</>
              ) : (
                <>Confirmar agendamento <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const BarbershopHome = () => {
  const { barbershop, services, barbers, memberships, reviews, ratingAvg, ratingCount } = useOutletContext<PublicSiteOutletCtx>()

  const primary = barbershop.primaryColor

  return (
    <div className="font-body">
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        id="home"
        className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0a]"
      >
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(${primary}44 1px, transparent 1px), linear-gradient(90deg, ${primary}44 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10 blur-[120px]"
          style={{ backgroundColor: primary }}
        />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold tracking-wider mb-8"
            style={{ borderColor: primary + '44', backgroundColor: primary + '11', color: primary }}
          >
            <MapPin className="w-3 h-3" />
            {barbershop.address}
          </motion.div>

          {ratingCount > 0 && ratingAvg && (
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}
              className="flex items-center justify-center gap-2 mb-6 text-sm"
            >
              <span className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className="w-4 h-4"
                    style={{ color: primary }}
                    fill={n <= Math.round(ratingAvg) ? primary : 'transparent'}
                  />
                ))}
              </span>
              <span className="text-white/70 font-semibold">{ratingAvg.toFixed(1)}</span>
              <span className="text-white/35">({ratingCount} avaliações)</span>
            </motion.div>
          )}

          <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1}
            className="font-heading text-6xl md:text-8xl lg:text-9xl tracking-wider text-white mb-6 leading-none"
          >
            {barbershop.logoText}
          </motion.h1>

          <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2}
            className="text-xl md:text-2xl text-white/50 mb-4 font-light tracking-wide"
          >
            {barbershop.tagline}
          </motion.p>

          <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={3}
            className="max-w-xl mx-auto text-white/30 text-base leading-relaxed mb-12"
          >
            {barbershop.description}
          </motion.p>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a href="#agendar"
              className="inline-flex items-center gap-2 px-8 py-4 rounded font-semibold text-sm tracking-wide transition-all hover:opacity-90"
              style={{ backgroundColor: primary, color: '#0a0a0a' }}
            >
              Agendar agora
              <ChevronRight className="w-4 h-4" />
            </a>
            <a href="#servicos"
              className="inline-flex items-center gap-2 px-8 py-4 rounded font-semibold text-sm tracking-wide border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all"
            >
              Ver serviços
            </a>
          </motion.div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className="w-px h-16 bg-gradient-to-b from-transparent to-white/10" />
        </div>
      </section>

      {/* ── SERVIÇOS ─────────────────────────────────────────────────────── */}
      <section id="servicos" className="py-24 bg-[#111111]">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={fadeUp} className="mb-14">
            <p className="text-xs font-semibold tracking-[0.3em] uppercase mb-3" style={{ color: primary }}>O que fazemos</p>
            <h2 className="font-heading text-4xl md:text-5xl tracking-wider text-white">SERVIÇOS</h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service, i) => (
              <motion.div key={service.id} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={fadeUp} custom={i}
                className="group p-6 rounded-xl bg-[#161616] border border-[#252525] hover:border-[#333] hover:bg-[#1a1a1a] transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: primary + 'aa' }}>
                      {service.category}
                    </span>
                    <h3 className="text-white font-semibold mt-1 text-lg">{service.name}</h3>
                  </div>
                  <span className="text-xl font-heading" style={{ color: primary }}>R$ {service.price}</span>
                </div>
                <p className="text-white/55 text-sm leading-relaxed">{service.description}</p>
                <div className="mt-4 flex items-center gap-2 text-white/35 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  {service.durationMin} min
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EQUIPE ───────────────────────────────────────────────────────── */}
      <section id="equipe" className="py-24 bg-[#0a0a0a]">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={fadeUp} className="mb-14">
            <p className="text-xs font-semibold tracking-[0.3em] uppercase mb-3" style={{ color: primary }}>Quem cuida de você</p>
            <h2 className="font-heading text-4xl md:text-5xl tracking-wider text-white">A EQUIPE</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {barbers.map((barber, i) => (
              <motion.div key={barber.id} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={fadeUp} custom={i} className="group">
                <div
                  className="aspect-[3/4] rounded-xl mb-5 flex items-end overflow-hidden relative"
                  style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)', border: `1px solid ${primary}22` }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: primary + '22', border: `2px solid ${primary}44` }}
                    >
                      <span className="font-heading text-4xl" style={{ color: primary }}>
                        {barber.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </span>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 rounded-b-xl" style={{ backgroundColor: primary }} />
                </div>
                <h3 className="text-white font-semibold text-lg mb-1">{barber.name}</h3>
                <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: primary }}>
                  {barber.specialty}
                </p>
                <p className="text-white/55 text-sm leading-relaxed">{barber.bio}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GALERIA ──────────────────────────────────────────────────────── */}
      <section id="galeria" className="py-24 bg-[#111111]">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={fadeUp} className="mb-14">
            <p className="text-xs font-semibold tracking-[0.3em] uppercase mb-3" style={{ color: primary }}>Nosso trabalho</p>
            <h2 className="font-heading text-4xl md:text-5xl tracking-wider text-white">GALERIA</h2>
          </motion.div>
          <div className="grid grid-cols-3 grid-rows-2 gap-3 h-[480px]">
            <div className="col-span-2 row-span-2 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
              <Scissors className="w-12 h-12 text-white/10" />
            </div>
            {[0,1,2,3].map((i) => (
              <div key={i} className="rounded-xl bg-[#181818] border border-[#282828] flex items-center justify-center">
                <Scissors className="w-6 h-6 text-white/10" />
              </div>
            ))}
          </div>
          <p className="mt-4 text-white/35 text-xs text-center font-body">
            Acesse {barbershop.instagram} para ver mais trabalhos
          </p>
        </div>
      </section>

      {/* ── DEPOIMENTOS ──────────────────────────────────────────────────── */}
      <section className="py-24 bg-[#0a0a0a]">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={fadeUp} className="mb-14">
            <p className="text-xs font-semibold tracking-[0.3em] uppercase mb-3" style={{ color: primary }}>Quem frequenta</p>
            <h2 className="font-heading text-4xl md:text-5xl tracking-wider text-white">DEPOIMENTOS</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={fadeUp} custom={i}
                className="p-6 rounded-xl bg-[#161616] border border-[#252525]"
              >
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.stars }).map((_, s) => (
                    <Star key={s} className="w-3.5 h-3.5 fill-current" style={{ color: primary }} />
                  ))}
                </div>
                <p className="text-white/65 text-sm leading-relaxed mb-6 italic">"{t.text}"</p>
                <p className="text-white/50 text-xs font-semibold tracking-wide">{t.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CLUBE VIP ────────────────────────────────────────────────────── */}
      <section id="clube" className="py-24 bg-[#111111]">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={fadeUp} className="mb-14">
            <p className="text-xs font-semibold tracking-[0.3em] uppercase mb-3" style={{ color: primary }}>Recorrência + benefícios</p>
            <h2 className="font-heading text-4xl md:text-5xl tracking-wider text-white">CLUBE VIP</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {memberships.map((mem, i) => (
              <motion.div key={mem.id} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-40px' }} variants={fadeUp} custom={i}
                className="relative p-8 rounded-xl border"
                style={{
                  background: i === 0 ? `linear-gradient(135deg, ${primary}0f 0%, transparent 60%)` : 'transparent',
                  borderColor: i === 0 ? primary + '44' : 'rgba(255,255,255,0.06)',
                }}
              >
                {i === 0 && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: primary + '22', color: primary }}
                  >
                    <Crown className="w-3 h-3" />
                    Mais popular
                  </div>
                )}
                <h3 className="font-heading text-2xl tracking-wide text-white mb-1">{mem.name}</h3>
                <div className="flex items-baseline gap-1.5 mb-6">
                  <span className="font-heading text-4xl" style={{ color: primary }}>R$ {mem.price}</span>
                  <span className="text-white/30 text-sm">/{mem.period === 'monthly' ? 'mês' : mem.period === 'quarterly' ? 'trim.' : 'ano'}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {mem.benefits.map((b, bi) => (
                    <li key={bi} className="flex items-start gap-3 text-sm text-white/60">
                      <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: primary }} />
                      {b}
                    </li>
                  ))}
                </ul>
                <a
                  href={`https://wa.me/${barbershop.whatsapp?.replace(/\D/g, '')}?text=Olá, quero assinar o ${mem.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-center py-3 px-6 rounded font-semibold text-sm tracking-wide transition-all hover:opacity-90"
                  style={i === 0
                    ? { backgroundColor: primary, color: '#0a0a0a' }
                    : { border: `1px solid ${primary}44`, color: primary, backgroundColor: 'transparent' }
                  }
                >
                  Assinar {mem.name}
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AVALIAÇÕES (prova social) ─────────────────────────────────────── */}
      {ratingCount > 0 && (
        <section id="avaliacoes" className="py-24 bg-[#111111]">
          <div className="max-w-5xl mx-auto px-6">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={fadeUp} className="mb-14">
              <p className="text-xs font-semibold tracking-[0.3em] uppercase mb-3" style={{ color: primary }}>O que dizem</p>
              <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
                <h2 className="font-heading text-4xl md:text-5xl tracking-wider text-white">AVALIAÇÕES</h2>
                {ratingAvg && (
                  <span className="flex items-center gap-2 pb-1">
                    <span className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className="w-5 h-5" style={{ color: primary }}
                          fill={n <= Math.round(ratingAvg) ? primary : 'transparent'} />
                      ))}
                    </span>
                    <span className="text-white/80 font-bold text-lg">{ratingAvg.toFixed(1)}</span>
                    <span className="text-white/35 text-sm">· {ratingCount} avaliações</span>
                  </span>
                )}
              </div>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviews.filter((r) => r.review).slice(0, 6).map((r, i) => (
                <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }}
                  variants={fadeUp} custom={i % 3}
                  className="rounded-2xl border border-white/8 bg-white/[0.02] p-6 flex flex-col gap-4"
                >
                  <span className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className="w-4 h-4" style={{ color: primary }}
                        fill={n <= r.rating ? primary : 'transparent'} />
                    ))}
                  </span>
                  <p className="text-white/70 text-sm leading-relaxed flex-1">"{r.review}"</p>
                  <p className="text-white/40 text-xs font-semibold">{r.clientLabel}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── AGENDAMENTO ONLINE ────────────────────────────────────────────── */}
      <section id="agendar" className="py-24 bg-[#0a0a0a]">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={fadeUp} className="mb-14">
            <p className="text-xs font-semibold tracking-[0.3em] uppercase mb-3" style={{ color: primary }}>Sem complicação</p>
            <h2 className="font-heading text-4xl md:text-5xl tracking-wider text-white">AGENDAR ONLINE</h2>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Form */}
            <div className="lg:col-span-3 p-8 rounded-2xl bg-[#111] border border-[#1e1e1e]">
              <BookingSection barbershop={barbershop} services={services} barbers={barbers} />
            </div>

            {/* Info lateral */}
            <div className="lg:col-span-2 space-y-6">
              <div className="p-6 rounded-2xl bg-[#111] border border-[#1e1e1e]">
                <p className="text-xs font-semibold tracking-widest uppercase font-body mb-4" style={{ color: primary }}>
                  Prefere pelo WhatsApp?
                </p>
                <a
                  href={`https://wa.me/${barbershop.whatsapp?.replace(/\D/g, '')}?text=Olá, gostaria de agendar um horário`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm tracking-wide transition-all hover:opacity-85 w-full justify-center"
                  style={{ backgroundColor: primary + '15', color: primary, border: `1px solid ${primary}33` }}
                >
                  <Phone className="w-4 h-4" />
                  Falar no WhatsApp
                </a>
              </div>

              <div className="p-6 rounded-2xl bg-[#111] border border-[#1e1e1e] space-y-4">
                <p className="text-xs font-semibold tracking-widest uppercase font-body" style={{ color: primary }}>
                  Informações
                </p>
                <div className="flex items-start gap-3 text-sm text-white/50">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: primary + '88' }} />
                  <span className="font-body">{barbershop.address}, {barbershop.city}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-white/50">
                  <Phone className="w-4 h-4 shrink-0" style={{ color: primary + '88' }} />
                  <span className="font-body">{barbershop.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-white/50">
                  <Instagram className="w-4 h-4 shrink-0" style={{ color: primary + '88' }} />
                  <a
                    href={`https://instagram.com/${barbershop.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-body hover:text-white transition-colors"
                  >
                    {barbershop.instagram}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default BarbershopHome
