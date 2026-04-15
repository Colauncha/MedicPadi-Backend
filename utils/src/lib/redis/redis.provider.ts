import { Provider } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: () => {
    const redisHost = process.env['REDIS_HOST'];
    const redisPort = process.env['REDIS_PORT'];
    if (!redisHost || !redisPort) {
      throw new Error(
        'Redis host and port must be defined in environment variables',
      );
    }
    return new Redis({
      host: redisHost,
      port: parseInt(redisPort, 10),
    });
  },
};
