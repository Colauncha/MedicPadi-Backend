import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { DrugRequisition } from '../../entities/drug-requisition.entity';
import { DrugRequisitionItem } from '../../entities/drug-requisition-item.entity';
import { DrugRequisitionController } from './drug-requisition.controller';
import { DrugRequisitionService } from './drug-requisition.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([DrugRequisition, DrugRequisitionItem]),
    ClientsModule.registerAsync([
      {
        name: 'NOTIFICATION_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('appConfig.notificationServiceHost'),
            port: configService.get<number>('appConfig.notificationServicePort'),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'TRANSACTIONS_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('appConfig.transactionsServiceHost'),
            port: configService.get<number>('appConfig.transactionsServicePort'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [DrugRequisitionController],
  providers: [DrugRequisitionService],
})
export class DrugRequisitionModule {}