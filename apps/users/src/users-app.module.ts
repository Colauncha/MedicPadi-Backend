import { Module } from '@nestjs/common';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import dbConfig from './config/db.config';
import appConfig from './config/app.config';
import { User } from './users/entities/user.entity';
import { UsersModule } from './users/users.module';

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
          entities: [User],
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
    TypeOrmModule.forFeature([User]),
    UsersModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersAppModule {}
