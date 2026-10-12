import * as dotenv from 'dotenv';
import { join, resolve } from 'path';
import { DataSource } from 'typeorm';
import { migrations } from './src/database/migrations';

dotenv.config({
  path: resolve(__dirname, `.env.${process.env.NODE_ENV ?? 'development'}`),
});

// Used by the TypeORM CLI (nx run notification:migration:*). Variables already set in the
// environment win over the .env file, so DB_* can be overridden per command.
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [join(__dirname, 'src/app/**/entities/*.entity.ts')],
  migrations,
  synchronize: false,
});
