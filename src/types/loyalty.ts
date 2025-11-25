export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface LoyaltyPoints {
  total: number;
  available: number;
  spent: number;
  tier: LoyaltyTier;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  category: 'discount' | 'service' | 'product';
  value: string;
  image?: string;
  available: boolean;
}

export interface RedeemedReward {
  id: string;
  rewardId: string;
  reward: Reward;
  redeemedAt: string;
  used: boolean;
  expiresAt: string;
  code: string;
}

export interface PointsTransaction {
  id: string;
  type: 'earn' | 'spend';
  points: number;
  description: string;
  date: string;
  relatedId?: string;
}

export interface LoyaltyProfile {
  userId: string;
  points: LoyaltyPoints;
  transactions: PointsTransaction[];
  redeemedRewards: RedeemedReward[];
  joinedAt: string;
}
