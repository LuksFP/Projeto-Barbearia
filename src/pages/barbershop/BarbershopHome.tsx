// Site público de uma barbearia — template profissional configurável por slug

import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Phone, Instagram, MapPin, Clock, Star, Crown, Scissors, ChevronRight, Check, ChevronLeft, Loader2, CheckCircle2, User, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'
import type { PublicSiteOutletCtx } from '@/layouts/PublicSiteLayout'
import { supabasePublic } from '@/lib/supabase-public'
import type { BarbershopService, BarbershopBarber } from '@/types/tenant'

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

const TIME_SLOTS = [
  '09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30','17:00','17:30','18:00',
]

type BookStep = 'service' | 'barber' | 'datetime' | 'contact' | 'done'

// ─── Booking Section ──────────────────────────────────────────────────────────

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
  const [selectedService, setSelectedService] = useState<BarbershopService | null>(null)
  const [selectedBarber, setSelectedBarber] = useState<BarbershopBarber | null | 'any'>('any')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [bookError, setBookError] = useState('')

  const todayStr = new Date().toISOString().split('T')[0]

  const resetBooking = () => {
    setStep('service')
    setSelectedService(null)
    setSelectedBarber('any')
    setSelectedDate('')
    setSelectedTime('')
    setClientName('')
    setClientPhone('')
    setClientEmail('')
    setBookError('')
  }

  const handleBook = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !clientName || !clientPhone) return
    setSubmitting(true)
    setBookError('')

    const barberObj = selectedBarber === 'any' ? null : selectedBarber
    try {
      const { error } = await supabasePublic.from('appointments').insert({
        barbershop_id: barbershop.id,
        service_id: selectedService.id,
        service_name: selectedService.name,
        service_category: selectedService.category,
        price: Number(selectedService.price),
        barber_id: barberObj?.id ?? null,
        barber_name: barberObj?.name ?? 'A definir',
        date: selectedDate,
        time: selectedTime,
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail || null,
        status: 'scheduled',
      })

      if (error) throw error
      setStep('done')

      // Envia email de confirmação ao cliente se ele forneceu email (fire-and-forget)
      if (clientEmail) {
        const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`
        fetch(fnUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'booking_confirmation',
            to: clientEmail,
            clientName,
            barbershopName: barbershop.name,
            serviceName: selectedService.name,
            barberName: barberObj?.name ?? 'A definir',
            date: selectedDate,
            time: selectedTime,
            barbershopSlug: barbershop.slug,
          }),
        }).catch(() => {/* email é best-effort */})
      }
    } catch {
      setBookError('Não foi possível confirmar o agendamento. Tente novamente.')
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
          {selectedService?.name} em {new Date(selectedDate + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} às {selectedTime}
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
          <h3 className="text-white/70 text-sm font-semibold tracking-widest uppercase font-body mb-4">
            Escolha o serviço
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services.map((svc) => (
              <button
                key={svc.id}
                onClick={() => { setSelectedService(svc); setStep('barber') }}
                className="text-left p-4 rounded-xl border transition-all group"
                style={
                  selectedService?.id === svc.id
                    ? { borderColor: primary + '66', backgroundColor: primary + '10' }
                    : { borderColor: '#252525', backgroundColor: '#161616' }
                }
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-white font-semibold text-sm">{svc.name}</span>
                  <span className="font-heading text-base shrink-0 ml-2" style={{ color: primary }}>
                    R$ {Number(svc.price).toFixed(0)}
                  </span>
                </div>
                <p className="text-white/40 text-xs leading-relaxed mb-2">{svc.description}</p>
                <span className="flex items-center gap-1 text-white/30 text-xs">
                  <Clock className="w-3 h-3" />
                  {svc.durationMin} min
                </span>
              </button>
            ))}
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
              onClick={() => { setSelectedBarber('any'); setStep('datetime') }}
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
                onClick={() => { setSelectedBarber(barber); setStep('datetime') }}
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
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-[#161616] border border-[#252525] rounded-xl px-4 py-3 text-white text-sm font-body focus:outline-none focus:border-[#333] transition-colors"
              style={{ colorScheme: 'dark' }}
            />
          </div>
          {selectedDate && (
            <div className="mb-6">
              <label className="block text-white/50 text-xs font-body mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Horário disponível
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {TIME_SLOTS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTime(t)}
                    className="py-2 rounded-lg text-xs font-body font-semibold transition-all"
                    style={
                      selectedTime === t
                        ? { backgroundColor: primary, color: '#0a0a0a' }
                        : { backgroundColor: '#161616', color: 'rgba(255,255,255,0.55)', border: '1px solid #252525' }
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
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
              <span className="text-white/80">{selectedService?.name}</span>
              <span className="ml-auto font-heading" style={{ color: primary }}>R$ {Number(selectedService?.price).toFixed(0)}</span>
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
                <><Loader2 className="w-4 h-4 animate-spin" />Confirmando…</>
              ) : (
                <>Confirmar Agendamento <ChevronRight className="w-4 h-4" /></>
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
  const { barbershop, services, barbers, memberships } = useOutletContext<PublicSiteOutletCtx>()

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
