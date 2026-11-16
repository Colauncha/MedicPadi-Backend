export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  EXPIRED = 'expired',
}

export enum SubscriptionAudience {
  PATIENT = 'patient',
  PROVIDER = 'provider',
}

export enum SubscriptionDowngradeReason {
  PAYMENT_FAILED = 'payment_failed',
  CANCELLED = 'cancelled',
}

export enum SubscriptionJobName {
  REMINDER = 'reminder',
  CHARGE = 'charge',
}
