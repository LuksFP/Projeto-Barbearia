import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { supabasePublic } from '@/lib/supabase-public'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Calendar, Clock, Scissors, AlertCircle, Star, ArrowLeft, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type AptDisplay = {
  id: string
  service_name: string
  date: string
  time: string
  status: string
  barber_name: string
  rating: number | null
  review: string | null
  barbershop_id?: string
}

const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; color: string }> = {
    pending:   { label: 'Aguardando confirmação', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    scheduled: { label: 'Agendado',               color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    confirmed: { label: 'Confirmado',              color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    done:      { label: 'Concluído',               color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    completed: { label: 'Concluído',               color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    cancelled: { label: 'Cancelado',               color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  }
  const s = map[status] ?? { label: status, color: 'text-white/40 bg-white/5 border-white/10' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-body font-medium ${s.color}`}>
      {s.label}
    </span>
  )
}

const ConsultaAgendamento = () => {
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [appointments, setAppointments] = useState<AptDisplay[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ratingId, setRatingId] = useState<string | null>(null)
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)

  const runSearch = async (e?: string, p?: string, showError = true) => {
    const em = e ?? email
    const ph = p ?? phone
    if (!em && !ph) { if (showError) setError('Informe email ou telefone.'); return }
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabasePublic.rpc('search_appointments_by_contact', {
        p_email: em || null,
        p_phone: ph || null,
      })
      if (err) throw err
      setAppointments((data ?? []) as AptDisplay[])
      setSearched(true)
    } catch {
      setError('Erro ao buscar agendamentos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initialEmail = searchParams.get('email') ?? ''
    const initialPhone = searchParams.get('phone') ?? ''
    if (!initialEmail && !initialPhone) return
    setEmail(initialEmail)
    setPhone(initialPhone)
    void runSearch(initialEmail, initialPhone, false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitRating = async () => {
    if (!ratingId || rating === 0) return
    setSubmittingRating(true)
    try {
      await supabasePublic
        .from('appointments')
        .update({ rating, review: review || null })
        .eq('id', ratingId)
      setAppointments(prev => prev.map(a => a.id === ratingId ? { ...a, rating, review: review || null } : a))
      setRatingId(null)
      setRating(0)
      setReview('')
    } finally {
      setSubmittingRating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-white/5">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-white/40 hover:text-white text-sm font-body transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Início
          </Link>
          <span className="font-heading text-lg text-amber-400 tracking-wider">BARBEROS</span>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="font-heading text-3xl tracking-wide text-white mb-2">MEUS AGENDAMENTOS</h1>
        <p className="text-white/40 text-sm font-body mb-8">Informe email ou telefone para consultar.</p>

        {/* Formulário de busca */}
        <div className="p-6 rounded-xl bg-[#141414] border border-[#252525] mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/30 font-body tracking-wide uppercase">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runSearch()}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-white placeholder:text-white/20 text-sm font-body focus:outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/30 font-body tracking-wide uppercase">Telefone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && runSearch()}
                placeholder="(11) 99999-9999"
                className="w-full px-4 py-3 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-white placeholder:text-white/20 text-sm font-body focus:outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>
          </div>
          {error && <p className="text-red-400 text-xs font-body mb-3">{error}</p>}
          <button
            onClick={() => runSearch()}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-amber-500 text-[#0a0a0a] font-semibold font-body text-sm tracking-wide hover:bg-amber-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Buscando…' : 'Buscar agendamentos'}
          </button>
        </div>

        {/* Resultados */}
        {searched && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {appointments.length === 0 ? (
              <div className="p-8 rounded-xl bg-[#141414] border border-[#252525] text-center">
                <AlertCircle className="w-8 h-8 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm font-body">Nenhum agendamento encontrado.</p>
              </div>
            ) : (
              <>
                <p className="text-white/40 text-xs font-body">{appointments.length} agendamento(s) encontrado(s)</p>
                {appointments.map(apt => (
                  <motion.div
                    key={apt.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-xl bg-[#141414] border border-[#252525] space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-white font-semibold font-body">{apt.service_name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={apt.status} />
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-white/40 text-sm font-body flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(apt.date + 'T12:00'), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {apt.time}
                      </span>
                    </div>

                    {/* Avaliação existente */}
                    {apt.rating !== null && apt.rating > 0 && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-white/30 text-xs font-body">Sua nota:</span>
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-3.5 h-3.5 ${s <= apt.rating! ? 'text-amber-400 fill-amber-400' : 'text-white/20'}`} />
                        ))}
                      </div>
                    )}

                    {/* Botão avaliar */}
                    {(apt.status === 'completed' || apt.status === 'done') && !apt.rating && ratingId !== apt.id && (
                      <button
                        onClick={() => { setRatingId(apt.id); setRating(0); setReview('') }}
                        className="flex items-center gap-1.5 text-amber-400/70 hover:text-amber-400 text-xs font-body transition-colors"
                      >
                        <Star className="w-3.5 h-3.5" />
                        Avaliar atendimento
                      </button>
                    )}

                    {/* Form avaliação inline */}
                    <AnimatePresence>
                      {ratingId === apt.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-t border-[#252525] pt-4 space-y-3 overflow-hidden"
                        >
                          <div className="flex items-center gap-2">
                            {[1,2,3,4,5].map(s => (
                              <button key={s} onClick={() => setRating(s)} className="transition-transform hover:scale-110">
                                <Star className={`w-6 h-6 ${s <= rating ? 'text-amber-400 fill-amber-400' : 'text-white/20'}`} />
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={review}
                            onChange={e => setReview(e.target.value)}
                            placeholder="Comentário opcional…"
                            rows={2}
                            className="w-full px-3 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#2a2a2a] text-white placeholder:text-white/20 text-sm font-body focus:outline-none focus:border-amber-500/50 resize-none transition-colors"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleSubmitRating}
                              disabled={rating === 0 || submittingRating}
                              className="px-4 py-2 rounded-lg bg-amber-500 text-[#0a0a0a] text-sm font-semibold font-body hover:bg-amber-400 transition-colors disabled:opacity-40"
                            >
                              {submittingRating ? 'Enviando…' : 'Enviar avaliação'}
                            </button>
                            <button
                              onClick={() => setRatingId(null)}
                              className="px-4 py-2 rounded-lg text-white/30 hover:text-white text-sm font-body transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default ConsultaAgendamento
