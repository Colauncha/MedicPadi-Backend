export enum NotificationType {
  APPOINTMENT = 'appointment',
  REQUISITION = 'requisition',
  PRESCRIPTION = 'prescription',
  PAYMENT = 'payment',
  SYSTEM = 'system',
  OTHER = 'other',
}

export enum NotificationChannel {
  PUSH = 'push',
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in_app',
}

export enum PushPlatform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}
