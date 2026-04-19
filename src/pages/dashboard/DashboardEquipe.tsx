import { useRef, useState } from 'react'
import { Plus, Scissors, X, Loader2, Pencil, Mail, Upload } from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
import { useSaasAccount } from '@/contexts/SaasAccountContext'
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
  email: string
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
}

const inputCls = 'w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm font-body placeholder:text-white/20 focus:outline-none focus:border-amber-500/50 transition-colors'

const DashboardEquipe = () => {
  const { barbershop, barbers, updateBarbers } = useTenant()
  const { accessToken } = useSaasAccount()

  // Modal de convite
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSent, setInviteSent] = useState(false)
  const [inviteForm, setInviteForm] = useState<InviteForm>({ email: '', name: '', specialty: '', bio: '', role: 'barber' })

  // Modal de edição
  const [editingBarber, setEditingBarber] = useState<BarbershopBarber | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ name: '', specialty: '', bio: '', role: 'barber' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // Avatar upload
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const openInvite = () => {
    setInviteForm({ email: '', name: '', specialty: '', bio: '', role: 'barber' })
    setInviteError('')
    setInviteSent(false)
    setInviteOpen(true)
  }

  const handleInvite = async () => {
    if (!barbershop || !inviteForm.email || !inviteForm.name || !inviteForm.specialty) return
    setInviting(true)
    setInviteError('')

    if (isDemoMode()) {
      // Demo: adiciona localmente sem persistir nem enviar email
      const fakeBarber: BarbershopBarber = {
        id: crypto.randomUUID(),
        barbershopId: barbershop.id,
        userId: null,
        name: inviteForm.name,
        specialty: inviteForm.specialty,
        bio: inviteForm.bio,
        active: true,
      }
      updateBarbers([...barbers, fakeBarber])
      setInviting(false)
      setInviteOpen(false)
      return
    }

    try {
      if (!accessToken) throw new Error('Sessão expirada. Faça login novamente.')

      const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-barber`
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          barbershopId: barbershop.id,
          email: inviteForm.email.toLowerCase().trim(),
          name: inviteForm.name.trim(),
          specialty: inviteForm.specialty.trim(),
          bio: inviteForm.bio.trim(),
          role: inviteForm.role,
        }),
      })

      if (!res.ok) {
        const body = await res.json() as { error?: string }
        throw new Error(body.error ?? 'Erro ao enviar convite.')
      }

      setInviteSent(true)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Erro ao enviar convite.')
    } finally {
      setInviting(false)
    }
  }

  const openEdit = (barber: BarbershopBarber) => {
    setEditingBarber(barber)
    setEditForm({ name: barber.name, specialty: barber.specialty, bio: barber.bio, role: 'barber' })
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
            ? { ...b, name: editForm.name, specialty: editForm.specialty, bio: editForm.bio }
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
      })
      updateBarbers(barbers.map(b =>
        b.id === editingBarber.id
          ? { ...b, name: row.name, specialty: row.specialty, bio: row.bio, active: row.active }
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
          Convidar membro
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
          <span className="text-sm font-body">Convidar barbeiro</span>
        </motion.button>
      </div>

      {/* Modal — Convidar membro */}
      <AnimatePresence>
        {inviteOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-40"
              onClick={() => setInviteOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-[#111] border border-[#222] rounded-2xl z-50 p-6 overflow-y-auto scrollbar-none max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-xl tracking-wide text-white">CONVIDAR MEMBRO</h2>
                <button onClick={() => setInviteOpen(false)} className="text-white/30 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {inviteSent ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                    <Mail className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold font-body mb-1">Convite enviado!</p>
                    <p className="text-white/45 text-sm font-body">
                      {inviteForm.name} receberá um email em{' '}
                      <span className="text-white/70">{inviteForm.email}</span> com instruções para criar a conta.
                    </p>
                  </div>
                  <button
                    onClick={() => setInviteOpen(false)}
                    className="px-6 py-2 rounded-lg bg-amber-500 text-[#0a0a0a] text-sm font-bold font-body hover:bg-amber-400 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {!isDemoMode() && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/20">
                      <Mail className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-amber-300/80 text-xs font-body">
                        O convite é enviado por email. O barbeiro cria a própria conta e já aparece vinculado à sua barbearia.
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-white/45 text-xs font-body mb-1.5">Email *</label>
                    <input
                      type="email"
                      value={inviteForm.email}
                      onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="barbeiro@email.com"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-white/45 text-xs font-body mb-1.5">Nome completo *</label>
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

                  <button
                    onClick={handleInvite}
                    disabled={inviting || !inviteForm.email || !inviteForm.name || !inviteForm.specialty}
                    className="w-full py-3 rounded-lg bg-amber-500 text-[#0a0a0a] text-sm font-bold font-body tracking-wide hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {inviting
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Enviando convite…</>
                      : isDemoMode() ? 'Adicionar (demo)' : 'Enviar convite por email'
                    }
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal — Editar membro */}
      <AnimatePresence>
        {editingBarber && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-40"
              onClick={() => setEditingBarber(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto bg-[#111] border border-[#222] rounded-2xl z-50 p-6 overflow-y-auto scrollbar-none max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-xl tracking-wide text-white">EDITAR MEMBRO</h2>
                <button onClick={() => setEditingBarber(null)} className="text-white/30 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

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
                  disabled={editSaving || !editForm.name || !editForm.specialty}
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
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default DashboardEquipe
