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
  ehrServiceName: process.env['EHR_SERVICE_NAME'],
  transactionsServiceName: process.env['TRANSACTIONS_SERVICE_NAME'],

  // Service ports
  authServicePort: parseInt(process.env['AUTH_SERVICE_PORT'] || '3001'),
  profileServicePort: parseInt(process.env['PROFILE_SERVICE_PORT'] || '3002'),
  notificationServicePort: parseInt(
    process.env['NOTIFICATION_SERVICE_PORT'] || '3003',
  ),
  servicesServicePort: parseInt(process.env['SERVICES_SERVICE_PORT'] || '3004'),
  ordersServicePort: parseInt(process.env['ORDERS_SERVICE_PORT'] || '3005'),
  ehrServicePort: parseInt(process.env['EHR_SERVICE_PORT'] || '3006'),
  transactionsServicePort: parseInt(
    process.env['TRANSACTIONS_SERVICE_PORT'] || '3008',
  ),

  // Service hosts
  authServiceHost: process.env['AUTH_SERVICE_HOST'],
  profileServiceHost: process.env['PROFILE_SERVICE_HOST'],
  notificationServiceHost: process.env['NOTIFICATION_SERVICE_HOST'],
  servicesServiceHost: process.env['SERVICES_SERVICE_HOST'],
  ordersServiceHost: process.env['ORDERS_SERVICE_HOST'],
  ehrServiceHost: process.env['EHR_SERVICE_HOST'],
  transactionsServiceHost: process.env['TRANSACTIONS_SERVICE_HOST'],

  // Internal service-to-service auth token
  internalServiceToken: process.env['INTERNAL_SERVICE_TOKEN'],

  // Waitlist
  waitlist: process.env['WAITLIST_ACTIVE'],

  // Caching and Redis
  redisHost: process.env['REDIS_HOST'],
  redisPort: parseInt(process.env['REDIS_PORT'] || '6379'),
  ttl: parseInt(process.env['TTL'] || '3600'),

  // routes
  frontendUrl: process.env['FRONTEND_URL'] || 'https://medicpadi.com',
  gatewayUrl: process.env['GATEWAY_URL'] || 'http://localhost:3000',
}));

export default appConfig;
