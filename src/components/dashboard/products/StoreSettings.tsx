// Configurações › Vendas no site.
//   "Leve junto no dia": liga/desliga e escolhe quais produtos aparecem no fim
//   do agendamento (Básico 1, Pro até 3, Premium sem limite).
//   Loja no site: página da loja, sacola e reserva sem horário — só Premium.
// Os produtos em si (preço, foto, estoque) continuam na página Loja.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Lock, Package } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { useTenant } from '@/contexts/TenantContext'
import { useSaasAccount } from '@/contexts/SaasAccountContext'
import { demoStoreSettings, productErrorMessage, saveDemoStoreSettings, useProducts } from '@/hooks/useProducts'
import { bumpLimit, hasFullStore } from '@/lib/storePlan'
import { toast } from '@/hooks/use-toast'
import { PLAN_NAME } from '@/types/saas'


const StoreSettings = ({ canEdit }: { canEdit: boolean }) => {
  const { barbershop, updateBarbershop } = useTenant()
  const { account } = useSaasAccount()
  const { products, loading, demo, setInBump } = useProducts(barbershop?.id)
  const plan = account?.plan ?? 'basic'
  const limit = bumpLimit(plan)
  const premium = hasFullStore(plan)

  // No demo as chaves ficam junto da loja demo (localStorage); no real, na barbearia
  const [flags, setFlags] = useState(() =>
    demo && barbershop
      ? demoStoreSettings(barbershop.id)
      : { storeEnabled: barbershop?.storeEnabled ?? true, bumpEnabled: barbershop?.bumpEnabled ?? true },
  )
  const [busy, setBusy] = useState<string | null>(null)

  if (!barbershop) return null

  const setFlag = async (key: 'storeEnabled' | 'bumpEnabled', value: boolean) => {
    setBusy(key)
    const prev = flags
    setFlags(f => ({ ...f, [key]: value }))
    try {
      if (demo) saveDemoStoreSettings(barbershop.id, { [key]: value })
      else await updateBarbershop({ [key]: value })
    } catch {
      setFlags(prev)
      toast({ title: 'Não deu pra salvar. Tente de novo.', variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  const toggleProduct = async (id: string, value: boolean) => {
    setBusy(id)
    try {
      await setInBump(id, value)
    } catch (err: unknown) {
      toast({ title: productErrorMessage(err), variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  // Fora do Premium só os N mais antigos entram, mesmo que haja mais marcados
  const marked = products.filter(p => p.inBump && p.visibleOnSite)
  const atLimit = limit !== null && marked.length >= limit

  return (
    <div className="space-y-6">
      {/* ── Leve junto ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <p className="text-white text-sm font-semibold font-body">“Leve junto no dia” no agendamento</p>
            <p className="text-white/60 text-xs font-body mt-0.5">
              Na última etapa do agendamento o cliente separa um produto e paga tudo aqui, junto com o corte.
              {' '}No {PLAN_NAME[plan]}: {limit === null ? 'quantos produtos quiser' : limit === 1 ? '1 produto' : `até ${limit} produtos`}.
            </p>
          </div>
          <Switch
            checked={flags.bumpEnabled}
            disabled={!canEdit || busy === 'bumpEnabled'}
            onCheckedChange={v => void setFlag('bumpEnabled', v)}
            aria-label="Oferecer produtos no agendamento"
          />
        </div>

        {flags.bumpEnabled && (
          loading ? null : products.length === 0 ? (
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-white/10 px-4 py-3">
              <Package className="w-4 h-4 text-amber-400/70 shrink-0" />
              <p className="text-white/65 text-sm font-body flex-1">Nenhum produto cadastrado ainda.</p>
              <Link to="/dashboard/loja" className="text-amber-300 text-sm font-body hover:text-amber-200 whitespace-nowrap">Cadastrar na Loja →</Link>
            </div>
          ) : (
            <div>
              <p className="text-white/50 text-xs font-body mb-2">
                Aparecem no agendamento: {marked.length}{limit !== null ? ` de ${limit}` : ''}
              </p>
              <ul className="divide-y divide-white/5 rounded-lg border border-white/5">
                {products.map(p => {
                  const blocked = !p.inBump && atLimit
                  return (
                    <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                      <input
                        type="checkbox"
                        id={`bump-${p.id}`}
                        checked={p.inBump}
                        disabled={!canEdit || blocked || busy === p.id || !p.visibleOnSite}
                        onChange={e => void toggleProduct(p.id, e.target.checked)}
                        className="w-4 h-4 accent-amber-500"
                      />
                      <label htmlFor={`bump-${p.id}`} className="flex-1 min-w-0 text-sm font-body text-white/85 truncate">
                        {p.name}
                        <span className="text-white/45"> · R$ {p.price.toFixed(2).replace('.', ',')}</span>
                        {!p.visibleOnSite && <span className="text-white/45"> · fora do site</span>}
                        {p.stock === 0 && <span className="text-red-300/80"> · sem estoque</span>}
                      </label>
                    </li>
                  )
                })}
              </ul>
              {atLimit && products.length > marked.length && (
                <p className="text-white/50 text-xs font-body mt-2">Limite do {PLAN_NAME[plan]}. Desmarque um pra trocar.</p>
              )}
            </div>
          )
        )}
      </div>

      {/* ── Loja completa ──────────────────────────────────────────────── */}
      <div className="flex items-start gap-4 border-t border-white/5 pt-5">
        <div className="flex-1">
          <p className="flex items-center gap-2 text-white text-sm font-semibold font-body">
            Loja no site
            {!premium && <Lock className="w-3.5 h-3.5 text-white/40" aria-hidden />}
          </p>
          {premium ? (
            <p className="text-white/60 text-xs font-body mt-0.5">
              Página da loja com todos os produtos, sacola e reserva sem horário em /b/{barbershop.slug}/loja.
            </p>
          ) : (
            <Link to="/dashboard/assinatura" className="mt-0.5 inline-flex items-center gap-1 text-amber-300 text-xs font-body hover:text-amber-200">
              Vem no Premium: página da loja, produtos sem limite, sacola e reserva sem horário
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
        <Switch
          checked={premium && flags.storeEnabled}
          disabled={!premium || !canEdit || busy === 'storeEnabled'}
          onCheckedChange={v => void setFlag('storeEnabled', v)}
          aria-label="Mostrar a loja no site"
        />
      </div>
    </div>
  )
}

export default StoreSettings
