// Tipos da conta SaaS (dono da barbearia que paga para usar a plataforma)
// Separado do auth de clientes da barbearia (AuthContext)

export type SaasPlan = 'basic' | 'pro' | 'premium'
export type SaasPlanStatus = 'pending' | 'active' | 'trial' | 'past_due' | 'cancelled'

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
    description: 'Só o essencial: sua agenda online funcionando hoje, sem complicação.',
    features: [
      'Agenda online completa',
      'Até 2 barbeiros',
      'Gestão de clientes',
      'Confirmação por WhatsApp',
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
    description: 'Agenda + presença online pronta: site no ar em minutos no domínio BarberOS.',
    features: [
      'Tudo do Básico',
      'Barbeiros ilimitados',
      'Site genérico BarberOS (barberos.io/b/slug)',
      'Hero, serviços e equipe personalizáveis',
      'Clube VIP e assinaturas',
      'Relatórios de desempenho',
      'Suporte prioritário',
    ],
    cta: 'Começar com Pro',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 79.90,
    period: 'mês',
    description: 'Agenda + site com a sua cara + domínio próprio. Identidade completa.',
    features: [
      'Tudo do Pro',
      'Site personalizado (design exclusivo)',
      'Domínio próprio incluso',
      'SEO local configurado',
      'Onboarding dedicado',
      'Gerente de conta',
    ],
    cta: 'Quero o Premium',
  },
]
