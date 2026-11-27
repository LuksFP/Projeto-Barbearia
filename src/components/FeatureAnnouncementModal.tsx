// Modal de "novidade no ar" — anuncia uma feature nova com passo a passo.
// Aparece uma vez por conta; quando o dono fecha, fica marcado como visto
// (coluna saas_accounts.seen_announcements via RPC mark_announcement_seen).
//
// Para anunciar uma nova feature: adicione uma entrada em ANNOUNCEMENTS com
// uma `key` inédita. O modal mostra automaticamente o primeiro aviso não visto.

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, X, ArrowRight, Check } from 'lucide-react'
import { useSaasAccount } from '@/contexts/SaasAccountContext'
import { supabase } from '@/lib/supabase'
import { isDemoMode } from '@/lib/demo'
import { ONLINE_PAYMENT_ON } from '@/lib/onlinePayment'

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
    key: 'folgas-bloqueios-2026-11',
    badge: 'Novidade no ar',
    title: 'Folgas, almoço e feriado: ninguém marca em cima',
    description:
      'Agora você fecha o dia que a barbearia não abre, o horário de almoço e as folgas. O cliente não consegue marcar nesses períodos.',
    steps: [
      'Abra “Folgas e bloqueios” e toque nos dias em que a barbearia não abre',
      'Cadastre a pausa de almoço ou bloqueie datas, como feriado, férias ou consulta',
      'Quem já estava marcado continua na Agenda. A tela mostra quem é, pra você avisar ou transferir',
    ],
    ctaLabel: 'Abrir Folgas e bloqueios',
    ctaTo: '/dashboard/folgas',
  },
  {
    key: 'transferir-horario-2026-11',
    badge: 'Novidade no ar',
    title: 'Transfira o cliente de dia, horário ou barbeiro',
    description:
      'O cliente pediu pra mudar? Não precisa mais cancelar e marcar de novo. Mude o horário dele direto na Agenda.',
    steps: [
      'Na Agenda, toque em “Transferir” no horário do cliente. No celular, ele fica no botão “⋯”',
      'Escolha o novo dia, barbeiro e hora. Só aparecem os horários livres',
      'Toque em “Avisar no WhatsApp” pra mandar o horário novo pro cliente. Se ele for fixo, muda só aquele dia',
    ],
    ctaLabel: 'Abrir Agenda',
    ctaTo: '/dashboard/agenda',
  },
  {
    key: 'agenda-mes-2026-11',
    badge: 'Novidade no ar',
    title: 'A Agenda agora mostra o mês inteiro',
    description:
      'No lugar da semana, um calendário do mês com quantos horários cada dia tem. Dá pra ver de uma vez os dias cheios e os vazios.',
    steps: [
      'Abra a Agenda e toque num dia pra ver os horários dele logo abaixo',
      'Use as setas pra trocar de mês e “Hoje” pra voltar',
      'Escolhendo um barbeiro, o calendário conta só os horários dele',
    ],
    ctaLabel: 'Abrir Agenda',
    ctaTo: '/dashboard/agenda',
  },
  {
    key: 'placa-10k-2026-11',
    badge: 'Novidade no ar',
    title: 'Bateu R$ 10 mil num mês? Ganha a placa BarberPro',
    description:
      'Toda barbearia que faturar R$ 10 mil num mês ganha uma placa física, mandada pela equipe BarberPro. A barra na Visão Geral mostra quanto falta, o seu recorde e se dá pra bater no ritmo de hoje.',
    steps: [
      'Na Visão Geral, acompanhe a barra da placa. Conta serviço concluído e venda da loja, igual ao Financeiro',
      'Passou dos R$ 10 mil no mês? Aparece o botão “Receber minha placa”',
      'O dono confere o nome que vai gravado, passa o endereço e acompanha o envio ali mesmo',
    ],
    ctaLabel: 'Ver minha barra',
    ctaTo: '/dashboard',
  },
  {
    key: 'clientes-fixos-tela-2026-11',
    badge: 'Novidade no ar',
    title: 'Clientes fixos ganharam uma tela própria',
    description:
      'Quem vem sempre no mesmo dia e hora agora fica num lugar só, separado por dia da semana. E o horário dele fica reservado: pelo site, nenhum outro cliente consegue marcar em cima.',
    steps: [
      'No menu, abra “Clientes fixos” e toque em “Novo cliente fixo”',
      'Escolha cliente, barbeiro, serviço, o primeiro dia e a hora. Os horários entram confirmados na Agenda',
      'No dia, ele já aparece na Agenda com o botão “Confirmar no WhatsApp” e a mensagem pronta. O horário fica guardado até você tocar em “Parar”',
    ],
    ctaLabel: 'Abrir Clientes fixos',
    ctaTo: '/dashboard/fixos',
  },
  {
    key: 'agenda-avaliacao-fixo-espera-2026-11',
    badge: 'Novidade no ar',
    title: 'Mais clientes voltando, sem esforço',
    description:
      'Três coisas novas na Agenda: pedir avaliação no Google depois do corte, transformar cliente em fixo (repete o horário sozinho) e lista de espera pra quando o dia lota.',
    steps: [
      'Cadastre o link de avaliação em Configurações › Avaliações no Google. Corte concluído? Toque em “Pedir avaliação”',
      'Cliente que vem sempre no mesmo esquema: toque em “Repetir” no horário dele e escolha de quanto em quanto tempo',
      'Dia lotado: o cliente entra na lista de espera pelo site. Desmarcou alguém? A lista aparece na Agenda com o botão “Avisar”',
    ],
    ctaLabel: 'Cadastrar link do Google',
    ctaTo: '/dashboard/configuracoes#avaliacoes',
  },
  {
    key: 'meta-comissao-semana-2026-11',
    badge: 'Novidade no ar',
    title: 'Meta do mês e comissão da semana',
    description:
      'No Financeiro agora dá pra definir quanto você quer faturar no mês e acompanhar numa barra, com a projeção no ritmo atual. E fechar a comissão da semana de cada barbeiro, marcando quem já recebeu.',
    steps: [
      'Abra o Financeiro e toque em “Definir meta”',
      'Em “Comissão da semana”, confira quanto cada barbeiro tem pra receber',
      'Pagou? Toque em “Marcar como pago”. Dá pra copiar o resumo e mandar no grupo da equipe',
    ],
    ctaLabel: 'Abrir Financeiro',
    ctaTo: '/dashboard/financeiro',
  },
  {
    key: 'despesas-lucro-2026-11',
    badge: 'Novidade no ar',
    title: 'Veja quanto sobrou de verdade no mês',
    description:
      'Lance as despesas da barbearia (aluguel, luz, água, produtos…) e o Financeiro mostra faturamento x lucro mês a mês. Comissões e o custo dos produtos vendidos já entram na conta sozinhos.',
    steps: [
      'Abra o Financeiro e desça até “Despesas”',
      'Lance cada gasto. Aluguel e internet? Marque “Repete todo mês” e lance uma vez só',
      'Em “Faturamento x lucro”, toque num mês pra ver pra onde foi o dinheiro',
    ],
    ctaLabel: 'Abrir Financeiro',
    ctaTo: '/dashboard/financeiro',
  },
  {
    key: 'faltou-2026-11',
    badge: 'Novidade no ar',
    title: 'Cliente não apareceu? Marque “Faltou”',
    description:
      'Agora falta não precisa mais virar cancelamento. Passou do horário e o cliente não veio, toque em “Faltou” na Agenda: fica registrado na ficha dele e os produtos que ele separou voltam pro estoque.',
    steps: [
      'Abra a Agenda no dia do horário',
      'Depois que o horário começou, aparece o botão “Faltou”',
      'Marcou sem querer? Toque em “Desfazer falta”',
    ],
    ctaLabel: 'Abrir Agenda',
    ctaTo: '/dashboard/agenda',
  },
  {
    key: 'pagamento-online-loja-2026-11',
    badge: 'Novidade no ar',
    title: 'Cliente já paga o corte e os produtos pelo site',
    description:
      'Conecte sua conta Mercado Pago e, logo depois de agendar, o cliente paga o corte (e o que separou no “Leve junto”) com Pix ou cartão. O dinheiro cai na sua conta. Taxa do BarberPro: 1,5% por pagamento online, mais a do Mercado Pago. Quem preferir continua pagando na barbearia.',
    steps: [
      'Em Configurações › Vendas no site, toque em “Conectar minha conta Mercado Pago”',
      'Autorize no Mercado Pago e pronto: o botão “Pagar agora” aparece no seu site',
      'Na Agenda e na Loja você vê quem pagou online e quem paga no local, com o total de cada um. Precisa devolver? Toque em “Estornar”',
    ],
    ctaLabel: 'Conectar agora',
    ctaTo: '/dashboard/configuracoes#vendas',
  },
  {
    key: 'vendas-no-site-2026-11',
    badge: 'Novidade no ar',
    title: 'Venda produtos junto com o agendamento',
    description:
      'No fim do agendamento o cliente vê o “Leve junto no dia” e separa uma pomada, um óleo… pra pagar aí junto com o corte. Básico oferece 1 produto, Pro até 3. No Premium abre a loja completa no seu site.',
    steps: [
      'Cadastre o produto em “Loja”, com foto, preço e estoque',
      'Em Configurações › Vendas no site, ligue o “Leve junto” e marque os produtos',
      'Quando o cliente separar, chega notificação. Ele retirou? Toque em “Retirou”',
    ],
    ctaLabel: 'Abrir Configurações',
    ctaTo: '/dashboard/configuracoes#vendas',
  },
  {
    key: 'sugestoes-2026-11',
    badge: 'Novidade no ar',
    title: 'Fala pra gente o que falta no app',
    description:
      'Agora tem uma caixa de sugestões no painel. Você e sua equipe pedem o que querem ver no BarberOS, e a resposta aparece ali mesmo.',
    steps: [
      'Abra o menu e toque em “Sugestões”',
      'Escolha do que se trata (Agenda, Clientes, Financeiro…) e escreva a ideia do seu jeito',
      'Acompanhe na lista: “Estamos vendo”, “Vai entrar” ou “Já está no app”',
    ],
    ctaLabel: 'Mandar uma sugestão',
    ctaTo: '/dashboard/sugestoes',
  },
  {
    key: 'confirmacao-whatsapp-2026-11',
    badge: 'Novidade no ar',
    title: 'Agendou, já confirma no WhatsApp do cliente',
    description:
      'Ao marcar um horário pela Agenda, o painel monta a mensagem de confirmação com dia, horário, serviço, barbeiro e valor.',
    steps: [
      'Na Agenda, toque em “Novo agendamento” e preencha nome e telefone do cliente (com DDD)',
      'Confirme o agendamento',
      'Toque em “Mandar confirmação no WhatsApp”: a conversa abre com a mensagem pronta, é só enviar',
    ],
    ctaLabel: 'Abrir a Agenda',
    ctaTo: '/dashboard/agenda',
  },
  {
    key: 'som-moeda-agendamento-2026-11',
    badge: 'Novidade no ar',
    title: 'Plim! BarberOS virou app e avisa cada agendamento',
    description:
      'Cliente marcou pelo site: com o painel aberto toca som de moeda; com ele fechado chega notificação no celular, igual app de venda.',
    steps: [
      'Abra o menu e toque em “Instalar app no celular” (no iPhone: Compartilhar → Adicionar à Tela de Início)',
      'Toque no sino e permita as notificações — ele toca o som de teste',
      'Pronto: cada agendamento novo chega com nome, horário e valor, mesmo com o app fechado',
    ],
    ctaLabel: 'Abrir a Agenda',
    ctaTo: '/dashboard/agenda',
  },
  {
    key: 'agenda-ao-vivo-2026-09',
    badge: 'Novidade no ar',
    title: 'Agenda ao vivo em todos os celulares',
    description:
      'Quando o cliente marca pelo site da barbearia, o horário aparece na hora no painel de toda a equipe — sem recarregar a página.',
    steps: [
      'Deixe a Agenda aberta no celular',
      'Quando entrar um agendamento pelo site, aparece o aviso “Novo agendamento”',
      'O “lembrado” dos Lembretes e o “contatado” da Reativação agora valem pra equipe toda',
    ],
    ctaLabel: 'Abrir a Agenda',
    ctaTo: '/dashboard/agenda',
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
        // Junta com o cache local: se o RPC não gravou (ex.: barbeiro que não é
        // dono da conta), o que foi fechado neste aparelho não volta a abrir.
        if (data?.seen_announcements) seen = [...new Set([...seen, ...data.seen_announcements])]
      }

      if (cancelled) return
      const next = ANNOUNCEMENTS.find((a) => !seen.includes(a.key) && (ONLINE_PAYMENT_ON || a.key !== 'pagamento-online-loja-2026-11'))
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

  // Sem AnimatePresence de propósito: em conta real a animação de saída ficava
  // presa, o modal não sumia e cada clique só repetia o close antigo.
  return createPortal(
    <>
      {current && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
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
    </>,
    document.body,
  )
}

export default FeatureAnnouncementModal
