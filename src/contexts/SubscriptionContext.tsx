import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Subscription {
  id: string;
  userId: string;
  plan: 'monthly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired';
  startDate: string;
  renewalDate: string;
  price: number;
}

interface SubscriptionContextType {
  subscription: Subscription | null;
  isSubscribed: boolean;
  discountPercentage: number;
  subscribe: (plan: 'monthly' | 'yearly') => void;
  cancelSubscription: () => void;
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
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const isSubscribed = user?.role === 'subscription' && subscription?.status === 'active';
  const discountPercentage = isSubscribed ? 15 : 0;

  useEffect(() => {
    if (user) {
      const subscriptions = JSON.parse(localStorage.getItem('subscriptions') || '[]');
      const userSub = subscriptions.find((s: Subscription) => s.userId === user.id && s.status === 'active');
      setSubscription(userSub || null);
      
      // Auto-create subscription for subscription role users without one
      if (user.role === 'subscription' && !userSub) {
        const newSub: Subscription = {
          id: Date.now().toString(),
          userId: user.id,
          plan: 'monthly',
          status: 'active',
          startDate: new Date().toISOString(),
          renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          price: 49.90,
        };
        subscriptions.push(newSub);
        localStorage.setItem('subscriptions', JSON.stringify(subscriptions));
        setSubscription(newSub);
      }
    } else {
      setSubscription(null);
    }
  }, [user]);

  const subscribe = (plan: 'monthly' | 'yearly') => {
    if (!user) return;

    const price = plan === 'monthly' ? 49.90 : 479.90;
    const renewalDays = plan === 'monthly' ? 30 : 365;

    const newSub: Subscription = {
      id: Date.now().toString(),
      userId: user.id,
      plan,
      status: 'active',
      startDate: new Date().toISOString(),
      renewalDate: new Date(Date.now() + renewalDays * 24 * 60 * 60 * 1000).toISOString(),
      price,
    };

    const subscriptions = JSON.parse(localStorage.getItem('subscriptions') || '[]');
    subscriptions.push(newSub);
    localStorage.setItem('subscriptions', JSON.stringify(subscriptions));
    setSubscription(newSub);

    // Update user role
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const updatedUsers = users.map((u: any) => 
      u.id === user.id ? { ...u, role: 'subscription' } : u
    );
    localStorage.setItem('users', JSON.stringify(updatedUsers));

    toast({
      title: 'Assinatura ativada!',
      description: `Você agora é um cliente VIP com ${discountPercentage}% de desconto!`,
    });
  };

  const cancelSubscription = () => {
    if (!subscription) return;

    const subscriptions = JSON.parse(localStorage.getItem('subscriptions') || '[]');
    const updatedSubs = subscriptions.map((s: Subscription) =>
      s.id === subscription.id ? { ...s, status: 'cancelled' } : s
    );
    localStorage.setItem('subscriptions', JSON.stringify(updatedSubs));
    setSubscription({ ...subscription, status: 'cancelled' });

    toast({
      title: 'Assinatura cancelada',
      description: 'Sua assinatura foi cancelada. Os benefícios continuam até a data de renovação.',
    });
  };

  const getDiscountedPrice = (price: number) => {
    if (!isSubscribed) return price;
    return price * (1 - discountPercentage / 100);
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
