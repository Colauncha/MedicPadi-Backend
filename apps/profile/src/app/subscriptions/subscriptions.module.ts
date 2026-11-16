import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Subscription } from '../../entities/subscription.entity';
import { SubscriptionPlan } from '../../entities/subscription-plan.entity';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionSchedulerService } from './subscription-scheduler.service';
import { SubscriptionProcessor } from './subscription.processor';
import { SUBSCRIPTION_QUEUE } from './subscriptions.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, SubscriptionPlan]),
    BullModule.registerQueue({ name: SUBSCRIPTION_QUEUE }),
    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('appConfig.authServiceHost'),
            port: configService.get<number>('appConfig.authServicePort'),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'TRANSACTIONS_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>(
              'appConfig.transactionsServiceHost',
            ),
            port: configService.get<number>(
              'appConfig.transactionsServicePort',
            ),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'NOTIFICATION_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>(
              'appConfig.notificationServiceHost',
            ),
            port: configService.get<number>(
              'appConfig.notificationServicePort',
            ),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    SubscriptionSchedulerService,
    SubscriptionProcessor,
  ],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
