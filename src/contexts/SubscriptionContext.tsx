import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';
import { useToast } from '@/hooks/use-toast';
import { subscriptionService, Subscription } from '@/services/subscriptionService';

export type { Subscription } from '@/services/subscriptionService';

interface SubscriptionContextType {
  subscription: Subscription | null;
  isSubscribed: boolean;
  discountPercentage: number;
  subscribe: (plan: 'monthly' | 'yearly') => Promise<void>;
  cancelSubscription: () => Promise<void>;
  getDiscountedPrice: (price: number) => number;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
};

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider = ({ children }: SubscriptionProviderProps) => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [reminderShown, setReminderShown] = useState<Record<string, boolean>>({});

  const isSubscribed = subscription?.status === 'active';
  const discountPercentage = subscriptionService.getDiscountPercentage(subscription);

  // Check for renewal reminder
  useEffect(() => {
    if (subscription && isSubscribed) {
      const reminder = subscriptionService.shouldShowRenewalReminder(subscription);
      const reminderKey = `${subscription.id}_${reminder.daysUntil}`;
      
      if (reminder.show && !reminderShown[reminderKey]) {
        addNotification({
          type: 'info',
          title: 'Renovação próxima',
          message: `Sua assinatura será renovada em ${reminder.daysUntil} dia${reminder.daysUntil > 1 ? 's' : ''}. Valor: R$ ${subscription.price.toFixed(2).replace('.', ',')}`,
        });
        setReminderShown(prev => ({ ...prev, [reminderKey]: true }));
      }
    }
  }, [subscription, isSubscribed, reminderShown, addNotification]);

  // Load subscription on user change
  useEffect(() => {
    const loadSubscription = async () => {
      if (user) {
        try {
          const userSubscription = await subscriptionService.getByUserId(user.id);
          setSubscription(userSubscription);

          // Auto-create subscription for users with 'subscription' role
          if (!userSubscription && user.role === 'subscription') {
            const newSubscription = await subscriptionService.create(user.id, 'monthly');
            setSubscription(newSubscription);
          }
        } catch (error) {
          console.error('Failed to load subscription:', error);
        }
      } else {
        setSubscription(null);
      }
    };
    loadSubscription();
  }, [user]);

  const subscribe = async (plan: 'monthly' | 'yearly') => {
    if (!user) return;

    try {
      const newSubscription = await subscriptionService.create(user.id, plan);
      setSubscription(newSubscription);

      toast({
        title: 'Assinatura ativada! 🎉',
        description: `Você agora é um cliente VIP com ${discountPercentage}% de desconto!`,
      });
    } catch (error) {
      console.error('Failed to subscribe:', error);
      toast({
        title: 'Erro ao assinar',
        description: 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
    }
  };

  const cancelSubscription = async () => {
    if (!subscription) return;

    try {
      const cancelled = await subscriptionService.cancel(subscription.id);
      if (cancelled) {
        setSubscription(cancelled);
        toast({
          title: 'Assinatura cancelada',
          description: 'Sua assinatura foi cancelada com sucesso.',
        });
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      toast({
        title: 'Erro ao cancelar',
        description: 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
    }
  };

  const getDiscountedPrice = (price: number) => {
    return subscriptionService.getDiscountedPrice(price, subscription);
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        isSubscribed,
        discountPercentage,
        subscribe,
        cancelSubscription,
        getDiscountedPrice,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};
