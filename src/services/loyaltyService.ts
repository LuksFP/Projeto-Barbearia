// Fidelidade — funciona por sessão (dados não persistem entre recarregamentos).

import type { LoyaltyProfile, LoyaltyTier, PointsTransaction, Reward, RedeemedReward } from '@/types/loyalty';
import { tierBenefits } from '@/data/rewards';

const loyaltyProfiles: Record<string, LoyaltyProfile> = {};

export const loyaltyService = {
  async getByUserId(userId: string): Promise<LoyaltyProfile | null> {
    return loyaltyProfiles[userId] || null;
  },

  async create(userId: string): Promise<LoyaltyProfile> {
    const newProfile: LoyaltyProfile = {
      userId,
      points: { total: 0, available: 0, spent: 0, tier: 'bronze' },
      transactions: [],
      redeemedRewards: [],
      joinedAt: new Date().toISOString(),
    };
    loyaltyProfiles[userId] = newProfile;
    return newProfile;
  },

  async addPoints(userId: string, points: number, description: string, relatedId?: string): Promise<LoyaltyProfile | null> {
    const profile = loyaltyProfiles[userId];
    if (!profile) return null;

    const transaction: PointsTransaction = {
      id: Date.now().toString(),
      type: 'earn',
      points,
      description,
      date: new Date().toISOString(),
      relatedId,
    };

    const newTotal = profile.points.total + points;
    const newAvailable = profile.points.available + points;
    const newTier = this.calculateTier(newTotal);

    loyaltyProfiles[userId] = {
      ...profile,
      points: { ...profile.points, total: newTotal, available: newAvailable, tier: newTier },
      transactions: [transaction, ...profile.transactions],
    };

    return loyaltyProfiles[userId];
  },

  async spendPoints(userId: string, points: number, description: string, relatedId?: string): Promise<{ success: boolean; profile: LoyaltyProfile | null }> {
    const profile = loyaltyProfiles[userId];
    if (!profile || profile.points.available < points) {
      return { success: false, profile: null };
    }

    const transaction: PointsTransaction = {
      id: Date.now().toString(),
      type: 'spend',
      points,
      description,
      date: new Date().toISOString(),
      relatedId,
    };

    loyaltyProfiles[userId] = {
      ...profile,
      points: {
        ...profile.points,
        available: profile.points.available - points,
        spent: profile.points.spent + points,
      },
      transactions: [transaction, ...profile.transactions],
    };

    return { success: true, profile: loyaltyProfiles[userId] };
  },

  async redeemReward(userId: string, reward: Reward): Promise<{ success: boolean; code: string | null }> {
    const result = await this.spendPoints(userId, reward.pointsCost, `Resgate: ${reward.name}`, reward.id);
    if (!result.success) return { success: false, code: null };

    const redeemedReward: RedeemedReward = {
      id: Date.now().toString(),
      rewardId: reward.id,
      reward,
      redeemedAt: new Date().toISOString(),
      used: false,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      code: `REWARD${Date.now().toString().slice(-6)}`,
    };

    loyaltyProfiles[userId] = {
      ...loyaltyProfiles[userId],
      redeemedRewards: [redeemedReward, ...loyaltyProfiles[userId].redeemedRewards],
    };

    return { success: true, code: redeemedReward.code };
  },

  calculateTier(totalPoints: number): LoyaltyTier {
    if (totalPoints >= tierBenefits.platinum.minPoints) return 'platinum';
    if (totalPoints >= tierBenefits.gold.minPoints) return 'gold';
    if (totalPoints >= tierBenefits.silver.minPoints) return 'silver';
    return 'bronze';
  },

  getNextTier(profile: LoyaltyProfile): { tier: LoyaltyTier; pointsNeeded: number } | null {
    const tiers: LoyaltyTier[] = ['bronze', 'silver', 'gold', 'platinum'];
    const currentTierIndex = tiers.indexOf(profile.points.tier);
    if (currentTierIndex === tiers.length - 1) return null;
    const nextTier = tiers[currentTierIndex + 1];
    const nextTierMinPoints = tierBenefits[nextTier].minPoints;
    return { tier: nextTier, pointsNeeded: nextTierMinPoints - profile.points.total };
  },
};
