import { registerAs } from '@nestjs/config';

const appConfig = registerAs('appConfig', () => ({
  name: process.env['NAME'],
  serviceName: process.env['SERVICE_NAME'],
  port: parseInt(process.env['PORT'] || '3000'),

  // Service names
  authServiceName: process.env['AUTH_SERVICE_NAME'],
  profileServiceName: process.env['PROFILE_SERVICE_NAME'],
  notificationServiceName: process.env['NOTIFICATION_SERVICE_NAME'],

  // Service ports
  authServicePort: parseInt(process.env['AUTH_SERVICE_PORT'] || '3001'),
  profileServicePort: parseInt(process.env['PROFILE_SERVICE_PORT'] || '3002'),
  notificationServicePort: parseInt(
    process.env['NOTIFICATION_SERVICE_PORT'] || '3003',
  ),

  // Service hosts
  authServiceHost: process.env['AUTH_SERVICE_HOST'],
  profileServiceHost: process.env['PROFILE_SERVICE_HOST'],
  notificationServiceHost: process.env['NOTIFICATION_SERVICE_HOST'],

  // Waitlist
  waitlist: process.env['WAITLIST_ACTIVE'],
}));

export default appConfig;
