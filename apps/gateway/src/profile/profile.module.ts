import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
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
    ]),
  ],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
