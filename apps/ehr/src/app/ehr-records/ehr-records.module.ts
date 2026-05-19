import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EhrRecord } from '../../entities/ehr-record.entity';
import { EhrRecordsController } from './ehr-records.controller';
import { EhrRecordsService } from './ehr-records.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';

@Module({
  imports: [
    TypeOrmModule.forFeature([EhrRecord]),
    ClientsModule.registerAsync([
      {
        name: 'NOTIFICATION_SERVICE',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: async (configService: ConfigService) => ({
          transport: 1, // Transport.TCP
          options: {
            host: configService.get<string>(
              'serviceConfig.notificationServiceHost',
            ),
            port: configService.get<number>(
              'serviceConfig.notificationServicePort',
            ),
          },
        }),
      },
    ]),
  ],
  controllers: [EhrRecordsController],
  providers: [EhrRecordsService],
})
export class EhrRecordsModule {}