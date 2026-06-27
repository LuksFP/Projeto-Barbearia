// Modal de "novidade no ar" — anuncia uma feature nova com passo a passo.
// Aparece uma vez por conta; quando o dono fecha, fica marcado como visto
// (coluna saas_accounts.seen_announcements via RPC mark_announcement_seen).
//
// Para anunciar uma nova feature: adicione uma entrada em ANNOUNCEMENTS com
// uma `key` inédita. O modal mostra automaticamente o primeiro aviso não visto.

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, ArrowRight, Check } from 'lucide-react'
import { useSaasAccount } from '@/contexts/SaasAccountContext'
import { supabase } from '@/lib/supabase'
import { isDemoMode } from '@/lib/demo'

interface Announcement {
  key: string
  badge: string
  title: string
  description: string
  steps: string[]
  ctaLabel?: string
  ctaTo?: string
}

const ANNOUNCEMENTS: Announcement[] = [
  {
    key: 'ai-financeiro-2026-06',
    badge: 'Novidade no ar',
    title: 'Inteligência Artificial chegou no BarberOS',
    description:
      'Agora a IA analisa o faturamento da sua barbearia e gera um resumo do mês com dicas práticas — sem você fazer nada.',
    steps: [
      'Abra o menu Financeiro',
      'No topo da página, veja o card “Resumo do mês · IA”',
      'A IA monta o resumo automático com os seus números (planos Pro e Premium)',
    ],
    ctaLabel: 'Ver no Financeiro',
    ctaTo: '/dashboard/financeiro',
  },
]

const cacheKey = (accountId: string) => `barberos:announcements:${accountId}`

function readLocalSeen(accountId: string): string[] {
  try {
    const raw = localStorage.getItem(cacheKey(accountId))
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function writeLocalSeen(accountId: string, keys: string[]) {
  try {
    localStorage.setItem(cacheKey(accountId), JSON.stringify([...new Set(keys)]))
  } catch {
    // localStorage indisponível — ignora (persistência no banco cobre o caso real)
  }
}

const FeatureAnnouncementModal = () => {
  const { account } = useSaasAccount()
  const navigate = useNavigate()
  const [current, setCurrent] = useState<Announcement | null>(null)

  useEffect(() => {
    if (!account) return
    let cancelled = false

    const resolve = async () => {
      // Começa pelo cache local pra não piscar o modal já visto neste aparelho.
      let seen = readLocalSeen(account.id)

      if (!isDemoMode()) {
        const { data } = await supabase
          .from('saas_accounts')
          .select('seen_announcements')
          .eq('id', account.id)
          .maybeSingle()
        if (data?.seen_announcements) seen = data.seen_announcements
      }

      if (cancelled) return
      const next = ANNOUNCEMENTS.find((a) => !seen.includes(a.key))
      if (next) setCurrent(next)
    }

    void resolve()
    return () => {
      cancelled = true
    }
  }, [account])

  const markSeen = async (a: Announcement) => {
    if (!account) return
    writeLocalSeen(account.id, [...readLocalSeen(account.id), a.key])
    if (!isDemoMode()) {
      try {
        await supabase.rpc('mark_announcement_seen', { p_key: a.key })
      } catch {
        // best-effort — o cache local já evita reaparecer neste aparelho
      }
    }
  }

  const close = () => {
    if (current) void markSeen(current)
    setCurrent(null)
  }

  const goToFeature = () => {
    const target = current?.ctaTo
    if (current) void markSeen(current)
    setCurrent(null)
    if (target) navigate(target)
  }

  return createPortal(
    <AnimatePresence>
      {current && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-amber-500/20 bg-[#121212] shadow-2xl"
          >
            {/* brilho decorativo no topo */}
            <div className="pointer-events-none absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl" />

            <button
              onClick={close}
              aria-label="Fechar"
              className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative px-7 pb-7 pt-8">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-400 font-body">
                <Sparkles className="h-3.5 w-3.5" />
                {current.badge}
              </span>

              <h2 className="mt-4 font-heading text-2xl leading-tight tracking-wide text-white">
                {current.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/50 font-body">
                {current.description}
              </p>

              <div className="mt-6 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/30 font-body">
                  Como usar
                </p>
                {current.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-xs font-semibold text-amber-400 font-body">
                      {i + 1}
                    </span>
                    <span className="text-sm leading-relaxed text-white/70 font-body">{step}</span>
                  </div>
                ))}
              </div>

              <div className="mt-7 flex items-center gap-3">
                {current.ctaTo && (
                  <button
                    onClick={goToFeature}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-semibold tracking-wide text-[#0a0a0a] transition-colors hover:bg-amber-400 font-body"
                  >
                    {current.ctaLabel ?? 'Ver agora'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={close}
                  className={`flex items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 font-body ${
                    current.ctaTo ? 'px-5' : 'flex-1'
                  }`}
                >
                  <Check className="h-4 w-4" />
                  Entendi
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export default FeatureAnnouncementModal
