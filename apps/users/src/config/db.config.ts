import { registerAs } from '@nestjs/config';

export default registerAs('dbConfig', () => ({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: process.env.DB_SYNC === 'true' || false,
  autoLoadEntities: process.env.DB_AUTOLOAD === 'true' || false,
}));
