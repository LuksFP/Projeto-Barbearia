import { useEffect, useState } from 'react'
import { PLAN_NAME } from '@/types/saas'
import { useTenant } from '@/contexts/TenantContext'
import { useSaasAccount } from '@/contexts/SaasAccountContext'
import { Building2, MapPin, Instagram, Palette, ShieldCheck, Check, Clock, Loader2, ShoppingBag, Star } from 'lucide-react'
import StoreSettings from '@/components/dashboard/products/StoreSettings'
import GoogleReviewSettings from '@/components/dashboard/settings/GoogleReviewSettings'
import { isDemoMode } from '@/lib/demo'
import { toast } from '@/hooks/use-toast'

// ─── Componentes de layout ────────────────────────────────────────────────────

const Field = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-white/55 font-body tracking-wide uppercase">{label}</label>
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5">
      <span className="text-white/70 text-sm font-body flex-1">{value}</span>
      {hint && <span className="text-white/45 text-xs font-body">{hint}</span>}
    </div>
  </div>
)

const Section = ({
  title, icon: Icon, children, accent,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
  accent?: boolean
}) => (
  <div className={`p-6 rounded-xl border space-y-5 ${
    accent
      ? 'bg-red-500/[0.03] border-red-500/15'
      : 'bg-white/[0.02] border-white/5'
  }`}>
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
        accent
          ? 'bg-red-500/10 border border-red-500/20'
          : 'bg-amber-500/10 border border-amber-500/20'
      }`}>
        <Icon className={`w-4 h-4 ${accent ? 'text-red-400' : 'text-amber-400'}`} />
      </div>
      <h2 className="font-heading text-lg tracking-wide text-white">{title}</h2>
    </div>
    {children}
  </div>
)

// ─── Política de cancelamento ─────────────────────────────────────────────────

// ─── Página principal ─────────────────────────────────────────────────────────

const DashboardConfiguracoes = () => {
  const { barbershop, userRole, updateBarbershop } = useTenant()
  // Chegou por link com âncora (#vendas, #avaliacoes): rola até a seção
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (!id) return
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    return () => clearTimeout(t)
  }, [])
  // barbershop.plan no painel é fixo 'pro'; o plano de verdade é o da conta SaaS.
  const { account } = useSaasAccount()
  const [openTime, setOpenTime] = useState(barbershop?.openTime || '08:00')
  const [closeTime, setCloseTime] = useState(barbershop?.closeTime || '20:00')
  const [hoursSaved, setHoursSaved] = useState(false)
  const [savingHours, setSavingHours] = useState(false)

  if (!barbershop) return null

  const canEdit = userRole === 'owner' || userRole === 'admin'

  const handleSaveHours = async () => {
    if (isDemoMode()) {
      setHoursSaved(true)
      setTimeout(() => setHoursSaved(false), 3000)
      return
    }
    setSavingHours(true)
    try {
      await updateBarbershop({ openTime, closeTime })
      setHoursSaved(true)
      setTimeout(() => setHoursSaved(false), 3000)
    } catch {
      toast({ title: 'Erro ao salvar horário', variant: 'destructive' })
    } finally {
      setSavingHours(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-white/55 text-sm font-body mb-1">Dados da barbearia</p>
        <h1 className="font-heading text-3xl tracking-wide text-white">CONFIGURAÇÕES</h1>
      </div>

      {!canEdit && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400/70 text-sm font-body">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          Apenas proprietários e admins podem editar.
        </div>
      )}

      <Section title="Informações da Barbearia" icon={Building2}>
        <Field label="Nome"       value={barbershop.name} />
        <Field label="Slug / URL" value={`/b/${barbershop.slug}`} hint="imutável" />
        <Field label="Tagline"    value={barbershop.tagline} />
        <Field label="Plano"      value={account?.plan ? PLAN_NAME[account.plan] : 'Sem plano'} hint={barbershop.active ? 'Ativo' : 'Inativo'} />
      </Section>

      <Section title="Contato e Localização" icon={MapPin}>
        <Field label="Telefone"       value={barbershop.phone} />
        <Field label="WhatsApp"       value={`+${barbershop.whatsapp}`} />
        <Field label="Endereço"       value={barbershop.address} />
        <Field label="Cidade / Estado" value={`${barbershop.city}, ${barbershop.state}`} />
      </Section>

      <Section title="Redes Sociais" icon={Instagram}>
        <Field label="Instagram" value={barbershop.instagram} />
      </Section>

      <Section title="Identidade Visual" icon={Palette}>
        <div className="flex items-center gap-4">
          {[
            { label: 'Cor principal',  color: barbershop.primaryColor },
            { label: 'Cor de destaque', color: barbershop.accentColor },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg border border-white/10" style={{ backgroundColor: color }} />
              <div>
                <p className="text-white/70 text-xs font-body">{label}</p>
                <p className="text-white/55 text-xs font-body font-mono">{color}</p>
              </div>
            </div>
          ))}
        </div>
        <Field label="Logo texto" value={barbershop.logoText} hint="fallback sem logo" />
      </Section>

      {/* Vendas no site: "Leve junto" no agendamento e loja completa (Premium) */}
      <div id="vendas">
        <Section title="Vendas no Site" icon={ShoppingBag}>
          <StoreSettings canEdit={canEdit} />
        </Section>
      </div>

      {/* Avaliações no Google: link do "Pedir avaliação" da Agenda */}
      <div id="avaliacoes">
        <Section title="Avaliações no Google" icon={Star}>
          <GoogleReviewSettings canEdit={canEdit} />
        </Section>
      </div>

      {/* Horário de funcionamento */}
      <Section title="Horário de Funcionamento" icon={Clock} accent>
        <p className="text-white/65 text-sm font-body mb-4">
          Define o intervalo de horários disponíveis para agendamento (na agenda e no site).
        </p>
        {canEdit ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-white/60 text-xs font-semibold font-body tracking-wide uppercase mb-2 block">Abre às</label>
                <input
                  type="time"
                  value={openTime}
                  onChange={e => setOpenTime(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg px-3 py-2.5 text-white text-sm font-body focus:outline-none focus:border-amber-500/50"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div>
                <label className="text-white/60 text-xs font-semibold font-body tracking-wide uppercase mb-2 block">Fecha às</label>
                <input
                  type="time"
                  value={closeTime}
                  onChange={e => setCloseTime(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg px-3 py-2.5 text-white text-sm font-body focus:outline-none focus:border-amber-500/50"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>
            <p className="text-white/55 text-xs font-body">Dica: para fechar à meia-noite, use 00:00 no fechamento.</p>
            <div className="flex items-center justify-end gap-3">
              {hoursSaved && (
                <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-body">
                  <Check className="w-4 h-4" />Salvo
                </span>
              )}
              <button
                onClick={handleSaveHours}
                disabled={savingHours}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-[#0a0a0a] text-sm font-semibold font-body hover:bg-amber-400 transition-colors disabled:opacity-40"
              >
                {savingHours ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {savingHours ? 'Salvando…' : 'Salvar horário'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between py-2">
            <span className="text-white/70 text-sm font-body">Funcionamento</span>
            <span className="text-white/70 text-sm font-body font-semibold">{openTime} — {closeTime}</span>
          </div>
        )}
      </Section>

      {canEdit && (
        <div className="flex items-center gap-2 p-4 rounded-xl border border-[#1f1f1f] bg-white/[0.01]">
          <span className="text-white/55 text-xs font-body">
            Para editar nome, contato e identidade visual, acesse{' '}
            <a href="/dashboard/personalizar" className="text-amber-400/70 hover:text-amber-400 transition-colors underline underline-offset-2">
              Personalizar →
            </a>
          </span>
        </div>
      )}
    </div>
  )
}

export default DashboardConfiguracoes
