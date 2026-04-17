// Assinaturas de membros — funciona por sessão.
// Representa assinaturas de clientes da barbearia (ex: plano mensal de corte),
// não a assinatura SaaS do dono da barbearia (gerenciada pelo Stripe).

export interface Subscription {
  id: string;
  userId: string;
  plan: 'monthly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired';
  startDate: string;
  renewalDate: string;
  price: number;
}

const subscriptions: Subscription[] = [];

export const subscriptionService = {
  async getByUserId(userId: string): Promise<Subscription | null> {
    return subscriptions.find(s => s.userId === userId && s.status === 'active') || null;
  },

  async create(userId: string, plan: 'monthly' | 'yearly'): Promise<Subscription> {
    const isMonthly = plan === 'monthly';
    const price = isMonthly ? 49.9 : 479.9;
    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + (isMonthly ? 1 : 12));

    const newSubscription: Subscription = {
      id: Date.now().toString(),
      userId,
      plan,
      status: 'active',
      startDate: new Date().toISOString(),
      renewalDate: renewalDate.toISOString(),
      price,
    };

    subscriptions.push(newSubscription);
    return newSubscription;
  },

  async cancel(subscriptionId: string): Promise<Subscription | null> {
    const index = subscriptions.findIndex(s => s.id === subscriptionId);
    if (index !== -1) {
      subscriptions[index] = { ...subscriptions[index], status: 'cancelled' };
      return subscriptions[index];
    }
    return null;
  },

  getDiscountPercentage(subscription: Subscription | null): number {
    return subscription?.status === 'active' ? 15 : 0;
  },

  getDiscountedPrice(price: number, subscription: Subscription | null): number {
    const discount = this.getDiscountPercentage(subscription);
    return price * (1 - discount / 100);
  },

  shouldShowRenewalReminder(subscription: Subscription | null): { show: boolean; daysUntil: number } {
    if (!subscription || subscription.status !== 'active') {
      return { show: false, daysUntil: 0 };
    }
    const renewalDate = new Date(subscription.renewalDate);
    const now = new Date();
    const daysUntil = Math.ceil((renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return { show: daysUntil <= 7 && daysUntil > 0, daysUntil };
  },
};
