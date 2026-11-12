import { SetMetadata } from '@nestjs/common';
import { SubscriptionLevel } from '@medicpadi-backend/contracts';

export const REQUIRES_PLAN_KEY = 'requiresPlan';

/** Ordered from lowest to highest tier. */
export const SUBSCRIPTION_RANK: Record<SubscriptionLevel, number> = {
  [SubscriptionLevel.FREE]: 0,
  [SubscriptionLevel.BASIC]: 1,
  [SubscriptionLevel.PREMIUM]: 2,
  [SubscriptionLevel.PROFESSIONAL]: 3,
};

/**
 * Minimum subscription tier required for a route (enforced by SubscriptionGuard).
 * Higher tiers are always allowed.
 */
export const RequiresPlan = (level: SubscriptionLevel) =>
  SetMetadata(REQUIRES_PLAN_KEY, level);
