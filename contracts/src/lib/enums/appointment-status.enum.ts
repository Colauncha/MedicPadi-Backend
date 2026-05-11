export enum AppointmentStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export enum AppointmentPaymentStatus {
  P_PENDING = 'payment_pending',
  P_CONFIRMED = 'payment_confirmed',
  P_CANCELLED = 'payment_cancelled',
  P_FAILED = 'payment_failed',
  P_COMPLETED = 'payment_completed',
}