import { useState } from 'react'
import { Crown, Users, TrendingUp, Plus, Check, X, Pencil, Scissors, Building2, Loader2 } from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
import { membershipRepository } from '@/repositories/membershipRepository'
import { isDemoMode } from '@/lib/demo'
import { motion, AnimatePresence } from 'framer-motion'
import type { BarbershopMembership } from '@/types/tenant'

// ─── Form ─────────────────────────────────────────────────────────────────────

interface MembershipDraft {
  name: string
  price: string
  period: 'monthly' | 'quarterly' | 'annual'
  benefits: string[]
  benefitInput: string
  scope: 'barbershop' | 'barber'
  barberId: string
}

const EMPTY_DRAFT: MembershipDraft = {
  name: '', price: '', period: 'monthly',
  benefits: [], benefitInput: '',
  scope: 'barbershop', barberId: '',
}

function draftFromMembership(m: BarbershopMembership): MembershipDraft {
  return {
    name: m.name,
    price: String(m.price),
    period: m.period,
    benefits: [...m.benefits],
    benefitInput: '',
    scope: m.barberId ? 'barber' : 'barbershop',
    barberId: m.barberId ?? '',
  }
}

const PERIOD_LABELS = { monthly: 'Mensal', quarterly: 'Trimestral', annual: 'Anual' }

interface MembershipFormProps {
  draft: MembershipDraft
  onChange: (d: MembershipDraft) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  barbers: { id: string; name: string }[]
}

const MembershipForm = ({ draft, onChange, onSave, onCancel, saving, barbers }: MembershipFormProps) => {
  const set = (key: keyof MembershipDraft, val: unknown) => onChange({ ...draft, [key]: val })

  const addBenefit = () => {
    const b = draft.benefitInput.trim()
    if (!b) return
    onChange({ ...draft, benefits: [...draft.benefits, b], benefitInput: '' })
  }

  const removeBenefit = (i: number) => {
    onChange({ ...draft, benefits: draft.benefits.filter((_, idx) => idx !== i) })
  }

  const valid = draft.name.trim().length > 0 && Number(draft.price) > 0 &&
    (draft.scope === 'barbershop' || draft.barberId.length > 0)

  return (
    <div className="p-5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl space-y-4">

      {/* Nome + preço */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-white/35 text-xs font-body mb-1.5 block">Nome do plano</label>
          <input
            value={draft.name}
            onChange={e => set('name', e.target.value)}
            placeholder="ex: Corvo VIP, Lucas Premium"
            className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white font-body placeholder:text-white/20 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <div>
          <label className="text-white/35 text-xs font-body mb-1.5 block">Preço (R$)</label>
          <input
            type="number" min="0" step="1"
            value={draft.price}
            onChange={e => set('price', e.target.value)}
            placeholder="149"
            className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white font-body placeholder:text-white/20 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Período + vínculo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-white/35 text-xs font-body mb-1.5 block">Periodicidade</label>
          <select
            value={draft.period}
            onChange={e => set('period', e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white font-body focus:outline-none focus:border-amber-500/50 appearance-none"
          >
            <option value="monthly">Mensal</option>
            <option value="quarterly">Trimestral</option>
            <option value="annual">Anual</option>
          </select>
        </div>
        <div>
          <label className="text-white/35 text-xs font-body mb-1.5 block">Vinculado a</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onChange({ ...draft, scope: 'barbershop', barberId: '' })}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-body border transition-all ${
                draft.scope === 'barbershop'
                  ? 'bg-amber-500/15 border-amber-500/35 text-amber-400'
                  : 'border-[#2e2e2e] text-white/40 hover:text-white/60'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Barbearia
            </button>
            <button
              type="button"
              onClick={() => set('scope', 'barber')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-body border transition-all ${
                draft.scope === 'barber'
                  ? 'bg-amber-500/15 border-amber-500/35 text-amber-400'
                  : 'border-[#2e2e2e] text-white/40 hover:text-white/60'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              Barbeiro
            </button>
          </div>
        </div>
      </div>

      {/* Seletor de barbeiro */}
      {draft.scope === 'barber' && (
        <div>
          <label className="text-white/35 text-xs font-body mb-1.5 block">Barbeiro</label>
          <select
            value={draft.barberId}
            onChange={e => set('barberId', e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white font-body focus:outline-none focus:border-amber-500/50 appearance-none"
          >
            <option value="">Selecione…</option>
            {barbers.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Benefícios */}
      <div>
        <label className="text-white/35 text-xs font-body mb-1.5 block">Benefícios</label>
        <div className="flex gap-2 mb-2">
          <input
            value={draft.benefitInput}
            onChange={e => set('benefitInput', e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addBenefit() } }}
            placeholder="ex: 2 cortes/mês inclusos"
            className="flex-1 bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white font-body placeholder:text-white/20 focus:outline-none focus:border-amber-500/50"
          />
          <button
            type="button"
            onClick={addBenefit}
            className="px-3 py-2 rounded-lg bg-white/5 border border-[#2e2e2e] text-white/50 hover:text-white text-xs font-body transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {draft.benefits.length > 0 && (
          <ul className="space-y-1.5">
            {draft.benefits.map((b, i) => (
              <li key={i} className="flex items-center gap-2 text-sm font-body text-white/60">
                <Check className="w-3.5 h-3.5 text-amber-400/60 shrink-0" />
                <span className="flex-1">{b}</span>
                <button onClick={() => removeBenefit(i)} className="text-white/20 hover:text-red-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Ações */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white/40 hover:text-white font-body transition-colors">
          <X className="w-3.5 h-3.5" />Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={!valid || saving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 text-[#0a0a0a] text-sm font-semibold font-body hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

// ─── Card do plano ────────────────────────────────────────────────────────────

interface PlanCardProps {
  mem: BarbershopMembership
  onEdit: () => void
  editing: boolean
}

const PlanCard = ({ mem, onEdit, editing }: PlanCardProps) => {
  const isBarberPlan = !!mem.barberId

  return (
    <div className={`p-6 rounded-xl border transition-all ${
      editing
        ? 'border-amber-500/40 bg-amber-500/[0.06] rounded-b-none'
        : isBarberPlan
        ? 'border-blue-500/20 bg-blue-500/[0.03]'
        : 'border-amber-500/20 bg-amber-500/[0.04]'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-white font-semibold font-body text-lg truncate">{mem.name}</h3>
            {isBarberPlan && (
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/20 text-blue-400 font-body shrink-0">
                <Scissors className="w-2.5 h-2.5" />
                {mem.barberName}
              </span>
            )}
            {!isBarberPlan && (
              <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400/70 font-body shrink-0">
                <Building2 className="w-2.5 h-2.5" />
                Barbearia
              </span>
            )}
          </div>
          <p className="text-white/30 text-xs font-body">{PERIOD_LABELS[mem.period]}</p>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className={`font-heading text-2xl ${isBarberPlan ? 'text-blue-400' : 'text-amber-400'}`}>
            R$ {mem.price}
          </p>
          <p className="text-white/30 text-xs font-body">{mem.subscriberCount} assinantes</p>
        </div>
      </div>

      <ul className="space-y-1.5 mb-5">
        {mem.benefits.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-white/55 font-body">
            <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isBarberPlan ? 'text-blue-400/60' : 'text-amber-400/60'}`} />
            {b}
          </li>
        ))}
      </ul>

      <div className="space-y-1.5 mb-5">
        <div className="flex justify-between text-xs font-body text-white/20">
          <span>Assinantes</span>
          <span>{mem.subscriberCount} / 50</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#2a2a2a] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${isBarberPlan ? 'bg-blue-400' : 'bg-amber-500'}`}
            style={{ width: `${Math.min((mem.subscriberCount / 50) * 100, 100)}%` }}
          />
        </div>
      </div>

      <button
        onClick={onEdit}
        className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-body border transition-all ${
          editing
            ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
            : 'border-[#333] text-white/40 hover:text-white hover:border-[#444]'
        }`}
      >
        <Pencil className="w-3.5 h-3.5" />
        {editing ? 'Editando…' : 'Editar plano'}
      </button>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

const DashboardClube = () => {
  const { barbershop, barbers, memberships, updateMemberships } = useTenant()

  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editDraft, setEditDraft]   = useState<MembershipDraft>(EMPTY_DRAFT)
  const [creating, setCreating]     = useState(false)
  const [newDraft, setNewDraft]     = useState<MembershipDraft>(EMPTY_DRAFT)
  const [saving, setSaving]         = useState(false)

  const activeBarbers = barbers.filter(b => b.active)

  const totalSubs = memberships.reduce((acc, m) => acc + m.subscriberCount, 0)
  const mrr       = memberships.reduce((acc, m) => {
    const monthly = m.period === 'monthly' ? m.price : m.period === 'quarterly' ? m.price / 3 : m.price / 12
    return acc + monthly * m.subscriberCount
  }, 0)

  // ── Editar ──────────────────────────────────────────────────────────────────

  const startEdit = (m: BarbershopMembership) => {
    setEditingId(m.id)
    setEditDraft(draftFromMembership(m))
    setCreating(false)
  }

  const saveEdit = async () => {
    if (!editingId || !barbershop) return
    setSaving(true)
    const barberObj = activeBarbers.find(b => b.id === editDraft.barberId)
    const next: BarbershopMembership = {
      id: editingId,
      barbershopId: barbershop.id,
      name: editDraft.name.trim(),
      price: Number(editDraft.price),
      period: editDraft.period,
      benefits: editDraft.benefits,
      active: true,
      subscriberCount: memberships.find(m => m.id === editingId)?.subscriberCount ?? 0,
      barberId: editDraft.scope === 'barber' ? editDraft.barberId : undefined,
      barberName: editDraft.scope === 'barber' ? barberObj?.name : undefined,
    }
    try {
      if (!isDemoMode()) {
        await membershipRepository.update(editingId, {
          name: next.name,
          price: next.price,
          period: next.period,
          benefits: next.benefits,
        })
      }
      updateMemberships(memberships.map(m => m.id === editingId ? next : m))
      setEditingId(null)
    } catch (err) {
      console.error('Failed to update membership:', err)
    } finally {
      setSaving(false)
    }
  }

  // ── Criar ───────────────────────────────────────────────────────────────────

  const saveCreate = async () => {
    if (!barbershop) return
    setSaving(true)
    const barberObj = activeBarbers.find(b => b.id === newDraft.barberId)
    try {
      let newId = `mem-${Date.now()}`
      if (!isDemoMode()) {
        const row = await membershipRepository.create({
          barbershop_id: barbershop.id,
          name: newDraft.name.trim(),
          price: Number(newDraft.price),
          period: newDraft.period,
          benefits: newDraft.benefits,
          active: true,
        })
        newId = row.id
      }
      const created: BarbershopMembership = {
        id: newId,
        barbershopId: barbershop.id,
        name: newDraft.name.trim(),
        price: Number(newDraft.price),
        period: newDraft.period,
        benefits: newDraft.benefits,
        active: true,
        subscriberCount: 0,
        barberId: newDraft.scope === 'barber' ? newDraft.barberId : undefined,
        barberName: newDraft.scope === 'barber' ? barberObj?.name : undefined,
      }
      updateMemberships([...memberships, created])
      setCreating(false)
    } catch (err) {
      console.error('Failed to create membership:', err)
    } finally {
      setSaving(false)
    }
  }

  // ── Agrupar por tipo ─────────────────────────────────────────────────────────

  const barbershopPlans = memberships.filter(m => !m.barberId)
  const barberPlans     = memberships.filter(m => !!m.barberId)

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/30 text-sm font-body mb-1">Recorrência e benefícios</p>
          <h1 className="font-heading text-3xl tracking-wide text-white">CLUBE VIP</h1>
        </div>
        <button
          onClick={() => { setCreating(true); setNewDraft(EMPTY_DRAFT); setEditingId(null) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-[#0a0a0a] text-sm font-semibold font-body hover:bg-amber-400 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo plano
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total assinantes', value: totalSubs, icon: Users },
          { label: 'MRR estimado',     value: `R$ ${Math.round(mrr).toLocaleString('pt-BR')}`, icon: TrendingUp },
          { label: 'Planos ativos',    value: memberships.filter(m => m.active).length, icon: Crown },
        ].map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="p-5 rounded-xl bg-[#161616] border border-[#262626]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/30 text-xs font-body">{kpi.label}</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/[0.15] border border-amber-500/25 flex items-center justify-center">
                <kpi.icon className="w-3.5 h-3.5 text-amber-400" />
              </div>
            </div>
            <p className="font-heading text-2xl text-white">{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Form de criação */}
      <AnimatePresence>
        {creating && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <p className="text-white/30 text-xs font-semibold tracking-widest uppercase font-body mb-3">Novo plano</p>
            <MembershipForm
              draft={newDraft}
              onChange={setNewDraft}
              onSave={saveCreate}
              onCancel={() => setCreating(false)}
              saving={saving}
              barbers={activeBarbers}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Planos da barbearia */}
      {barbershopPlans.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Building2 className="w-3.5 h-3.5 text-amber-400/50" />
            <p className="text-white/30 text-xs font-semibold tracking-widest uppercase font-body">Planos da barbearia</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {barbershopPlans.map(mem => (
              <div key={mem.id}>
                <PlanCard mem={mem} onEdit={() => editingId === mem.id ? setEditingId(null) : startEdit(mem)} editing={editingId === mem.id} />
                <AnimatePresence>
                  {editingId === mem.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-t-none rounded-b-xl border border-t-0 border-amber-500/25 bg-[#181818] p-4">
                        <MembershipForm
                          draft={editDraft}
                          onChange={setEditDraft}
                          onSave={saveEdit}
                          onCancel={() => setEditingId(null)}
                          saving={saving}
                          barbers={activeBarbers}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Planos por barbeiro */}
      {barberPlans.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Scissors className="w-3.5 h-3.5 text-blue-400/50" />
            <p className="text-white/30 text-xs font-semibold tracking-widest uppercase font-body">Planos por barbeiro</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {barberPlans.map(mem => (
              <div key={mem.id}>
                <PlanCard mem={mem} onEdit={() => editingId === mem.id ? setEditingId(null) : startEdit(mem)} editing={editingId === mem.id} />
                <AnimatePresence>
                  {editingId === mem.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-t-none rounded-b-xl border border-t-0 border-amber-500/25 bg-[#181818] p-4">
                        <MembershipForm
                          draft={editDraft}
                          onChange={setEditDraft}
                          onSave={saveEdit}
                          onCancel={() => setEditingId(null)}
                          saving={saving}
                          barbers={activeBarbers}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      )}

      {memberships.length === 0 && !creating && (
        <div className="text-center py-16 text-white/25 font-body text-sm">
          Nenhum plano criado ainda.{' '}
          <button
            onClick={() => { setCreating(true); setNewDraft(EMPTY_DRAFT) }}
            className="text-amber-400/70 hover:text-amber-400 underline underline-offset-2 transition-colors"
          >
            Criar primeiro plano
          </button>
        </div>
      )}
    </div>
  )
}

export default DashboardClube
