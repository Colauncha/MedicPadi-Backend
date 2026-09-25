import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { ConsentGrant } from '../../entities/consent-grant.entity';
import { ConsentController } from './consent.controller';
import { ConsentService } from './consent.service';
import { EhrAccessService } from './ehr-access.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConsentGrant]),
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
  controllers: [ConsentController],
  providers: [ConsentService, EhrAccessService],
  exports: [EhrAccessService],
})
export class ConsentModule {}
