import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { LoyaltyProfile, LoyaltyTier, PointsTransaction, Reward, RedeemedReward } from '@/types/loyalty';
import { tierBenefits } from '@/data/rewards';
import { useToast } from '@/hooks/use-toast';

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
    if (isAuthenticated && user) {
      const storedProfiles = JSON.parse(localStorage.getItem('loyaltyProfiles') || '{}');
      
      if (storedProfiles[user.id]) {
        setLoyaltyProfile(storedProfiles[user.id]);
      } else {
        const newProfile: LoyaltyProfile = {
          userId: user.id,
          points: {
            total: 0,
            available: 0,
            spent: 0,
            tier: 'bronze',
          },
          transactions: [],
          redeemedRewards: [],
          joinedAt: new Date().toISOString(),
        };
        storedProfiles[user.id] = newProfile;
        localStorage.setItem('loyaltyProfiles', JSON.stringify(storedProfiles));
        setLoyaltyProfile(newProfile);
      }
    } else {
      setLoyaltyProfile(null);
    }
  }, [isAuthenticated, user]);

  const calculateTier = (totalPoints: number): LoyaltyTier => {
    if (totalPoints >= tierBenefits.platinum.minPoints) return 'platinum';
    if (totalPoints >= tierBenefits.gold.minPoints) return 'gold';
    if (totalPoints >= tierBenefits.silver.minPoints) return 'silver';
    return 'bronze';
  };

  const updateProfile = (updatedProfile: LoyaltyProfile) => {
    const storedProfiles = JSON.parse(localStorage.getItem('loyaltyProfiles') || '{}');
    storedProfiles[updatedProfile.userId] = updatedProfile;
    localStorage.setItem('loyaltyProfiles', JSON.stringify(storedProfiles));
    setLoyaltyProfile(updatedProfile);
  };

  const addPoints = (points: number, description: string, relatedId?: string) => {
    if (!loyaltyProfile || !user) return;

    const transaction: PointsTransaction = {
      id: Date.now().toString(),
      type: 'earn',
      points,
      description,
      date: new Date().toISOString(),
      relatedId,
    };

    const newTotal = loyaltyProfile.points.total + points;
    const newAvailable = loyaltyProfile.points.available + points;
    const newTier = calculateTier(newTotal);

    const updatedProfile: LoyaltyProfile = {
      ...loyaltyProfile,
      points: {
        ...loyaltyProfile.points,
        total: newTotal,
        available: newAvailable,
        tier: newTier,
      },
      transactions: [transaction, ...loyaltyProfile.transactions],
    };

    updateProfile(updatedProfile);

    toast({
      title: `+${points} pontos! 🎉`,
      description: description,
    });
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

    const transaction: PointsTransaction = {
      id: Date.now().toString(),
      type: 'spend',
      points,
      description,
      date: new Date().toISOString(),
      relatedId,
    };

    const updatedProfile: LoyaltyProfile = {
      ...loyaltyProfile,
      points: {
        ...loyaltyProfile.points,
        available: loyaltyProfile.points.available - points,
        spent: loyaltyProfile.points.spent + points,
      },
      transactions: [transaction, ...loyaltyProfile.transactions],
    };

    updateProfile(updatedProfile);
    return true;
  };

  const redeemReward = (reward: Reward): boolean => {
    if (!spendPoints(reward.pointsCost, `Resgate: ${reward.name}`, reward.id)) {
      return false;
    }

    if (!loyaltyProfile) return false;

    const redeemedReward: RedeemedReward = {
      id: Date.now().toString(),
      rewardId: reward.id,
      reward,
      redeemedAt: new Date().toISOString(),
      used: false,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 dias
      code: `REWARD${Date.now().toString().slice(-6)}`,
    };

    const updatedProfile: LoyaltyProfile = {
      ...loyaltyProfile,
      redeemedRewards: [redeemedReward, ...loyaltyProfile.redeemedRewards],
    };

    updateProfile(updatedProfile);

    toast({
      title: 'Recompensa resgatada! 🎁',
      description: `${reward.name} - Código: ${redeemedReward.code}`,
    });

    return true;
  };

  const getCurrentTier = (): LoyaltyTier => {
    return loyaltyProfile?.points.tier || 'bronze';
  };

  const getNextTier = () => {
    if (!loyaltyProfile) return null;

    const currentPoints = loyaltyProfile.points.total;
    const tiers: LoyaltyTier[] = ['bronze', 'silver', 'gold', 'platinum'];
    const currentTierIndex = tiers.indexOf(loyaltyProfile.points.tier);

    if (currentTierIndex === tiers.length - 1) return null;

    const nextTier = tiers[currentTierIndex + 1];
    const nextTierMinPoints = tierBenefits[nextTier].minPoints;
    const pointsNeeded = nextTierMinPoints - currentPoints;

    return { tier: nextTier, pointsNeeded };
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
