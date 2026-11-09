// Caixa de sugestões: a equipe da barbearia pede o que quer ver no BarberOS.
// Modo real grava em app_suggestions (Supabase); demo guarda no navegador.

import { useCallback, useEffect, useState } from 'react'
import { Send, Trash2, CornerDownRight } from 'lucide-react'
import { useTenant } from '@/contexts/TenantContext'
import { isDemoMode } from '@/lib/demo'
import { toast } from '@/hooks/use-toast'
import {
  suggestionRepository,
  SUGGESTION_AREAS,
  type Suggestion,
  type SuggestionArea,
  type SuggestionStatus,
} from '@/repositories/suggestionRepository'

const AREA_LABELS: Record<SuggestionArea, string> = {
  agenda: 'Agenda',
  clientes: 'Clientes',
  financeiro: 'Financeiro',
  site: 'Site da barbearia',
  equipe: 'Equipe',
  outro: 'Outra coisa',
}

const STATUS: Record<SuggestionStatus, { label: string; className: string }> = {
  recebida: { label: 'Recebida', className: 'text-white/70 border-white/15' },
  analisando: { label: 'Estamos vendo', className: 'text-sky-300 border-sky-400/30' },
  vai_entrar: { label: 'Vai entrar', className: 'text-amber-300 border-amber-400/40' },
  no_ar: { label: 'Já está no app', className: 'text-emerald-300 border-emerald-400/40' },
  nao_agora: { label: 'Agora não', className: 'text-white/60 border-white/10' },
}

// Ideias de partida: tocar preenche o campo, pra quem não sabe por onde começar.
const STARTERS = [
  'Queria que o cliente pudesse remarcar sozinho pelo site',
  'Falta um relatório de quanto cada barbeiro vendeu de produto',
  'Seria bom bloquear um dia inteiro de folga na agenda',
]

const MIN_LEN = 5
const MAX_LEN = 1000

const demoKey = (bsId: string) => `barberos:suggestions:${bsId}`

const loadDemo = (bsId: string): Suggestion[] => {
  try {
    const raw = localStorage.getItem(demoKey(bsId))
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as Suggestion[]) : []
  } catch {
    return []
  }
}

const saveDemo = (bsId: string, list: Suggestion[]) => {
  localStorage.setItem(demoKey(bsId), JSON.stringify(list))
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')

const DashboardSugestoes = () => {
  const { barbershop, tenantUser } = useTenant()
  const demo = isDemoMode()
  const [area, setArea] = useState<SuggestionArea>('agenda')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [list, setList] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!barbershop) return
    if (demo) {
      setList(loadDemo(barbershop.id))
      setLoading(false)
      return
    }
    try {
      setList(await suggestionRepository.listByBarbershop(barbershop.id))
    } catch {
      toast({ title: 'Não deu pra carregar as sugestões', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [barbershop, demo])

  useEffect(() => { void load() }, [load])

  if (!barbershop) return null

  const text = body.trim()
  const canSend = text.length >= MIN_LEN && !sending

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSend) return
    const authorName = tenantUser?.name?.trim() || 'Equipe'
    setSending(true)
    try {
      if (demo) {
        const item: Suggestion = {
          id: crypto.randomUUID(),
          barbershopId: barbershop.id,
          userId: tenantUser?.id ?? 'demo',
          authorName,
          area,
          body: text,
          status: 'recebida',
          reply: null,
          createdAt: new Date().toISOString(),
        }
        const next = [item, ...list]
        saveDemo(barbershop.id, next)
        setList(next)
      } else {
        const created = await suggestionRepository.create({ barbershopId: barbershop.id, authorName, area, body: text })
        setList(prev => [created, ...prev])
      }
      setBody('')
      toast({ title: 'Sugestão enviada', description: 'A gente lê todas. O andamento aparece aqui embaixo.' })
    } catch (err: unknown) {
      const msg = err instanceof Error && err.message.includes('limite')
        ? 'Muitas sugestões hoje. Manda o resto amanhã.'
        : 'Tenta de novo em instantes.'
      toast({ title: 'Não deu pra enviar', description: msg, variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  const remove = async (s: Suggestion) => {
    const prev = list
    const next = list.filter(x => x.id !== s.id)
    setList(next)
    if (demo) { saveDemo(barbershop.id, next); return }
    try {
      await suggestionRepository.remove(s.id)
    } catch {
      setList(prev)
      toast({ title: 'Não deu pra apagar', variant: 'destructive' })
    }
  }

  const myId = tenantUser?.id

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="font-heading text-3xl tracking-wide text-white">SUGESTÕES</h1>
        <p className="text-white/65 text-sm font-body mt-2 max-w-xl">
          O que falta no BarberOS pro dia a dia da sua barbearia? Escreve do seu jeito,
          a gente lê cada uma e responde aqui.
        </p>
      </div>

      <form onSubmit={submit} className="border-l-2 border-amber-500/60 pl-5 sm:pl-6 space-y-4">
        <div>
          <p className="text-white/70 text-xs font-body mb-2">É sobre</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTION_AREAS.map(a => (
              <button
                key={a}
                type="button"
                onClick={() => setArea(a)}
                aria-pressed={area === a}
                className={`px-3 py-1.5 rounded-md text-xs font-body border transition-colors ${
                  area === a
                    ? 'bg-amber-500/[0.12] border-amber-500/40 text-amber-300'
                    : 'border-[#2a2a2a] text-white/70 hover:text-white/80 hover:border-[#3a3a3a]'
                }`}
              >
                {AREA_LABELS[a]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="sugestao" className="text-white/70 text-xs font-body block mb-2">Sua ideia</label>
          <textarea
            id="sugestao"
            value={body}
            onChange={e => setBody(e.target.value.slice(0, MAX_LEN))}
            rows={5}
            placeholder="Ex.: queria ver na agenda quem é cliente novo"
            className="w-full resize-y rounded-lg bg-[#141414] border border-[#2a2a2a] focus:border-amber-500/50 focus:outline-none px-4 py-3 text-base sm:text-sm text-white font-body placeholder:text-white/40"
          />
          {body.length === 0 && (
            <div className="mt-2 text-xs font-body text-white/60 space-y-1">
              <span>Sem ideia de por onde começar? Toque numa:</span>
              <ul className="space-y-1">
                {STARTERS.map(s => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => setBody(s)}
                      className="text-left text-white/70 underline decoration-white/20 underline-offset-4 hover:text-amber-300 hover:decoration-amber-400/50"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={!canSend}
            className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-amber-500 text-black text-sm font-semibold font-body hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Enviando…' : 'Enviar sugestão'}
          </button>
          <span className="text-white/55 text-xs font-body tabular-nums">{body.length}/{MAX_LEN}</span>
        </div>
      </form>

      <section>
        <h2 className="text-white text-sm font-semibold font-body mb-1">O que a barbearia já pediu</h2>
        <p className="text-white/60 text-xs font-body mb-4">Toda a equipe vê esta lista. Dá pra apagar a sua enquanto ela estiver como “Recebida”.</p>

        {loading ? (
          <p className="text-white/55 text-sm font-body py-6">Carregando…</p>
        ) : list.length === 0 ? (
          <p className="text-white/55 text-sm font-body py-6">Nenhuma sugestão ainda. A primeira pode ser a sua.</p>
        ) : (
          <ol className="divide-y divide-[#1f1f1f] border-y border-[#1f1f1f]">
            {list.map(s => {
              const st = STATUS[s.status]
              const mine = demo || s.userId === myId
              return (
                <li key={s.id} className="py-4 grid grid-cols-[1fr_auto] sm:grid-cols-[3.5rem_1fr_auto] gap-x-3 gap-y-1 items-start">
                  <span className="hidden sm:block text-white/60 text-xs font-body pt-0.5 tabular-nums">{formatDate(s.createdAt)}</span>
                  <div className="min-w-0">
                    <p className="text-white/85 text-sm font-body whitespace-pre-line break-words">{s.body}</p>
                    <p className="text-white/60 text-xs font-body mt-1"><span className="sm:hidden">{formatDate(s.createdAt)} · </span>{AREA_LABELS[s.area]} · {s.authorName}</p>
                    {s.reply && (
                      <p className="mt-2 flex gap-1.5 text-xs font-body text-amber-200/80">
                        <CornerDownRight className="w-3.5 h-3.5 shrink-0 mt-px" />
                        <span><span className="text-amber-300 font-semibold">BarberOS:</span> {s.reply}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] px-2 py-0.5 rounded border font-body whitespace-nowrap ${st.className}`}>{st.label}</span>
                    {mine && s.status === 'recebida' && (
                      <button
                        type="button"
                        onClick={() => void remove(s)}
                        aria-label="Apagar sugestão"
                        className="p-1 text-white/55 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}

export default DashboardSugestoes
