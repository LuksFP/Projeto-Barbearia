// Visão Geral › Placa BarberPro dos R$10 mil. Três estados:
//   - caminhando: barra do mês com marcos, recorde e projeção no ritmo atual;
//   - bateu (mês atual ou um dos 3 anteriores ≥ R$10 mil, sem pedido): comemora
//     e o dono/admin pede a placa com o endereço;
//   - pedida: mostra a placa e o status do envio.
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Award, Loader2, Truck, PackageCheck } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { formatPhoneBR } from '@/lib/phone'
import { PLAQUE_GOAL, plaqueRepository, type PlaqueClaim, type PlaqueInput } from '@/repositories/plaqueRepository'

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const monthName = (ym: string) => MONTHS[Number(ym.slice(5, 7)) - 1] ?? ym
const brl0 = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

interface Props {
  barbershopId: string
  shopName: string
  /** Faturamento por mês ('YYYY-MM'), serviços + loja, igual ao Financeiro. */
  months: { month: string; total: number }[]
  canClaim: boolean
}

/** A plaquinha desenhada: dá cara ao prêmio antes de chegar. */
const Plaque = ({ name, dim }: { name: string; dim?: boolean }) => (
  <div className={`relative w-[104px] h-[132px] shrink-0 rounded-[6px] p-[5px] -rotate-[4deg] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] ${dim ? 'opacity-35 grayscale' : ''}`}
    style={{ background: 'linear-gradient(150deg,#3a2a12 0%,#1c140a 100%)' }}>
    <div className="h-full w-full rounded-[3px] border border-[#e9c46a]/50 flex flex-col items-center justify-center text-center px-1.5"
      style={{ background: 'linear-gradient(160deg,#f3d27a 0%,#c9962f 45%,#f0cd73 70%,#a87720 100%)' }}>
      <span className="text-[7px] tracking-[0.2em] text-[#3b2a0c]/80 font-body font-bold">BARBERPRO</span>
      <span className="font-heading text-[26px] leading-none text-[#2a1d06] mt-1">10 MIL</span>
      <span className="text-[6.5px] tracking-[0.12em] text-[#3b2a0c]/80 font-body font-semibold mt-0.5">EM UM MÊS</span>
      <span className="w-8 h-px bg-[#3b2a0c]/40 my-1.5" />
      <span className="text-[8px] leading-tight text-[#2a1d06] font-body font-bold uppercase break-words line-clamp-2">{name}</span>
    </div>
  </div>
)

const field = 'w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-md px-3 py-2 text-base sm:text-sm text-white font-body focus:outline-none focus:border-amber-500/60'
const label = 'text-white/55 text-xs font-body mb-1.5 block'

const PlaqueGoal = ({ barbershopId, shopName, months, canClaim }: Props) => {
  const [claim, setClaim] = useState<PlaqueClaim | null | undefined>(undefined)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nameOnPlaque: shopName, recipient: '', phone: '', cep: '', address: '', city: '', state: '' })

  useEffect(() => {
    let alive = true
    plaqueRepository.get(barbershopId).then(c => { if (alive) setClaim(c) }).catch(() => { if (alive) setClaim(null) })
    return () => { alive = false }
  }, [barbershopId])
  useEffect(() => { setForm(f => ({ ...f, nameOnPlaque: f.nameOnPlaque || shopName })) }, [shopName])

  if (claim === undefined) return null

  const now = new Date()
  const cur = ym(now)
  const first = ym(new Date(now.getFullYear(), now.getMonth() - 3, 1))
  const revenueNow = months.find(m => m.month === cur)?.total ?? 0
  const winning = months.filter(m => m.month >= first && m.month <= cur && m.total >= PLAQUE_GOAL)
    .sort((a, b) => b.total - a.total)[0]
  const record = months.filter(m => m.month !== cur).sort((a, b) => b.total - a.total)[0]

  // ─── Pedida ─────────────────────────────────────────────────────────────
  if (claim) {
    const steps = [
      { key: 'pedida', label: 'Pedida', icon: Award },
      { key: 'enviada', label: 'A caminho', icon: Truck },
      { key: 'entregue', label: 'Entregue', icon: PackageCheck },
    ] as const
    const at = steps.findIndex(s => s.key === claim.status)
    return (
      <div className="flex flex-wrap items-center gap-6 p-5 rounded-xl border border-[#e9c46a]/25 bg-[linear-gradient(110deg,rgba(233,196,106,0.08),rgba(22,22,22,1)_55%)]">
        <Plaque name={claim.nameOnPlaque} />
        <div className="flex-1 min-w-[220px]">
          <p className="text-[#f0cd73] text-xs font-body font-semibold tracking-wide uppercase">Placa dos R$ 10 mil</p>
          <p className="text-white font-heading text-2xl tracking-wide mt-1">
            {claim.status === 'entregue' ? 'Placa entregue. Pendura ela aí!' : claim.status === 'enviada' ? 'Sua placa está a caminho' : 'Placa pedida'}
          </p>
          <p className="text-white/60 text-sm font-body mt-1">
            Ganhou com {brl0(claim.revenue)} em {monthName(claim.month)}. Vai pra {claim.city}/{claim.state}.
          </p>
          <ol className="flex items-center gap-2 mt-4">
            {steps.map((s, i) => (
              <li key={s.key} className="flex items-center gap-2">
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-body border ${i <= at ? 'border-[#e9c46a]/40 bg-[#e9c46a]/10 text-[#f0cd73]' : 'border-[#2a2a2a] text-white/35'}`}>
                  <s.icon className="w-3 h-3" />{s.label}
                </span>
                {i < steps.length - 1 && <span className={`w-4 h-px ${i < at ? 'bg-[#e9c46a]/50' : 'bg-[#2a2a2a]'}`} />}
              </li>
            ))}
          </ol>
        </div>
      </div>
    )
  }

  const submit = async () => {
    if (!winning) return
    const input: PlaqueInput = { month: winning.month, ...form }
    setSaving(true)
    try {
      const c = await plaqueRepository.claim(barbershopId, input, winning.total)
      setClaim(c)
      setOpen(false)
      toast({ title: 'Placa pedida!', description: 'A equipe BarberPro vai preparar e mandar pro endereço que você passou.' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      toast({ title: 'Não deu pra pedir a placa', description: msg || 'Tente de novo em instantes.', variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const digits = (s: string) => s.replace(/\D/g, '')
  const ready = form.nameOnPlaque.trim().length >= 2 && form.recipient.trim().length >= 2 && digits(form.phone).length >= 10
    && /^\d{8}$/.test(digits(form.cep)) && form.address.trim().length >= 5 && form.city.trim().length >= 2 && /^[A-Za-z]{2}$/.test(form.state.trim())
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  // ─── Bateu: comemora e pede ─────────────────────────────────────────────
  if (winning) {
    return (
      <>
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden flex flex-wrap items-center gap-6 p-5 rounded-xl border border-[#e9c46a]/40 bg-[linear-gradient(110deg,rgba(233,196,106,0.16),rgba(22,22,22,1)_60%)]">
          <Plaque name={form.nameOnPlaque || shopName} />
          <div className="flex-1 min-w-[220px]">
            <p className="text-[#f0cd73] text-xs font-body font-semibold tracking-wide uppercase">Meta batida</p>
            <p className="text-white font-heading text-2xl sm:text-3xl tracking-wide mt-1">
              {brl0(winning.total)} em {monthName(winning.month)}. A placa é de vocês.
            </p>
            <p className="text-white/60 text-sm font-body mt-1">
              Toda barbearia que fatura R$ 10 mil num mês ganha a placa BarberPro, mandada pela nossa equipe.
            </p>
            {canClaim ? (
              <button type="button" onClick={() => setOpen(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold font-body text-[#2a1d06] hover:brightness-110"
                style={{ background: 'linear-gradient(160deg,#f3d27a,#c9962f)' }}>
                <Award className="w-4 h-4" />Receber minha placa
              </button>
            ) : (
              <p className="mt-3 text-white/50 text-xs font-body">Peça pro dono da barbearia entrar e pedir a placa.</p>
            )}
          </div>
        </motion.div>

        <Dialog open={open} onOpenChange={o => { if (!saving) setOpen(o) }}>
          <DialogContent className="bg-[#141414] border-[#2a2a2a] text-white max-w-md max-h-[92vh] overflow-y-auto">
            <DialogTitle className="font-body text-lg flex items-center gap-2"><Award className="w-4 h-4 text-[#f0cd73]" />Pra onde mandamos a placa?</DialogTitle>
            <DialogDescription className="text-white/60 text-sm font-body">
              Confere o nome que vai gravado e o endereço da barbearia. Só dá pra pedir uma vez.
            </DialogDescription>
            <div className="space-y-3 mt-1">
              <div>
                <label htmlFor="pl-name" className={label}>Nome gravado na placa</label>
                <input id="pl-name" className={field} maxLength={60} value={form.nameOnPlaque} onChange={set('nameOnPlaque')} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pl-rec" className={label}>Quem recebe</label>
                  <input id="pl-rec" className={field} maxLength={120} value={form.recipient} onChange={set('recipient')} placeholder="Nome" />
                </div>
                <div>
                  <label htmlFor="pl-phone" className={label}>WhatsApp</label>
                  <input id="pl-phone" className={field} inputMode="tel" value={form.phone} placeholder="(13) 99999-9999"
                    onChange={e => setForm(f => ({ ...f, phone: formatPhoneBR(e.target.value) }))} />
                </div>
              </div>
              <div className="grid grid-cols-[8rem_1fr] gap-3">
                <div>
                  <label htmlFor="pl-cep" className={label}>CEP</label>
                  <input id="pl-cep" className={field} inputMode="numeric" maxLength={9} value={form.cep} placeholder="00000-000"
                    onChange={e => { const d = digits(e.target.value).slice(0, 8); setForm(f => ({ ...f, cep: d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d })) }} />
                </div>
                <div>
                  <label htmlFor="pl-addr" className={label}>Rua, número e complemento</label>
                  <input id="pl-addr" className={field} maxLength={200} value={form.address} onChange={set('address')} placeholder="Av. Ana Costa, 120, loja 2" />
                </div>
              </div>
              <div className="grid grid-cols-[1fr_5rem] gap-3">
                <div>
                  <label htmlFor="pl-city" className={label}>Cidade</label>
                  <input id="pl-city" className={field} maxLength={80} value={form.city} onChange={set('city')} />
                </div>
                <div>
                  <label htmlFor="pl-uf" className={label}>UF</label>
                  <input id="pl-uf" className={`${field} uppercase`} maxLength={2} value={form.state}
                    onChange={e => setForm(f => ({ ...f, state: e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase() }))} placeholder="SP" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setOpen(false)} disabled={saving} className="px-3 py-2 rounded-md text-sm font-body text-white/60 hover:text-white">Agora não</button>
              <button type="button" onClick={() => void submit()} disabled={saving || !ready}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold font-body text-[#2a1d06] disabled:opacity-40"
                style={{ background: 'linear-gradient(160deg,#f3d27a,#c9962f)' }}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}Pedir a placa
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // ─── Caminhando ─────────────────────────────────────────────────────────
  const day = now.getDate()
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const projected = day > 0 ? (revenueNow / day) * days : revenueNow
  const pct = Math.min(100, (revenueNow / PLAQUE_GOAL) * 100)
  const recordPct = record ? Math.min(100, (record.total / PLAQUE_GOAL) * 100) : 0
  const missing = Math.max(0, PLAQUE_GOAL - revenueNow)

  return (
    <div className="flex flex-wrap items-center gap-6 p-5 rounded-xl bg-[#161616] border border-[#262626]">
      <Plaque name={shopName} dim />
      <div className="flex-1 min-w-[240px]">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-white text-sm font-semibold font-body">Placa BarberPro dos R$ 10 mil</p>
          <p className="text-white/50 text-xs font-body">fature R$ 10 mil num mês e a gente manda a placa</p>
        </div>
        <p className="mt-2 font-heading text-2xl text-white tabular-nums">
          {brl0(revenueNow)} <span className="text-white/35 text-base">/ R$ 10.000 em {monthName(cur)}</span>
        </p>

        {/* Barra com marcos de 2,5 mil em 2,5 mil e o recorde */}
        <div className="relative mt-3 h-3 rounded-full bg-[#0f0f0f] border border-[#262626]">
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute inset-y-0 left-0 rounded-full" style={{ background: 'linear-gradient(90deg,#a87720,#f0cd73)' }} />
          {[25, 50, 75].map(t => (
            <span key={t} className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${pct >= t ? 'bg-[#2a1d06]' : 'bg-white/20'}`} style={{ left: `calc(${t}% - 3px)` }} />
          ))}
          {record && record.total > revenueNow && (
            <span className="absolute -top-1 -bottom-1 w-0.5 bg-white/60 rounded" style={{ left: `${recordPct}%` }} title={`Recorde: ${brl0(record.total)}`} />
          )}
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-white/35 font-body tabular-nums">
          <span>0</span><span>2,5 mil</span><span>5 mil</span><span>7,5 mil</span><span>10 mil</span>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs font-body">
          <span className="text-white/70">Faltam <b className="text-white">{brl0(missing)}</b></span>
          <span className={projected >= PLAQUE_GOAL ? 'text-emerald-400' : 'text-white/55'}>
            No ritmo de hoje, {monthName(cur)} fecha em {brl0(projected)}{projected >= PLAQUE_GOAL ? ': dá pra bater!' : ''}
          </span>
          {record && (
            <span className="text-white/45">
              Recorde: {monthName(record.month)}, {brl0(record.total)}{record.total < PLAQUE_GOAL ? ` (faltaram ${brl0(PLAQUE_GOAL - record.total)})` : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default PlaqueGoal
