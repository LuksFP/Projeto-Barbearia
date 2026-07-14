import { useState } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import { serviceRepository } from '@/repositories/serviceRepository'
import { isDemoMode } from '@/lib/demo'
import { Plus, Pencil, Trash2, Check, X, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { BarbershopService } from '@/types/tenant'

// ─── Categorias com preset + cor ─────────────────────────────────────────────

const PRESET_CATEGORIES = ['Corte', 'Barba', 'Combo', 'Coloração', 'Sobrancelha', 'Tratamento']

const CATEGORY_COLORS: Record<string, string> = {
  Corte:       'text-amber-400 bg-amber-400/10 border-amber-400/20',
  Barba:       'text-blue-400 bg-blue-400/10 border-blue-400/20',
  Combo:       'text-purple-400 bg-purple-400/10 border-purple-400/20',
  Coloração:   'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  Sobrancelha: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  Tratamento:  'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface ServiceDraft {
  name: string
  description: string
  price: string
  durationMin: string
  category: string
  customCategory: string
}

const EMPTY_DRAFT: ServiceDraft = {
  name: '', description: '', price: '', durationMin: '', category: 'Corte', customCategory: '',
}

function draftFromService(s: BarbershopService): ServiceDraft {
  const isPreset = PRESET_CATEGORIES.includes(s.category)
  return {
    name: s.name,
    description: s.description,
    price: String(s.price),
    durationMin: String(s.durationMin),
    category: isPreset ? s.category : 'Outro',
    customCategory: isPreset ? '' : s.category,
  }
}

function resolvedCategory(draft: ServiceDraft): string {
  return draft.category === 'Outro' ? draft.customCategory.trim() || 'Outro' : draft.category
}

function draftValid(draft: ServiceDraft): boolean {
  return (
    draft.name.trim().length > 0 &&
    Number(draft.price) > 0 &&
    resolvedCategory(draft).length > 0
  )
}

// ─── Inline form ──────────────────────────────────────────────────────────────

interface ServiceFormProps {
  draft: ServiceDraft
  onChange: (d: ServiceDraft) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}

const ServiceForm = ({ draft, onChange, onSave, onCancel, saving }: ServiceFormProps) => {
  const set = (key: keyof ServiceDraft, val: string) => onChange({ ...draft, [key]: val })

  return (
    <div className="p-5 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl space-y-4">

      {/* Nome + Categoria */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-white/35 text-xs font-body mb-1.5 block">Nome do serviço</label>
          <input
            value={draft.name}
            onChange={e => set('name', e.target.value)}
            placeholder="ex: Corte + Barba"
            className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white font-body placeholder:text-white/20 focus:outline-none focus:border-amber-500/50"
          />
        </div>
        <div>
          <label className="text-white/35 text-xs font-body mb-1.5 block">Categoria</label>
          <select
            value={draft.category}
            onChange={e => set('category', e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white font-body focus:outline-none focus:border-amber-500/50 appearance-none"
          >
            {PRESET_CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="Outro">Outro…</option>
          </select>
        </div>
      </div>

      {draft.category === 'Outro' && (
        <div>
          <label className="text-white/35 text-xs font-body mb-1.5 block">Nome da categoria</label>
          <input
            value={draft.customCategory}
            onChange={e => set('customCategory', e.target.value)}
            placeholder="ex: Pézinho, Sobrancelha..."
            className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white font-body placeholder:text-white/20 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      )}

      {/* Descrição */}
      <div>
        <label className="text-white/35 text-xs font-body mb-1.5 block">Descrição <span className="text-white/20">(opcional)</span></label>
        <input
          value={draft.description}
          onChange={e => set('description', e.target.value)}
          placeholder="ex: Degradê + Barba com navalha e toalha quente"
          className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white font-body placeholder:text-white/20 focus:outline-none focus:border-amber-500/50"
        />
      </div>

      {/* Preço */}
      <div>
        <label className="text-white/35 text-xs font-body mb-1.5 block">Preço (R$)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={draft.price}
          onChange={e => set('price', e.target.value)}
          placeholder="0,00"
          className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white font-body placeholder:text-white/20 focus:outline-none focus:border-amber-500/50"
        />
      </div>

      {/* Ações */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white/40 hover:text-white font-body transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Cancelar
        </button>
        <button
          onClick={onSave}
          disabled={!draftValid(draft) || saving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 text-[#0a0a0a] text-sm font-semibold font-body hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <Check className="w-3.5 h-3.5" />
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

const DashboardServicos = () => {
  const { barbershop, services, updateServices } = useTenant()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<ServiceDraft>(EMPTY_DRAFT)
  const [creating, setCreating] = useState(false)
  const [newDraft, setNewDraft] = useState<ServiceDraft>(EMPTY_DRAFT)
  const [saving, setSaving] = useState(false)
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set())

  const demo = isDemoMode()

  // ── Editar serviço existente ──────────────────────────────────────────────

  const startEdit = (s: BarbershopService) => {
    setEditingId(s.id)
    setEditDraft(draftFromService(s))
    setCreating(false)
  }

  const cancelEdit = () => { setEditingId(null) }

  const saveEdit = async () => {
    if (!editingId) return
    setSaving(true)
    const update = {
      name: editDraft.name.trim(),
      description: editDraft.description.trim(),
      price: Number(editDraft.price),
      duration_min: Number(editDraft.durationMin) || 30,
      category: resolvedCategory(editDraft),
    }
    try {
      if (!demo) await serviceRepository.update(editingId, update)
      updateServices(services.map(s =>
        s.id === editingId
          ? { ...s, name: update.name, description: update.description, price: update.price, durationMin: update.duration_min, category: update.category }
          : s
      ))
      setEditingId(null)
    } finally {
      setSaving(false)
    }
  }

  // ── Criar novo serviço ────────────────────────────────────────────────────

  const openCreate = () => {
    setCreating(true)
    setNewDraft(EMPTY_DRAFT)
    setEditingId(null)
  }

  const cancelCreate = () => setCreating(false)

  const saveCreate = async () => {
    if (!barbershop) return
    setSaving(true)
    const input = {
      barbershop_id: barbershop.id,
      name: newDraft.name.trim(),
      description: newDraft.description.trim(),
      price: Number(newDraft.price),
      // Tempo deixou de ser configurado por serviço; mantém um padrão só p/ o
      // cálculo de bloco na agenda. A duração real é definida no agendamento.
      duration_min: Number(newDraft.durationMin) || 30,
      category: resolvedCategory(newDraft),
      active: true,
    }
    try {
      if (demo) {
        const fakeId = `svc-demo-${Date.now()}`
        updateServices([...services, {
          id: fakeId,
          barbershopId: barbershop.id,
          name: input.name,
          description: input.description,
          price: input.price,
          durationMin: input.duration_min,
          category: input.category,
          active: true,
        }])
      } else {
        const row = await serviceRepository.create(input)
        updateServices([...services, {
          id: row.id,
          barbershopId: row.barbershop_id,
          name: row.name,
          description: row.description,
          price: Number(row.price),
          durationMin: row.duration_min,
          category: row.category,
          active: row.active,
        }])
      }
      setCreating(false)
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle ativo ──────────────────────────────────────────────────────────

  const toggleActive = async (id: string) => {
    const svc = services.find(s => s.id === id)
    if (!svc) return
    const next = !svc.active
    if (!demo) await serviceRepository.update(id, { active: next })
    updateServices(services.map(s => s.id === id ? { ...s, active: next } : s))
  }

  // ── Remover serviço (desativar permanentemente) ───────────────────────────

  const remove = async (id: string) => {
    if (!demo) await serviceRepository.deactivate(id)
    updateServices(services.filter(s => s.id !== id))
  }

  // ── Agrupar por categoria ─────────────────────────────────────────────────

  const categories = [...new Set(services.map(s => s.category))]

  const toggleCat = (cat: string) => {
    setCollapsedCats(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/30 text-sm font-body mb-1">Preços e combos</p>
          <h1 className="font-heading text-3xl tracking-wide text-white">SERVIÇOS</h1>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-[#0a0a0a] text-sm font-semibold font-body hover:bg-amber-400 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo serviço
        </button>
      </div>

      {/* Form de criação */}
      <AnimatePresence>
        {creating && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <p className="text-white/30 text-xs font-semibold tracking-widest uppercase font-body mb-3 px-1">
              Novo serviço
            </p>
            <ServiceForm
              draft={newDraft}
              onChange={setNewDraft}
              onSave={saveCreate}
              onCancel={cancelCreate}
              saving={saving}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista por categoria */}
      {categories.map(cat => {
        const catServices = services.filter(s => s.category === cat)
        const collapsed = collapsedCats.has(cat)
        const colorClass = CATEGORY_COLORS[cat] ?? 'text-white/40 bg-white/5 border-white/10'

        return (
          <div key={cat}>
            {/* Cabeçalho da categoria */}
            <button
              onClick={() => toggleCat(cat)}
              className="flex items-center gap-2 mb-3 px-1 group"
            >
              <p className="text-white/30 text-xs font-semibold tracking-widest uppercase font-body">
                {cat}
              </p>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-body ${colorClass}`}>
                {catServices.length}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-white/20 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
            </button>

            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  {catServices.map((service, i) => (
                    <motion.div
                      key={service.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      {/* Linha do serviço */}
                      <div className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all ${
                        editingId === service.id
                          ? 'bg-[#181818] border-amber-500/25 rounded-b-none border-b-0'
                          : service.active
                          ? 'bg-[#161616] border-[#262626] hover:bg-[#1c1c1c] hover:border-[#303030]'
                          : 'bg-[#111] border-[#1e1e1e] opacity-50'
                      }`}>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-white text-sm font-semibold font-body">{service.name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-body ${
                              CATEGORY_COLORS[service.category] ?? 'text-white/30 bg-white/5 border-white/10'
                            }`}>
                              {service.category}
                            </span>
                          </div>
                          {service.description && (
                            <p className="text-white/40 text-xs font-body truncate">{service.description}</p>
                          )}
                        </div>

                        <div className="shrink-0 w-20 text-right">
                          <p className="font-heading text-lg text-amber-400">R$ {service.price}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => editingId === service.id ? cancelEdit() : startEdit(service)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              editingId === service.id
                                ? 'text-amber-400 bg-amber-400/10'
                                : 'text-white/30 hover:text-white hover:bg-white/5'
                            }`}
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => remove(service.id)}
                            className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            title="Remover"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleActive(service.id)}
                            className={`w-9 h-5 rounded-full border transition-all relative shrink-0 ${
                              service.active
                                ? 'bg-amber-500 border-amber-500'
                                : 'bg-transparent border-white/10'
                            }`}
                            aria-label={service.active ? 'Desativar' : 'Ativar'}
                          >
                            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                              service.active ? 'left-4' : 'left-0.5'
                            }`} />
                          </button>
                        </div>
                      </div>

                      {/* Form de edição inline */}
                      <AnimatePresence>
                        {editingId === service.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="rounded-t-none rounded-b-xl border border-t-0 border-amber-500/25 bg-[#181818] overflow-hidden">
                              <div className="p-4">
                                <ServiceForm
                                  draft={editDraft}
                                  onChange={setEditDraft}
                                  onSave={saveEdit}
                                  onCancel={cancelEdit}
                                  saving={saving}
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}

      {services.length === 0 && !creating && (
        <div className="text-center py-16 text-white/25 font-body text-sm">
          Nenhum serviço cadastrado ainda.{' '}
          <button onClick={openCreate} className="text-amber-400/70 hover:text-amber-400 underline underline-offset-2 transition-colors">
            Criar primeiro serviço
          </button>
        </div>
      )}
    </div>
  )
}

export default DashboardServicos
