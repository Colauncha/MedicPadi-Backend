import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestRequisition } from '../../entities/test-requisition.entity';
import { TestRequisitionItem } from '../../entities/test-requisition-item.entity';
import { TestRequisitionController } from './test-requisition.controller';
import { TestRequisitionService } from './test-requisition.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([TestRequisition, TestRequisitionItem]),
    ClientsModule.registerAsync([
      {
        name: 'PROFILE_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('appConfig.profileServiceHost'),
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
    ]),
  ],
  controllers: [TestRequisitionController],
  providers: [TestRequisitionService],
})
export class TestRequisitionModule {}