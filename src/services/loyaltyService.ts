// Loyalty Service - Ready for backend integration
// TODO: Replace mock implementations with actual API calls

import { LoyaltyProfile, LoyaltyTier, PointsTransaction, Reward, RedeemedReward } from '@/types/loyalty';
import { tierBenefits } from '@/data/rewards';

// Mock data store - will be replaced by database
let loyaltyProfiles: Record<string, LoyaltyProfile> = {};

export const loyaltyService = {
  // Get loyalty profile by user ID
  async getByUserId(userId: string): Promise<LoyaltyProfile | null> {
    // TODO: Replace with API call
    // return await api.get(`/loyalty/user/${userId}`);
    return loyaltyProfiles[userId] || null;
  },

  // Create a new loyalty profile
  async create(userId: string): Promise<LoyaltyProfile> {
    // TODO: Replace with API call
    // return await api.post('/loyalty', { userId });
    const newProfile: LoyaltyProfile = {
      userId,
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
    loyaltyProfiles[userId] = newProfile;
    return newProfile;
  },

  // Add points to user profile
  async addPoints(
    userId: string,
    points: number,
    description: string,
    relatedId?: string
  ): Promise<LoyaltyProfile | null> {
    // TODO: Replace with API call
    // return await api.post(`/loyalty/user/${userId}/points`, { points, description, relatedId });
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
      points: {
        ...profile.points,
        total: newTotal,
        available: newAvailable,
        tier: newTier,
      },
      transactions: [transaction, ...profile.transactions],
    };

    return loyaltyProfiles[userId];
  },

  // Spend points from user profile
  async spendPoints(
    userId: string,
    points: number,
    description: string,
    relatedId?: string
  ): Promise<{ success: boolean; profile: LoyaltyProfile | null }> {
    // TODO: Replace with API call
    // return await api.post(`/loyalty/user/${userId}/spend`, { points, description, relatedId });
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

  // Redeem a reward
  async redeemReward(userId: string, reward: Reward): Promise<{ success: boolean; code: string | null }> {
    // TODO: Replace with API call
    // return await api.post(`/loyalty/user/${userId}/redeem`, { rewardId: reward.id });
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

  // Calculate tier based on total points
  calculateTier(totalPoints: number): LoyaltyTier {
    if (totalPoints >= tierBenefits.platinum.minPoints) return 'platinum';
    if (totalPoints >= tierBenefits.gold.minPoints) return 'gold';
    if (totalPoints >= tierBenefits.silver.minPoints) return 'silver';
    return 'bronze';
  },

  // Get next tier info
  getNextTier(profile: LoyaltyProfile): { tier: LoyaltyTier; pointsNeeded: number } | null {
    const tiers: LoyaltyTier[] = ['bronze', 'silver', 'gold', 'platinum'];
    const currentTierIndex = tiers.indexOf(profile.points.tier);

    if (currentTierIndex === tiers.length - 1) return null;

    const nextTier = tiers[currentTierIndex + 1];
    const nextTierMinPoints = tierBenefits[nextTier].minPoints;
    const pointsNeeded = nextTierMinPoints - profile.points.total;

    return { tier: nextTier, pointsNeeded };
  },
};
