import { Module } from '@nestjs/common';
import { EhrService } from './ehr.service';
import { EhrController } from './ehr.controller';
import { DocumentConverterService } from './document-converter.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { CloudinaryModule } from '@medicpadi-backend/utils';

@Module({
  imports: [
    CloudinaryModule,
    ClientsModule.registerAsync([
      {
        name: 'EHR_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('appConfig.ehrServiceHost'),
            port: configService.get<number>('appConfig.ehrServicePort'),
          },
        }),
        inject: [ConfigService],
      },
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
    ]),
  ],
  controllers: [EhrController],
  providers: [EhrService, DocumentConverterService],
})
export class EhrModule {}
