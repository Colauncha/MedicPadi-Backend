import { registerAs } from '@nestjs/config';

const serviceConfig = registerAs('serviceConfig', () => ({
  serviceName: process.env['SERVICE_NAME'],
  port: parseInt(process.env['PORT'] || '3002'),

  // JWT
  jwtSecret: process.env['JWT_SECRET'] || 'default_secret',
  expiresIn: parseInt(process.env['JWT_EXPIRES_IN'] || '60'),

  // Service hosts
  authServiceHost: process.env['AUTH_SERVICE_HOST'],
  profileServiceHost: process.env['PROFILE_SERVICE_HOST'],
}));

export default serviceConfig;
