import * as dotenv from 'dotenv';
import { dirname, join, resolve } from 'path';
import { DataSource } from 'typeorm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({
  path: resolve(__dirname, `.env.${process.env.NODE_ENV ?? 'development'}`),
});

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [join(__dirname, 'src/app/auth/entities/*.entity.ts')],
  migrations: [join(__dirname, 'src/database/migrations/*.ts')],
  synchronize: false,
});
