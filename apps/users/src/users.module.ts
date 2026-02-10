import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './providers/users.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import dbConfig from './config/db.config';
import appConfig from './config/app.config';
// import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `apps/users/.env.${process.env.NODE_ENV || 'development'}`,
      load: [dbConfig, appConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (dbConfig: ConfigService) => {
        return {
          type: 'postgres',
          // entities: [],
          host: dbConfig.get<string>('dbConfig.host'),
          port: dbConfig.get<number>('dbConfig.port'),
          username: dbConfig.get<string>('dbConfig.username'),
          password: dbConfig.get<string>('dbConfig.password'),
          database: dbConfig.get<string>('dbConfig.database'),
          autoLoadEntities: dbConfig.get<boolean>('dbConfig.autoLoadEntities'),
          synchronize: dbConfig.get<boolean>('dbConfig.synchronize'),
        };
      },
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
