import { registerAs } from '@nestjs/config';

export default registerAs('appConfig', () => ({
  serviceName: process.env.SERVICE_NAME,
  port: parseInt(process.env.PORT || '3001'),
}));
