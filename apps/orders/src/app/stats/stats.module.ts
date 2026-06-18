import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { RedisModule } from '@medicpadi-backend/utils';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { Appointment } from '../../entities/appointment.entity';
import { TestRequisition } from '../../entities/test-requisition.entity';
import { DrugRequisition } from '../../entities/drug-requisition.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, TestRequisition, DrugRequisition]),
    RedisModule,
    ClientsModule.registerAsync([
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
    ]),
  ],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
