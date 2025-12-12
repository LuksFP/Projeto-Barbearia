import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { LoyaltyProfile, LoyaltyTier, Reward } from '@/types/loyalty';
import { useToast } from '@/hooks/use-toast';
import { loyaltyService } from '@/services/loyaltyService';

interface LoyaltyContextType {
  loyaltyProfile: LoyaltyProfile | null;
  addPoints: (points: number, description: string, relatedId?: string) => void;
  spendPoints: (points: number, description: string, relatedId?: string) => boolean;
  redeemReward: (reward: Reward) => boolean;
  getCurrentTier: () => LoyaltyTier;
  getNextTier: () => { tier: LoyaltyTier; pointsNeeded: number } | null;
}

const LoyaltyContext = createContext<LoyaltyContextType | undefined>(undefined);

export const useLoyalty = () => {
  const context = useContext(LoyaltyContext);
  if (!context) {
    throw new Error('useLoyalty must be used within LoyaltyProvider');
  }
  return context;
};

interface LoyaltyProviderProps {
  children: ReactNode;
}

export const LoyaltyProvider = ({ children }: LoyaltyProviderProps) => {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [loyaltyProfile, setLoyaltyProfile] = useState<LoyaltyProfile | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (isAuthenticated && user) {
        try {
          let profile = await loyaltyService.getByUserId(user.id);
          if (!profile) {
            profile = await loyaltyService.create(user.id);
          }
          setLoyaltyProfile(profile);
        } catch (error) {
          console.error('Failed to load loyalty profile:', error);
        }
      } else {
        setLoyaltyProfile(null);
      }
    };
    loadProfile();
  }, [isAuthenticated, user]);

  const addPoints = async (points: number, description: string, relatedId?: string) => {
    if (!loyaltyProfile || !user) return;

    try {
      const updatedProfile = await loyaltyService.addPoints(user.id, points, description, relatedId);
      if (updatedProfile) {
        setLoyaltyProfile(updatedProfile);
        toast({
          title: `+${points} pontos! 🎉`,
          description: description,
        });
      }
    } catch (error) {
      console.error('Failed to add points:', error);
    }
  };

  const spendPoints = (points: number, description: string, relatedId?: string): boolean => {
    if (!loyaltyProfile || !user) return false;

    if (loyaltyProfile.points.available < points) {
      toast({
        title: 'Pontos insuficientes',
        description: `Você precisa de ${points} pontos, mas tem apenas ${loyaltyProfile.points.available}.`,
        variant: 'destructive',
      });
      return false;
    }

    // Async operation but we return sync for compatibility
    loyaltyService.spendPoints(user.id, points, description, relatedId).then(result => {
      if (result.success && result.profile) {
        setLoyaltyProfile(result.profile);
      }
    });

    return true;
  };

  const redeemReward = (reward: Reward): boolean => {
    if (!loyaltyProfile || !user) return false;

    if (loyaltyProfile.points.available < reward.pointsCost) {
      toast({
        title: 'Pontos insuficientes',
        description: `Você precisa de ${reward.pointsCost} pontos, mas tem apenas ${loyaltyProfile.points.available}.`,
        variant: 'destructive',
      });
      return false;
    }

    loyaltyService.redeemReward(user.id, reward).then(result => {
      if (result.success) {
        loyaltyService.getByUserId(user.id).then(profile => {
          if (profile) setLoyaltyProfile(profile);
        });
        toast({
          title: 'Recompensa resgatada! 🎁',
          description: `${reward.name} - Código: ${result.code}`,
        });
      }
    });

    return true;
  };

  const getCurrentTier = (): LoyaltyTier => {
    return loyaltyProfile?.points.tier || 'bronze';
  };

  const getNextTier = () => {
    if (!loyaltyProfile) return null;
    return loyaltyService.getNextTier(loyaltyProfile);
  };

  return (
    <LoyaltyContext.Provider
      value={{
        loyaltyProfile,
        addPoints,
        spendPoints,
        redeemReward,
        getCurrentTier,
        getNextTier,
      }}
    >
      {children}
    </LoyaltyContext.Provider>
  );
};
