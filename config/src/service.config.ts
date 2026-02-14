import { registerAs } from '@nestjs/config';

const serviceConfig = registerAs('serviceConfig', () => ({
  serviceName: process.env['SERVICE_NAME'],
  port: parseInt(process.env['PORT'] || '3002'),

  // JWT
  jwtSecret: process.env['JWT_SECRET'] || 'default_secret',
  expiresIn: parseInt(process.env['JWT_EXPIRES_IN'] || '60'),
}));

export default serviceConfig;
