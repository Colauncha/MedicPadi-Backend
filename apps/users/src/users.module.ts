import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './providers/users.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import dbConfig from './config/db.config';
import appConfig from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'dev'}`],
      load: [dbConfig, appConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (dbConfig: ConfigService) => ({
        type: 'postgres',
        // entities: [],
        host: dbConfig.get<string>('host'),
        port: dbConfig.get<number>('port'),
        username: dbConfig.get<string>('username'),
        password: dbConfig.get<string>('password'),
        database: dbConfig.get<string>('database'),
        autoLoadEntities: dbConfig.get<boolean>('autoLoadEntities'),
        synchronize: dbConfig.get<boolean>('synchronize'),
      }),
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
