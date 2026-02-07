import { registerAs } from '@nestjs/config';

export default registerAs('appConfig', () => ({
  name: process.env.NAME,
  port: parseInt(process.env.PORT || '3000'),
  env: process.env.NODE_ENV,
  userServicePort: parseInt(process.env.USERS_SERVICE_PORT || '3001'),
}));
