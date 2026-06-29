export const NotificationPatterns = {
  STATUS: 'notification.status',
  NOTIFICATIONS: {
    CREATE: 'notification.notifications.create',
    UPDATE: 'notification.notifications.update',
    RETRIEVE: 'notification.notifications.retrieve',
    FIND_ALL: 'notification.notifications.findAll',
    DELETE: 'notification.notifications.delete',
    MARK_READ: 'notification.notifications.markRead',
  },
};

export const NotificationEvents = {
  WELCOME: 'notification.event.welcome',
  WAITLIST: 'notification.event.waitlist',
  RESET_PASSWORD: 'notification.event.reset-password',
  APPOINTMENT_CREATED: 'notification.event.appointment.created',
  APPOINTMENT_CONFIRMED: 'notification.event.appointment.confirmed',
  APPOINTMENT_CANCELLED: 'notification.event.appointment.cancelled',
  APPOINTMENT_PAYMENT_CONFIRMED: 'notification.event.appointment.payment.confirmed',
  TEST_REQUISITION_CREATED: 'notification.event.requisition.created',
  TEST_REQUISITION_ACCEPTED: 'notification.event.requisition.accepted',
  TEST_REQUISITION_DECLINED: 'notification.event.requisition.declined',
  PAYMENT_SUCCESS: 'notification.event.payment.success',
  DRUG_REQUISITION_CREATED: 'notification.event.drug-requisition.created',
  VERIFY_EMAIL: 'notification.event.verify-email',
};