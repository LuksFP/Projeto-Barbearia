import { useRef, useState } from 'react'
import { Plus, Scissors, X, Loader2, Pencil, Upload, Clock, Percent } from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
import { teamRepository } from '@/repositories/teamRepository'
import { isDemoMode } from '@/lib/demo'
import { uploadBarberAvatar } from '@/lib/storage'
import { motion, AnimatePresence } from 'framer-motion'
import type { BarbershopBarber } from '@/types/tenant'

const ROLE_OPTIONS = [
  { value: 'barber',        label: 'Barbeiro' },
  { value: 'receptionist',  label: 'Recepcionista' },
  { value: 'admin',         label: 'Administrador' },
]

interface InviteForm {
  name: string
  specialty: string
  bio: string
  role: string
}

interface EditForm {
  name: string
  specialty: string
  bio: string
  role: string
  cutDurationMin: string
  commissionPercent: string
}

const inputCls = 'w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm font-body placeholder:text-white/20 focus:outline-none focus:border-amber-500/50 transition-colors'

const DashboardEquipe = () => {
  const { barbershop, barbers, updateBarbers } = useTenant()

  // Modal de convite
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteForm, setInviteForm] = useState<InviteForm>({ name: '', specialty: '', bio: '', role: 'barber' })

  // Modal de edição
  const [editingBarber, setEditingBarber] = useState<BarbershopBarber | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ name: '', specialty: '', bio: '', role: 'barber', cutDurationMin: '30', commissionPercent: '50' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // Avatar upload
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const openInvite = () => {
    setInviteForm({ name: '', specialty: '', bio: '', role: 'barber' })
    setInviteError('')
    setInviteOpen(true)
  }

  const handleInvite = async () => {
    if (!barbershop || !inviteForm.name || !inviteForm.specialty) return
    setInviting(true)
    setInviteError('')

    if (isDemoMode()) {
      // Demo: adiciona localmente sem persistir
      const fakeBarber: BarbershopBarber = {
        id: crypto.randomUUID(),
        barbershopId: barbershop.id,
        userId: null,
        name: inviteForm.name,
        specialty: inviteForm.specialty,
        bio: inviteForm.bio,
        cutDurationMin: 30,
        commissionPercent: 50,
        active: true,
      }
      updateBarbers([...barbers, fakeBarber])
      setInviting(false)
      setInviteOpen(false)
      return
    }

    try {
      // Cadastro direto (sem conta de login): o barbeiro já entra na equipe e
      // fica disponível para agendamento. Sem email/convite.
      const row = await teamRepository.create({
        barbershop_id: barbershop.id,
        user_id: null,
        name: inviteForm.name.trim(),
        specialty: inviteForm.specialty.trim(),
        bio: inviteForm.bio.trim(),
        role: inviteForm.role,
        active: true,
      })
      updateBarbers([...barbers, {
        id: row.id,
        barbershopId: row.barbershop_id,
        userId: row.user_id,
        name: row.name,
        bio: row.bio,
        specialty: row.specialty,
        cutDurationMin: row.cut_duration_minutes,
        commissionPercent: row.commission_percent ?? 50,
        avatar: row.avatar ?? undefined,
        active: row.active,
      }])
      setInviteOpen(false)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Erro ao adicionar barbeiro.')
    } finally {
      setInviting(false)
    }
  }

  const openEdit = (barber: BarbershopBarber) => {
    setEditingBarber(barber)
    setEditForm({
      name: barber.name,
      specialty: barber.specialty,
      bio: barber.bio,
      role: 'barber',
      cutDurationMin: String(barber.cutDurationMin),
      commissionPercent: String(barber.commissionPercent),
    })
    setEditError('')
    setAvatarError('')
  }

  const handleEdit = async () => {
    if (!editingBarber || !editForm.name || !editForm.specialty) return
    setEditSaving(true)
    setEditError('')
    try {
      if (isDemoMode()) {
        updateBarbers(barbers.map(b =>
          b.id === editingBarber.id
            ? {
                ...b,
                name: editForm.name,
                specialty: editForm.specialty,
                bio: editForm.bio,
                cutDurationMin: Number(editForm.cutDurationMin),
                commissionPercent: Number(editForm.commissionPercent),
              }
            : b
        ))
        setEditingBarber(null)
        return
      }
      const row = await teamRepository.update(editingBarber.id, {
        name: editForm.name,
        specialty: editForm.specialty,
        bio: editForm.bio,
        role: editForm.role,
        cut_duration_minutes: Number(editForm.cutDurationMin),
        commission_percent: Number(editForm.commissionPercent),
      })
      updateBarbers(barbers.map(b =>
        b.id === editingBarber.id
          ? {
              ...b,
              name: row.name,
              specialty: row.specialty,
              bio: row.bio,
              cutDurationMin: row.cut_duration_minutes,
              commissionPercent: row.commission_percent ?? 50,
              active: row.active,
            }
          : b
      ))
      setEditingBarber(null)
    } catch {
      setEditError('Erro ao salvar. Tente novamente.')
    } finally {
      setEditSaving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editingBarber) return
    if (isDemoMode()) { setAvatarError('Upload não disponível no modo demo.'); return }

    setUploadingAvatar(true)
    setAvatarError('')
    try {
      const { url } = await uploadBarberAvatar(editingBarber.id, file)
      await teamRepository.update(editingBarber.id, { avatar: url })
      updateBarbers(barbers.map(b =>
        b.id === editingBarber.id ? { ...b, avatar: url } : b
      ))
      setEditingBarber(prev => prev ? { ...prev, avatar: url } : null)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Erro ao enviar foto.')
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const handleDeactivate = async (barber: BarbershopBarber) => {
    try {
      if (!isDemoMode()) await teamRepository.deactivate(barber.id)
      updateBarbers(barbers.filter(b => b.id !== barber.id))
      if (editingBarber?.id === barber.id) setEditingBarber(null)
    } catch {
      // silently ignore
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/30 text-sm font-body mb-1">Barbearia ativa</p>
          <h1 className="font-heading text-3xl tracking-wide text-white">EQUIPE</h1>
        </div>
        <button
          onClick={openInvite}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-[#0a0a0a] text-sm font-semibold font-body hover:bg-amber-400 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar barbeiro
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {barbers.map((barber, i) => (
          <motion.div
            key={barber.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="p-6 rounded-xl bg-[#161616] border border-[#262626] hover:border-[#333] hover:bg-[#1a1a1a] transition-all"
          >
            {barber.avatar ? (
              <img
                src={barber.avatar}
                alt={barber.name}
                className="w-14 h-14 rounded-xl object-cover border border-[#2a2a2a] mb-4"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-amber-500/[0.15] border border-amber-500/30 flex items-center justify-center mb-4">
                <span className="font-heading text-2xl text-amber-400">
                  {barber.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </span>
              </div>
            )}

            <h3 className="text-white font-semibold font-body mb-0.5">{barber.name}</h3>
            <p className="text-amber-400/70 text-xs font-body font-semibold tracking-wide uppercase mb-3">
              {barber.specialty}
            </p>
            <div className="flex items-center gap-1.5 text-white/35 text-xs font-body mb-1.5">
              <Clock className="w-3 h-3" />
              Bloqueia {barber.cutDurationMin} min por atendimento
            </div>
            <div className="flex items-center gap-1.5 text-white/35 text-xs font-body mb-3">
              <Percent className="w-3 h-3" />
              {barber.commissionPercent}% de comissão
            </div>
            {barber.bio && (
              <p className="text-white/50 text-sm font-body leading-relaxed mb-4 line-clamp-2">{barber.bio}</p>
            )}

            <div className="flex items-center justify-between">
              <span className={`text-xs font-body px-2.5 py-1 rounded-full ${
                barber.active
                  ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                  : 'bg-white/5 text-white/30 border border-white/10'
              }`}>
                {barber.active ? 'Ativo' : 'Inativo'}
              </span>
              <button
                onClick={() => openEdit(barber)}
                className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 font-body transition-colors"
              >
                <Pencil className="w-3 h-3" />
                Editar
              </button>
            </div>
          </motion.div>
        ))}

        {/* Slot vazio */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: barbers.length * 0.07 }}
          onClick={openInvite}
          className="p-6 rounded-xl border border-dashed border-[#2a2a2a] hover:border-[#3a3a3a] text-white/30 hover:text-white/55 transition-all flex flex-col items-center justify-center gap-3 min-h-[200px]"
        >
          <div className="w-12 h-12 rounded-xl border border-[#2a2a2a] flex items-center justify-center">
            <Scissors className="w-5 h-5" />
          </div>
          <span className="text-sm font-body">Adicionar barbeiro</span>
        </motion.button>
      </div>

      {/* Modal — Adicionar barbeiro */}
      <AnimatePresence>
        {inviteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/70" onClick={() => setInviteOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-[#111] border border-[#222] rounded-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Header fixo */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0 border-b border-[#1c1c1c]">
                <h2 className="font-heading text-xl tracking-wide text-white">ADICIONAR BARBEIRO</h2>
                <button onClick={() => setInviteOpen(false)} className="text-white/30 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body scrollável */}
              <div className="overflow-y-auto flex-1 px-6 py-5 scrollbar-none">
                <div className="space-y-4">
                  <div>
                    <label className="block text-white/45 text-xs font-body mb-1.5">Nome *</label>
                    <input
                      type="text"
                      value={inviteForm.name}
                      onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Nome do barbeiro"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-white/45 text-xs font-body mb-1.5">Especialidade *</label>
                    <input
                      type="text"
                      value={inviteForm.specialty}
                      onChange={e => setInviteForm(f => ({ ...f, specialty: e.target.value }))}
                      placeholder="Ex: Degradê, Barba, Coloração..."
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-white/45 text-xs font-body mb-1.5">Função</label>
                    <select
                      value={inviteForm.role}
                      onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
                      className={inputCls}
                    >
                      {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-white/45 text-xs font-body mb-1.5">Bio (opcional)</label>
                    <textarea
                      value={inviteForm.bio}
                      onChange={e => setInviteForm(f => ({ ...f, bio: e.target.value }))}
                      placeholder="Uma linha sobre o profissional..."
                      rows={3}
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                  {inviteError && <p className="text-red-400 text-xs font-body">{inviteError}</p>}
                </div>
              </div>

              {/* Footer fixo — botão sempre visível */}
              <div className="flex-shrink-0 px-6 py-4 border-t border-[#1c1c1c]">
                <button
                  onClick={handleInvite}
                  disabled={inviting || !inviteForm.name || !inviteForm.specialty}
                  className="w-full py-3 rounded-lg bg-amber-500 text-[#0a0a0a] text-sm font-bold font-body tracking-wide hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {inviting
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Adicionando…</>
                    : <><Plus className="w-4 h-4" />Adicionar barbeiro</>
                  }
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal — Editar membro */}
      <AnimatePresence>
        {editingBarber && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/70" onClick={() => setEditingBarber(null)} />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-[#111] border border-[#222] rounded-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
                <h2 className="font-heading text-xl tracking-wide text-white">EDITAR MEMBRO</h2>
                <button onClick={() => setEditingBarber(null)} className="text-white/30 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-6 pb-6 scrollbar-none">
              <div className="space-y-4">
                {/* Avatar upload */}
                <div>
                  <label className="block text-white/45 text-xs font-body mb-2">Foto do barbeiro</label>
                  <div className="flex items-center gap-4">
                    {editingBarber.avatar ? (
                      <img
                        src={editingBarber.avatar}
                        alt={editingBarber.name}
                        className="w-16 h-16 rounded-xl object-cover border border-[#2a2a2a] shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-amber-500/[0.15] border border-amber-500/20 flex items-center justify-center shrink-0">
                        <span className="font-heading text-xl text-amber-400">
                          {editingBarber.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#2a2a2a] text-white/50 hover:text-white hover:border-[#3a3a3a] text-xs font-body transition-all disabled:opacity-40"
                    >
                      {uploadingAvatar
                        ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Enviando…</>
                        : <><Upload className="w-3.5 h-3.5" />{editingBarber.avatar ? 'Trocar foto' : 'Adicionar foto'}</>
                      }
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAvatarUpload}
                      className="sr-only"
                    />
                  </div>
                  {avatarError && <p className="text-red-400 text-xs font-body mt-1.5">{avatarError}</p>}
                </div>

                <div>
                  <label className="block text-white/45 text-xs font-body mb-1.5">Nome completo *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Nome do barbeiro"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-white/45 text-xs font-body mb-1.5">Especialidade *</label>
                  <input
                    type="text"
                    value={editForm.specialty}
                    onChange={e => setEditForm(f => ({ ...f, specialty: e.target.value }))}
                    placeholder="Ex: Degradê, Barba, Coloração..."
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-white/45 text-xs font-body mb-1.5">Função</label>
                  <select
                    value={editForm.role}
                    onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                    className={inputCls}
                  >
                    {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-white/45 text-xs font-body mb-1.5">Tempo de corte (min) *</label>
                  <input
                    type="number"
                    min="5"
                    max="480"
                    step="5"
                    value={editForm.cutDurationMin}
                    onChange={e => setEditForm(f => ({ ...f, cutDurationMin: e.target.value }))}
                    placeholder="15"
                    className={inputCls}
                  />
                  <p className="mt-1.5 text-white/25 text-[11px] font-body">
                    Um agendamento às 15:00 com 15 min bloqueia de 15:00 a 15:15.
                  </p>
                </div>
                <div>
                  <label className="block text-white/45 text-xs font-body mb-1.5">Comissão (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={editForm.commissionPercent}
                    onChange={e => setEditForm(f => ({ ...f, commissionPercent: e.target.value }))}
                    placeholder="50"
                    className={inputCls}
                  />
                  <p className="mt-1.5 text-white/25 text-[11px] font-body">
                    % da receita gerada que fica com o barbeiro (aparece no Financeiro).
                  </p>
                </div>
                <div>
                  <label className="block text-white/45 text-xs font-body mb-1.5">Bio (opcional)</label>
                  <textarea
                    value={editForm.bio}
                    onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
                    placeholder="Uma linha sobre o profissional..."
                    rows={3}
                    className={`${inputCls} resize-none`}
                  />
                </div>

                {editError && <p className="text-red-400 text-xs font-body">{editError}</p>}

                <button
                  onClick={handleEdit}
                  disabled={editSaving || !editForm.name || !editForm.specialty || Number(editForm.cutDurationMin) < 5}
                  className="w-full py-3 rounded-lg bg-amber-500 text-[#0a0a0a] text-sm font-bold font-body tracking-wide hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {editSaving
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando…</>
                    : 'Salvar alterações'
                  }
                </button>

                <button
                  onClick={() => handleDeactivate(editingBarber)}
                  className="w-full py-2 rounded-lg border border-red-500/20 text-red-400/70 hover:text-red-400 hover:border-red-500/40 text-sm font-body transition-colors"
                >
                  Desativar membro
                </button>
              </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DashboardEquipe
