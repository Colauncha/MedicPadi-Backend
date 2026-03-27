import * as dotenv from 'dotenv';
import { dirname, resolve } from 'path/posix';
import { DataSource } from 'typeorm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({
  path: resolve(__dirname, './.env.development'),
});

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  entities: ['src/entities/*.entity.ts'],

  migrations: ['src/migrations/*.ts'],

  synchronize: false,
});
