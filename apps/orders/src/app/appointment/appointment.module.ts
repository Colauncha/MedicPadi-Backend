import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from '../../entities/appointment.entity';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';
import { JwtModule } from '@nestjs/jwt';
import { ZoomService } from './providers/zoom.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        signOptions: {},
      }),
    }),
    ClientsModule.registerAsync([
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
      {
        name: 'TRANSACTIONS_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('appConfig.transactionsServiceHost'),
            port: configService.get<number>(
              'appConfig.transactionsServicePort',
            ),
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
      {
        name: 'NOTIFICATION_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('appConfig.notificationServiceHost'),
            port: configService.get<number>(
              'appConfig.notificationServicePort',
            ),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [AppointmentController],
  providers: [AppointmentService, ZoomService],
})
export class AppointmentModule {}
