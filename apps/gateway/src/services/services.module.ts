import { Module } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { CloudinaryModule } from '@medicpadi-backend/utils';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'SERVICES_SERVICE',
        useFactory: (configService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('appConfig.servicesServiceHost'),
            port: configService.get('appConfig.servicesServicePort'),
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
    CloudinaryModule,
  ],
  controllers: [ServicesController],
  providers: [ServicesService],
})
export class ServicesModule {}
