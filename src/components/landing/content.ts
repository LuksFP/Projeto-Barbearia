// Conteúdo da landing — o dia de uma barbearia, das 07:58 às 23:47.
// Regra: só entra aqui o que existe no produto. Nada de número ou depoimento inventado.

export interface Marco {
  id: string
  hora: string
  rotulo: string
  /** Marcos depois da meia-noite contam no dia seguinte, pro relógio não voltar no tempo. */
  diaSeguinte?: boolean
}

export const MARCOS: Marco[] = [
  { id: 'abertura', hora: '07:58', rotulo: 'antes de abrir' },
  { id: 'link', hora: '09:12', rotulo: 'o link trabalhando' },
  { id: 'equipe', hora: '10:30', rotulo: 'casa cheia' },
  { id: 'lembrete', hora: '14:05', rotulo: 'depois do almoço' },
  { id: 'clube', hora: '17:40', rotulo: 'fim de tarde' },
  { id: 'caixa', hora: '20:10', rotulo: 'fechando o caixa' },
  { id: 'noite', hora: '23:47', rotulo: 'porta fechada' },
  { id: 'amanha', hora: '07:58', rotulo: 'amanhã cedo', diaSeguinte: true },
]

export const paraMinutos = (hora: string, diaSeguinte = false): number => {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m + (diaSeguinte ? 1440 : 0)
}

export const minutosDe = (id: string): number => {
  const marco = MARCOS.find((item) => item.id === id)
  return marco ? paraMinutos(marco.hora, marco.diaSeguinte) : 0
}

export const formatarHora = (minutos: number): string => {
  const total = ((Math.round(minutos) % 1440) + 1440) % 1440
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export const rotuloDe = (minutos: number): string => {
  let atual = MARCOS[0]
  for (const marco of MARCOS) {
    if (paraMinutos(marco.hora, marco.diaSeguinte) <= minutos + 1) atual = marco
  }
  return atual.rotulo
}

/** O que a régua do topo mostra: os capítulos do dia, sem a abertura e sem o "amanhã". */
export const REGUA = MARCOS.filter((marco) => marco.id !== 'abertura' && !marco.diaSeguinte)

export const REGUA_TITULOS: Record<string, string> = {
  link: 'Agendamento pelo link',
  equipe: 'Agenda da equipe',
  lembrete: 'Lembrete no WhatsApp',
  clube: 'Clube e mensalidades',
  caixa: 'Financeiro e comissão',
  noite: 'Aberto 24 horas',
}

export interface Pergunta {
  pergunta: string
  resposta: string
}

export const PERGUNTAS: Pergunta[] = [
  {
    pergunta: 'Dá pra testar antes de pagar?',
    resposta:
      'Dá. São 2 dias grátis com acesso ao painel, sem cadastrar cartão. E a demonstração abre agora mesmo, sem criar conta.',
  },
  {
    pergunta: 'O cliente paga pelo site?',
    resposta:
      'Não. O agendamento é uma reserva gratuita e o pagamento acontece na barbearia, como sempre. A única cobrança do BarberOS é a sua assinatura.',
  },
  {
    pergunta: 'O lembrete de WhatsApp é um robô?',
    resposta:
      'Não. O painel monta a lista do dia e escreve a mensagem; você toca em Lembrar e envia do seu próprio WhatsApp.',
  },
  {
    pergunta: 'Preciso contratar um site por fora?',
    resposta:
      'Não. No Pro e no Premium a página da barbearia já vem junto, com serviços, equipe e agendamento no mesmo endereço.',
  },
  {
    pergunta: 'Tem fidelidade?',
    resposta: 'Não. A assinatura é mensal e o cancelamento é feito por você, dentro do painel.',
  },
]
