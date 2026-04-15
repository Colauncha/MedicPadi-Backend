import { registerAs } from '@nestjs/config';

const appConfig = registerAs('appConfig', () => ({
  name: process.env['NAME'],
  serviceName: process.env['SERVICE_NAME'],
  port: parseInt(process.env['PORT'] || '3000'),

  // Service names
  authServiceName: process.env['AUTH_SERVICE_NAME'],
  profileServiceName: process.env['PROFILE_SERVICE_NAME'],
  notificationServiceName: process.env['NOTIFICATION_SERVICE_NAME'],
  servicesServiceName: process.env['SERVICES_SERVICE_NAME'],
  ordersServiceName: process.env['ORDERS_SERVICE_NAME'],

  // Service ports
  authServicePort: parseInt(process.env['AUTH_SERVICE_PORT'] || '3001'),
  profileServicePort: parseInt(process.env['PROFILE_SERVICE_PORT'] || '3002'),
  notificationServicePort: parseInt(
    process.env['NOTIFICATION_SERVICE_PORT'] || '3003',
  ),
  servicesServicePort: parseInt(process.env['SERVICES_SERVICE_PORT'] || '3004'),
  ordersServicePort: parseInt(process.env['ORDERS_SERVICE_PORT'] || '3005'),

  // Service hosts
  authServiceHost: process.env['AUTH_SERVICE_HOST'],
  profileServiceHost: process.env['PROFILE_SERVICE_HOST'],
  notificationServiceHost: process.env['NOTIFICATION_SERVICE_HOST'],
  servicesServiceHost: process.env['SERVICES_SERVICE_HOST'],
  ordersServiceHost: process.env['ORDERS_SERVICE_HOST'],

  // Waitlist
  waitlist: process.env['WAITLIST_ACTIVE'],

  // Caching and Redis
  redisHost: process.env['REDIS_HOST'],
  redisPort: parseInt(process.env['REDIS_PORT'] || '6379'),
  ttl: parseInt(process.env['TTL'] || '3600'),
}));

export default appConfig;
