import { registerAs } from '@nestjs/config';

const toBoolean = (value: string | undefined): boolean => {
  if (value === undefined) return false;
  return value.toLowerCase() === 'true';
};

const dbConfig = registerAs('dbConfig', () => ({
  type: process.env['DB_TYPE'] || 'postgres',
  host: process.env['DB_HOST'],
  port: parseInt(process.env['DB_PORT'] || '5432'),
  username: process.env['DB_USERNAME'],
  password: process.env['DB_PASSWORD'],
  database: process.env['DB_NAME'],
  synchronize: toBoolean(process.env['DB_SYNC']),
  autoLoadEntities: toBoolean(process.env['DB_AUTOLOAD']),
}));

export default dbConfig;
