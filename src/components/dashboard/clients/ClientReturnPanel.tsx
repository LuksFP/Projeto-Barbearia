// Na ficha do cliente: aniversário, cartão fidelidade e pacotes. Só aparece o
// que a barbearia ligou em Configurações.
import { useCallback, useEffect, useState } from 'react'
import { Cake, Gift, Loader2, Ticket } from 'lucide-react'
import { useShopFeatures } from '@/hooks/useShopFeatures'
import { featuresRepository } from '@/repositories/featuresRepository'
import { returnRepository, type ClientPackage } from '@/repositories/returnRepository'
import { errorText } from '@/lib/errors'
import { brl, isValidBirthday, parseMoney, type LoyaltyCard } from '@/lib/extras'
import { toast } from '@/hooks/use-toast'
import type { BarbershopClient } from '@/types/tenant'

const field = 'bg-[#161616] border border-[#2a2a2a] rounded-lg px-3 h-10 text-white text-base font-body focus:outline-none focus:border-amber-500/50'
const title = 'flex items-center gap-2 text-white/55 text-xs font-semibold uppercase tracking-widest font-body mb-2'
const primaryBtn = 'h-10 px-4 rounded-lg bg-amber-500 text-black text-sm font-semibold font-body disabled:opacity-40'

const ClientReturnPanel = ({ client }: { client: BarbershopClient }) => {
  const bs = client.barbershopId
  const { features, loaded } = useShopFeatures(bs)
  const [day, setDay] = useState('')
  const [month, setMonth] = useState('')
  const [savedBirthday, setSaved] = useState('/')
  const [card, setCard] = useState<LoyaltyCard | null>(null)
  const [packs, setPacks] = useState<ClientPackage[]>([])
  const [selling, setSelling] = useState(false)
  const [name, setName] = useState('4 cortes')
  const [uses, setUses] = useState('4')
  const [price, setPrice] = useState('')
  const [armedPrize, setArmedPrize] = useState(false)
  const [busy, setBusy] = useState(false)

  const loadPacks = useCallback(() => returnRepository.packages(bs, client).then(setPacks), [bs, client.id, client.phone]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loaded) return
    let alive = true
    setDay(''); setMonth(''); setSaved('/'); setCard(null); setPacks([]); setSelling(false)
    if (features.birthdaysEnabled) {
      featuresRepository.birthdays(bs).then(l => {
        const b = l.find(x => x.clientId === client.id)
        if (alive && b) { setDay(String(b.day)); setMonth(String(b.month)); setSaved(`${b.day}/${b.month}`) }
      }).catch(() => {})
    }
    returnRepository.loyalty(bs, client.phone, features).then(c => { if (alive) setCard(c) }).catch(() => {})
    if (features.packagesEnabled) loadPacks().catch(() => {})
    return () => { alive = false }
  }, [loaded, bs, client.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!loaded || (!features.birthdaysEnabled && !features.loyaltyEnabled && !features.packagesEnabled)) return null

  const empty = day === '' && month === ''
  const valid = empty || isValidBirthday(Number(day), Number(month))

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true)
    try { await fn(); toast({ title: ok }) }
    catch (err: unknown) {
      const known = errorText(err).match(/(Conclua o horário[^"]*|Esse pacote já foi todo usado|Esse cliente ainda não completou o cartão)/)
      toast({ title: known ? known[1] : 'Não deu pra salvar', variant: 'destructive' })
    }
    finally { setBusy(false) }
  }

  const givePrize = () => {
    if (!armedPrize) { setArmedPrize(true); return }
    setArmedPrize(false)
    void run(async () => {
      await returnRepository.redeem(bs, client.phone, features)
      setCard(await returnRepository.loyalty(bs, client.phone, features))
    }, 'Prêmio entregue')
  }

  const useOne = (p: ClientPackage) => run(async () => {
    await returnRepository.use(bs, p)
    await loadPacks()
  }, 'Descontado 1 do pacote')

  const undoOne = (p: ClientPackage) => run(async () => {
    await returnRepository.undoUse(bs, p)
    await loadPacks()
  }, 'Uso desfeito')

  const saveBirthday = () => run(async () => {
    await featuresRepository.setBirthday(bs, client, empty ? null : Number(day), empty ? null : Number(month))
    setSaved(`${day}/${month}`)
  }, empty ? 'Aniversário apagado' : 'Aniversário salvo')

  const sell = () => run(async () => {
    await returnRepository.sell(bs, client, { name: name.trim(), totalUses: Number(uses), price: parseMoney(price) })
    setSelling(false); setPrice('')
    await loadPacks()
  }, 'Pacote vendido')

  const canSell = name.trim() && Number.isInteger(Number(uses)) && Number(uses) >= 2 && Number(uses) <= 50 && parseMoney(price) > 0
  // esgotado continua visível enquanto dá pra desfazer o último uso
  const open = packs.filter(p => p.used < p.totalUses || p.used > 0)

  return (
    <div className="px-6 py-4 border-b border-[#1a1a1a] space-y-4 max-h-[45vh] overflow-y-auto">
      {features.birthdaysEnabled && (
        <div>
          <p className={title}><Cake className="w-3.5 h-3.5 text-amber-400/70" />Aniversário</p>
          <div className="flex items-center gap-2">
            <input inputMode="numeric" aria-label="Dia do aniversário" placeholder="Dia" maxLength={2} value={day} onChange={e => setDay(e.target.value.replace(/\D/g, ''))} className={`${field} w-16`} />
            <span className="text-white/40">/</span>
            <input inputMode="numeric" aria-label="Mês do aniversário" placeholder="Mês" maxLength={2} value={month} onChange={e => setMonth(e.target.value.replace(/\D/g, ''))} className={`${field} w-16`} />
            {`${day}/${month}` !== savedBirthday && <button type="button" disabled={busy || !valid} onClick={() => void saveBirthday()} className={primaryBtn}>Salvar</button>}
          </div>
          {!valid && day && month && <p className="text-xs font-body text-red-300 mt-1">Essa data não existe.</p>}
        </div>
      )}

      {card && (
        <div>
          <p className={title}><Gift className="w-3.5 h-3.5 text-amber-400/70" />Cartão fidelidade</p>
          {card.goal <= 20 && (
            <div className="flex flex-wrap gap-1.5" aria-hidden="true">
              {Array.from({ length: card.goal }, (_, i) => (
                <span key={i} className={`w-4 h-4 rounded-full border ${i < Math.min(card.progress, card.goal) ? 'bg-amber-400 border-amber-400' : 'border-white/20'}`} />
              ))}
            </div>
          )}
          <p className="text-sm font-body text-white/75 mt-1.5">
            {card.available > 0 ? <b className="text-amber-300">Tem prêmio: {card.reward}</b> : `${card.progress} de ${card.goal} pra ganhar ${card.reward}`}
          </p>
          {card.available > 0 && (
            <button type="button" disabled={busy} onClick={givePrize} onBlur={() => setArmedPrize(false)} className={`${primaryBtn} mt-2`}>
              {armedPrize ? 'Toque de novo pra confirmar' : 'Entregar prêmio'}
            </button>
          )}
        </div>
      )}

      {features.packagesEnabled && (
        <div>
          <p className={title}><Ticket className="w-3.5 h-3.5 text-amber-400/70" />Pacotes</p>
          {open.length === 0 && !selling && <p className="text-sm font-body text-white/50 mb-2">Nenhum pacote em aberto.</p>}
          {open.map(p => (
            <div key={p.id} className="mb-3">
              <p className="text-sm font-body text-white/80">{p.name} · <b>restam {p.totalUses - p.used}</b> de {p.totalUses} <span className="text-white/40">({brl(p.price)})</span></p>
              <div className="flex items-center gap-3 mt-1.5">
                {p.used < p.totalUses && <button type="button" disabled={busy} onClick={() => void useOne(p)} className="h-9 px-3 rounded-lg border border-amber-500/40 text-amber-300 text-xs font-semibold font-body disabled:opacity-40">Usar 1</button>}
                {p.used > 0 && <button type="button" disabled={busy} onClick={() => void undoOne(p)} className="h-9 text-xs font-body text-white/45 underline underline-offset-2 hover:text-white">Desfazer último</button>}
              </div>
            </div>
          ))}
          {open.some(p => p.used < p.totalUses) && <p className="text-xs font-body text-white/40 mb-2">Conclua o horário na Agenda e depois toque em “Usar 1”.</p>}
          {!selling ? (
            <button type="button" onClick={() => setSelling(true)} className="h-9 text-sm font-semibold font-body text-amber-400">+ Vender pacote</button>
          ) : (
            <div className="space-y-2 mt-2">
              <input aria-label="Nome do pacote" value={name} maxLength={60} onChange={e => setName(e.target.value)} className={`${field} w-full`} />
              <div className="grid grid-cols-2 gap-2">
                <input aria-label="Quantidade de usos" inputMode="numeric" value={uses} onChange={e => setUses(e.target.value.replace(/\D/g, ''))} placeholder="Usos" className={`${field} w-full`} />
                <input aria-label="Preço do pacote" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} placeholder="Preço em R$" className={`${field} w-full`} />
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={busy || !canSell} onClick={() => void sell()} className={`${primaryBtn} flex items-center gap-2`}>{busy && <Loader2 className="w-4 h-4 animate-spin" />}Registrar venda</button>
                <button type="button" onClick={() => setSelling(false)} className="h-10 px-3 text-sm font-body text-white/55">Voltar</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ClientReturnPanel
