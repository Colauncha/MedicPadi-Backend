import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NotificationModule } from './notification/notification.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { appConfig, serviceConfig, dbConfig, smtpConfig } from '@medicpadi-backend/config';
import { BullModule } from '@nestjs/bullmq';
import { EmailModule } from './email/email.module';
import { DispatchModule } from './dispatch/dispatch.module';
import { Notification } from './notification/entities/notification.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `medicpadi-backend/apps/notification/.env.${process.env.NODE_ENV || 'development'}`,
      load: [appConfig, serviceConfig, dbConfig, smtpConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        entities: [Notification],
        migrations: [__dirname + '/database/migrations/*.ts'],
        host: configService.get<string>('dbConfig.host'),
        port: configService.get<number>('dbConfig.port'),
        username: configService.get<string>('dbConfig.username'),
        password: configService.get<string>('dbConfig.password'),
        database: configService.get<string>('dbConfig.database'),
        synchronize: configService.get<boolean>('dbConfig.synchronize'),
        migrationsRun: configService.get<boolean>('dbConfig.migrationsRun'),
        autoLoadEntities: configService.get<boolean>('dbConfig.autoLoadEntities'),
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('appConfig.redisHost') ?? 'localhost',
          port: configService.get<number>('appConfig.redisPort') ?? 6379,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      }),
    }),
    NotificationModule,
    EmailModule,
    DispatchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
