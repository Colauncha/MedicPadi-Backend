export const SUBSCRIPTION_QUEUE = 'subscription';

export const SubscriptionJobNames = {
  RENEWAL_REMINDER: 'subscription.renewal-reminder',
  MONTHLY_CHARGE: 'subscription.monthly-charge',
} as const;

export const SubscriptionSchedulerIds = {
  RENEWAL_REMINDER: 'subscription-renewal-reminder',
  MONTHLY_CHARGE: 'subscription-monthly-charge',
} as const;

/** Days before `current_period_end` the renewal reminder goes out. */
export const REMINDER_DAYS = 7;
export const DEFAULT_GRACE_DAYS = 3;
export const MAX_FAILED_ATTEMPTS = 3;
export const CHARGE_BATCH_SIZE = 100;
