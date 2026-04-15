import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { appConfig } from '@medicpadi-backend/config';
import { AuthModule } from '../auth/auth.module';
import { ProfileModule } from '../profile/profile.module';
import KeyvRedis from '@keyv/redis';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [
    AuthModule,
    ProfileModule,
    ServicesModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `medicpadi-backend/apps/gateway/.env.${process.env.NODE_ENV || 'development'}`,
      load: [appConfig],
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return {
          stores: [
            new KeyvRedis(
              `redis://${configService.get('appConfig.redisHost')}:${configService.get('appConfig.redisPort')}`,
            ),
          ],
          ttl: configService.get<number>('appConfig.cacheTTL') || 60,
        };
      },
      inject: [ConfigService],
    }),
    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('appConfig.authServiceHost'),
            port: configService.get<number>('appConfig.authServicePort'),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'PROFILE_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('appConfig.profileServiceHost'),
            port: configService.get<number>('appConfig.profileServicePort'),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'NOTIFICATION_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('appConfig.notificationServiceHost'),
            port: configService.get<number>(
              'appConfig.notificationServicePort',
            ),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'SERVICES_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('appConfig.servicesServiceHost'),
            port: configService.get<number>('appConfig.servicesServicePort'),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'ORDER_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('appConfig.ordersServiceHost'),
            port: configService.get<number>('appConfig.ordersServicePort'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
