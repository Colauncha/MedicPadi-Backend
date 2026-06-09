import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { DispatchController } from './dispatch.controller';
import { DispatchProcessor, NOTIFICATION_QUEUE } from './dispatch.processor';
import { DispatchService } from './dispatch.service';
import { EmailModule } from '../email/email.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: NOTIFICATION_QUEUE }),
    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get('appConfig.authServiceHost'),
            port: config.get<number>('appConfig.authServicePort'),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'PROFILE_SERVICE',
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get('appConfig.profileServiceHost'),
            port: config.get<number>('appConfig.profileServicePort'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
    EmailModule,
    NotificationModule,
  ],
  controllers: [DispatchController],
  providers: [DispatchService, DispatchProcessor],
})
export class DispatchModule {}
