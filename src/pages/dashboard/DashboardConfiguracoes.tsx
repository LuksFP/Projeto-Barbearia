import { useState } from 'react'
import { useTenant } from '@/contexts/TenantContext'
import { Building2, MapPin, Instagram, Palette, ShieldCheck, Ban, AlertTriangle, Check, Info } from 'lucide-react'
import { getDefaultCancellationPolicy, isDemoMode } from '@/lib/demo'
import type { CancellationPolicy } from '@/types/tenant'
import { toast } from '@/hooks/use-toast'

// ─── Componentes de layout ────────────────────────────────────────────────────

const Field = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-white/30 font-body tracking-wide uppercase">{label}</label>
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5">
      <span className="text-white/70 text-sm font-body flex-1">{value}</span>
      {hint && <span className="text-white/20 text-xs font-body">{hint}</span>}
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

const WINDOW_OPTIONS = [
  { value: 1,   label: '1 hora antes' },
  { value: 2,   label: '2 horas antes' },
  { value: 4,   label: '4 horas antes' },
  { value: 6,   label: '6 horas antes' },
  { value: 12,  label: '12 horas antes' },
  { value: 24,  label: '24 horas antes' },
  { value: 48,  label: '48 horas antes' },
  { value: 72,  label: '3 dias antes' },
]

interface CancellationFormProps {
  policy: CancellationPolicy
  onChange: (p: CancellationPolicy) => void
  onSave: () => void
  saved: boolean
  saving?: boolean
}

const CancellationForm = ({ policy, onChange, onSave, saved, saving }: CancellationFormProps) => {
  const set = <K extends keyof CancellationPolicy>(key: K, val: CancellationPolicy[K]) =>
    onChange({ ...policy, [key]: val })

  const fineLabel = policy.fineType === 'fixed'
    ? `R$ ${policy.fineValue} fixo`
    : `${policy.fineValue}% do valor do serviço`

  return (
    <div className="space-y-5">

      {/* Toggle habilitado */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/70 text-sm font-body font-semibold">Multa por cancelamento</p>
          <p className="text-white/35 text-xs font-body mt-0.5">
            Clientes que cancelam fora da janela gratuita pagam uma taxa
          </p>
        </div>
        <button
          onClick={() => set('enabled', !policy.enabled)}
          className={`w-11 h-6 rounded-full border transition-all relative shrink-0 ${
            policy.enabled ? 'bg-red-500 border-red-500' : 'bg-transparent border-white/10'
          }`}
        >
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
            policy.enabled ? 'left-5' : 'left-0.5'
          }`} />
        </button>
      </div>

      {policy.enabled && (
        <>
          <div className="h-px bg-white/5" />

          {/* Janela gratuita */}
          <div>
            <label className="text-white/35 text-xs font-semibold font-body tracking-wide uppercase mb-2 block">
              Cancelamento gratuito até
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {WINDOW_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('freeWindowHours', opt.value)}
                  className={`px-3 py-2 rounded-lg text-xs font-body border transition-all ${
                    policy.freeWindowHours === opt.value
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                      : 'border-[#2a2a2a] text-white/40 hover:text-white/60 hover:border-[#333]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-white/25 text-xs font-body mt-2">
              Clientes podem cancelar sem custo até {WINDOW_OPTIONS.find(o => o.value === policy.freeWindowHours)?.label ?? `${policy.freeWindowHours}h antes`} do horário marcado.
            </p>
          </div>

          {/* Tipo de multa */}
          <div>
            <label className="text-white/35 text-xs font-semibold font-body tracking-wide uppercase mb-2 block">
              Tipo de multa
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => set('fineType', 'percent')}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-body border transition-all text-left ${
                  policy.fineType === 'percent'
                    ? 'bg-red-500/10 border-red-500/30 text-white'
                    : 'border-[#2a2a2a] text-white/40 hover:text-white/60'
                }`}
              >
                <p className="font-semibold mb-0.5">Percentual</p>
                <p className="text-xs text-white/40">% do valor do serviço</p>
              </button>
              <button
                type="button"
                onClick={() => set('fineType', 'fixed')}
                className={`flex-1 px-4 py-3 rounded-xl text-sm font-body border transition-all text-left ${
                  policy.fineType === 'fixed'
                    ? 'bg-red-500/10 border-red-500/30 text-white'
                    : 'border-[#2a2a2a] text-white/40 hover:text-white/60'
                }`}
              >
                <p className="font-semibold mb-0.5">Valor fixo</p>
                <p className="text-xs text-white/40">R$ independente do serviço</p>
              </button>
            </div>
          </div>

          {/* Valor da multa */}
          <div>
            <label className="text-white/35 text-xs font-semibold font-body tracking-wide uppercase mb-2 block">
              {policy.fineType === 'fixed' ? 'Valor da multa (R$)' : 'Percentual da multa (%)'}
            </label>
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm font-body">
                  {policy.fineType === 'fixed' ? 'R$' : '%'}
                </span>
                <input
                  type="number"
                  min="1"
                  max={policy.fineType === 'percent' ? 100 : undefined}
                  step={policy.fineType === 'percent' ? 5 : 1}
                  value={policy.fineValue}
                  onChange={e => set('fineValue', Number(e.target.value))}
                  className="bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white font-body w-32 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <p className="text-white/35 text-xs font-body">
                = <span className="text-white/60">{fineLabel}</span> cobrado no cancelamento tardio
              </p>
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/[0.04] border border-amber-500/15">
            <Info className="w-4 h-4 text-amber-400/60 shrink-0 mt-0.5" />
            <p className="text-white/50 text-xs font-body leading-relaxed">
              Se um cliente cancelar o agendamento com menos de{' '}
              <span className="text-white/80 font-semibold">{WINDOW_OPTIONS.find(o => o.value === policy.freeWindowHours)?.label}</span>,
              {' '}será cobrada uma taxa de{' '}
              <span className="text-white/80 font-semibold">{fineLabel}</span>.
              {' '}Cancelamentos dentro da janela gratuita continuam sem custo.
            </p>
          </div>
        </>
      )}

      {/* Salvar */}
      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-body">
            <Check className="w-3.5 h-3.5" />
            Salvo
          </span>
        )}
        <button
          onClick={onSave}
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-amber-500 text-[#0a0a0a] text-sm font-semibold font-body hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Salvando…' : 'Salvar política'}
        </button>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

const DashboardConfiguracoes = () => {
  const { barbershop, userRole, updateBarbershop } = useTenant()
  const [policy, setPolicy] = useState<CancellationPolicy>(() =>
    barbershop?.cancellationPolicy ?? getDefaultCancellationPolicy()
  )
  const [policySaved, setPolicySaved] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!barbershop) return null

  const canEdit = userRole === 'owner' || userRole === 'admin'

  const handleSavePolicy = async () => {
    if (isDemoMode()) {
      setPolicySaved(true)
      setTimeout(() => setPolicySaved(false), 3000)
      return
    }
    setSaving(true)
    try {
      await updateBarbershop({ cancellationPolicy: policy })
      setPolicySaved(true)
      setTimeout(() => setPolicySaved(false), 3000)
    } catch {
      toast({ title: 'Erro ao salvar política', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-white/30 text-sm font-body mb-1">Workspace</p>
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
        <Field label="Plano"      value={barbershop.plan.toUpperCase()} hint={barbershop.active ? 'Ativo' : 'Inativo'} />
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
                <p className="text-white/50 text-xs font-body">{label}</p>
                <p className="text-white/30 text-xs font-body font-mono">{color}</p>
              </div>
            </div>
          ))}
        </div>
        <Field label="Logo texto" value={barbershop.logoText} hint="fallback sem logo" />
      </Section>

      {/* Política de cancelamento */}
      <Section title="Política de Cancelamento" icon={canEdit ? Ban : AlertTriangle} accent>
        {canEdit ? (
          <CancellationForm
            policy={policy}
            onChange={setPolicy}
            onSave={handleSavePolicy}
            saved={policySaved}
            saving={saving}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-white/50 text-sm font-body">Multa ativa</span>
              <span className={`text-sm font-body font-semibold ${policy.enabled ? 'text-red-400' : 'text-white/30'}`}>
                {policy.enabled ? 'Sim' : 'Não'}
              </span>
            </div>
            {policy.enabled && (
              <>
                <div className="flex items-center justify-between py-2">
                  <span className="text-white/50 text-sm font-body">Janela gratuita</span>
                  <span className="text-white/70 text-sm font-body">
                    {WINDOW_OPTIONS.find(o => o.value === policy.freeWindowHours)?.label}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-white/50 text-sm font-body">Multa</span>
                  <span className="text-red-400 text-sm font-body font-semibold">
                    {policy.fineType === 'fixed' ? `R$ ${policy.fineValue}` : `${policy.fineValue}%`}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </Section>

      {canEdit && (
        <div className="flex items-center gap-2 p-4 rounded-xl border border-[#1f1f1f] bg-white/[0.01]">
          <span className="text-white/30 text-xs font-body">
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
