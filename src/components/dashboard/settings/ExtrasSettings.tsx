// Configurações: o que cada barbearia liga ou desliga. Os programas pra o
// cliente voltar começam desligados.
import { useEffect, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
import { useShopFeatures } from '@/hooks/useShopFeatures'
import type { ShopFeatures } from '@/lib/extras'

const HOURS = [{ v: 0, l: 'Até a hora marcada' }, { v: 1, l: '1 hora antes' }, { v: 2, l: '2 horas antes' }, { v: 4, l: '4 horas antes' }, { v: 12, l: '12 horas antes' }, { v: 24, l: '24 horas antes' }]
const field = 'mt-1.5 w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg px-3 h-11 text-white text-base font-body focus:outline-none focus:border-amber-500/50'

const Switch = ({ on, label, hint, disabled, onChange }: { on: boolean; label: string; hint: string; disabled: boolean; onChange: (v: boolean) => void }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
    className="w-full flex items-start justify-between gap-4 text-left disabled:opacity-60">
    <span>
      <span className="block text-white/85 text-sm font-body font-semibold">{label}</span>
      <span className="block text-white/55 text-xs font-body mt-0.5">{hint}</span>
    </span>
    <span className={`mt-0.5 w-11 h-6 rounded-full border relative shrink-0 transition-colors ${on ? 'bg-amber-500 border-amber-500' : 'border-white/20'}`}>
      <span className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </span>
  </button>
)

const ExtrasSettings = ({ canEdit }: { canEdit: boolean }) => {
  const { barbershop } = useTenant()
  const { features, loaded, failed, save } = useShopFeatures(barbershop?.id)
  const [draft, setDraft] = useState<ShopFeatures>(features)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'' | 'ok' | 'erro'>('')
  useEffect(() => { setDraft(features) }, [features])

  if (failed) return <p className="text-sm font-body text-red-300">Não carregou essas opções. Recarregue a página.</p>
  if (!loaded) return <Loader2 className="w-5 h-5 animate-spin text-white/50" />

  const set = <K extends keyof ShopFeatures>(k: K, v: ShopFeatures[K]) => { setDraft(d => ({ ...d, [k]: v })); setStatus('') }
  const goalOk = Number.isInteger(draft.loyaltyGoal) && draft.loyaltyGoal >= 2 && draft.loyaltyGoal <= 50 && draft.loyaltyReward.trim().length > 0
  const dirty = JSON.stringify(draft) !== JSON.stringify(features)

  const submit = async () => {
    setSaving(true)
    try {
      await save({ ...draft, loyaltyReward: draft.loyaltyReward.trim() || features.loyaltyReward })
      setStatus('ok')
    } catch {
      setStatus('erro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Switch disabled={!canEdit} on={draft.selfCancelHours !== null} onChange={v => set('selfCancelHours', v ? 2 : null)}
          label="Cliente cancela e remarca pelo link" hint="Sem isso, ele precisa chamar vocês. Horário fixo ou pago pelo site sempre fica no WhatsApp." />
        {draft.selfCancelHours !== null && (
          <label className="block text-white/60 text-xs font-body">Pode mexer até
            <select disabled={!canEdit} value={draft.selfCancelHours} onChange={e => set('selfCancelHours', Number(e.target.value))} className={field}>
              {HOURS.map(h => <option key={h.v} value={h.v}>{h.l}</option>)}
              {!HOURS.some(h => h.v === draft.selfCancelHours) && <option value={draft.selfCancelHours}>{draft.selfCancelHours} horas antes</option>}
            </select>
          </label>
        )}
      </div>

      <p className="pt-4 border-t border-white/5 text-white/45 text-xs font-body uppercase tracking-[0.18em]">Pra o cliente voltar · ligue o que quiser usar</p>
      <Switch disabled={!canEdit} on={draft.reviewsEnabled} onChange={v => set('reviewsEnabled', v)}
        label="Avaliação pelo cliente" hint="Depois do atendimento ele dá nota pelo link do horário, e ela aparece no site." />
      <div className="space-y-3">
        <Switch disabled={!canEdit} on={draft.loyaltyEnabled} onChange={v => set('loyaltyEnabled', v)}
          label="Cartão fidelidade" hint="Conta os atendimentos concluídos a partir do dia em que você ligar." />
        {draft.loyaltyEnabled && (
          <div className="grid grid-cols-[7rem_1fr] gap-3">
            <label className="text-white/60 text-xs font-body">Cortes
              <input type="number" min={2} max={50} disabled={!canEdit} value={draft.loyaltyGoal || ''} onChange={e => set('loyaltyGoal', Number(e.target.value))} className={field} />
            </label>
            <label className="text-white/60 text-xs font-body">Ganha
              <input maxLength={80} disabled={!canEdit} value={draft.loyaltyReward} onChange={e => set('loyaltyReward', e.target.value)} className={field} />
            </label>
          </div>
        )}
      </div>
      <Switch disabled={!canEdit} on={draft.packagesEnabled} onChange={v => set('packagesEnabled', v)}
        label="Pacotes pré-pagos" hint="Ex.: 4 cortes com desconto. Vende e desconta os usos na ficha do cliente." />
      <Switch disabled={!canEdit} on={draft.birthdaysEnabled} onChange={v => set('birthdaysEnabled', v)}
        label="Aniversariantes" hint="Guarde dia e mês na ficha. Os do mês aparecem em Lembretes, com a mensagem pronta." />

      {canEdit && (
        <div className="flex items-center justify-end gap-3">
          {status === 'ok' && !dirty && <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-body"><Check className="w-3.5 h-3.5" />Salvo</span>}
          {status === 'erro' && <span role="alert" className="text-red-300 text-xs font-body">Não deu pra salvar</span>}
          <button type="button" onClick={() => void submit()} disabled={saving || !dirty || (draft.loyaltyEnabled && !goalOk)}
            className="h-10 px-5 flex items-center gap-2 rounded-lg bg-amber-500 text-[#0a0a0a] text-sm font-semibold font-body hover:bg-amber-400 disabled:opacity-40">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}Salvar
          </button>
        </div>
      )}
    </div>
  )
}

export default ExtrasSettings
