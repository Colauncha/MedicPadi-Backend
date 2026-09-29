export const NOTIFICATION_QUEUE = 'notification';

export const NotificationJobNames = {
  WELCOME: 'welcome',
  WAITLIST: 'waitlist',
  RESET_PASSWORD: 'reset-password',
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_CONFIRMED: 'appointment.confirmed',
  APPOINTMENT_CANCELLED: 'appointment.cancelled',
  APPOINTMENT_PAYMENT_CONFIRMED: 'appointment.payment-confirmed',
  TEST_REQUISITION_CREATED: 'requisition.created',
  TEST_REQUISITION_ACCEPTED: 'requisition.accepted',
  TEST_REQUISITION_DECLINED: 'requisition.declined',
  PAYMENT_SUCCESS: 'payment.success',
  DRUG_REQUISITION_CREATED: 'drug-requisition.created',
  VERIFY_EMAIL: 'verify-email',
  EHR_ACCESS_REQUESTED: 'ehr.access-requested',
  PUSH_RECEIPTS: 'push.receipts',
} as const;
