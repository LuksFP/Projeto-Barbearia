// Tipos da conta SaaS (dono da barbearia que paga para usar a plataforma)
// Separado do auth de clientes da barbearia (AuthContext)

export type SaasPlan = 'basic' | 'pro' | 'premium'

/** Nome do plano como aparece na tela. */
export const PLAN_NAME: Record<SaasPlan, string> = { basic: 'Básico', pro: 'Pro', premium: 'Premium' }
export type SaasPlanStatus = 'pending' | 'active' | 'trial' | 'past_due' | 'cancelling' | 'cancelled'

export interface SaasAccount {
  id: string
  userId: string
  ownerName: string
  email: string
  barbershopName: string
  barbershopSlug: string
  barbershopId: string | null
  plan: SaasPlan | null
  planStatus: SaasPlanStatus | null
  planStartedAt: string | null
  trialEndsAt: string | null
  cancelAt: string | null
  pastDueSince: string | null
  createdAt: string
}

export interface SaasSignupInput {
  ownerName: string
  email: string
  password: string
  barbershopName: string
  plan: SaasPlan
}

export interface SaasLoginInput {
  email: string
  password: string
}

export interface SaasPaymentCardInput {
  number: string
  name: string
  expiry: string
  cvv: string
}

export interface SaasPlanActivationInput {
  plan: SaasPlan
  paymentCard?: SaasPaymentCardInput
}

export interface SaasSession {
  account: SaasAccount
  accessToken: string | null
}

export interface SaasPlanConfig {
  id: SaasPlan
  name: string
  price: number
  period: 'mês'
  highlight?: string
  description: string
  features: string[]
  cta: string
}

export const SAAS_PLANS: SaasPlanConfig[] = [
  {
    id: 'basic',
    name: 'Básico',
    price: 19.90,
    period: 'mês',
    description: 'O essencial: agenda e agendamento online funcionando hoje, sem complicação.',
    features: [
      'Agenda completa, ao vivo em todos os celulares da equipe',
      'Agendamento online pelo site BarberOS (barberos.io/b/slug)',
      '1 produto à sua escolha oferecido no fim do agendamento',
      'Até 2 barbeiros',
      'Ficha de cliente com histórico e observações',
      'Confirmação e lembrete prontos no WhatsApp',
      'Reativação de clientes sumidos',
      'Financeiro com receita por mês, serviço e barbeiro',
      'Suporte por email',
    ],
    cta: 'Começar com Básico',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 59.90,
    period: 'mês',
    highlight: 'Mais popular',
    description: 'Equipe sem limite e até 3 produtos oferecidos no agendamento.',
    features: [
      'Tudo do Básico',
      'Barbeiros ilimitados',
      'Até 3 produtos oferecidos no fim do agendamento',
      'Aviso de novo agendamento com som e notificação no celular',
      'Clube VIP com controle de mensalidade e cobrança por PIX',
      'Comissão por barbeiro e exportação em CSV',
    ],
    cta: 'Começar com Pro',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 79.90,
    period: 'mês',
    description: 'Loja completa no site + site com a sua cara + domínio próprio.',
    features: [
      'Tudo do Pro',
      'Loja completa no site: produtos sem limite, sacola e reserva sem horário',
      'Site personalizado (design exclusivo)',
      'Domínio próprio incluso',
      'SEO local configurado',
      'Onboarding dedicado',
      'Gerente de conta',
    ],
    cta: 'Quero o Premium',
  },
]
