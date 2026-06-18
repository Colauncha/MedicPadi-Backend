import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  serviceConfig,
  dbConfig,
  zoomConfig,
  appConfig,
} from '@medicpadi-backend/config';
import { AppointmentModule } from './appointment/appointment.module';
import { PrescriptionModule } from './prescription/prescription.module';
import { TestRequisitionModule } from './test-requisition/test-requisition.module';
import { DrugRequisitionModule } from './drug-requisition/drug-requisition.module';
import { StatsModule } from './stats/stats.module';
import { Appointment } from '../entities/appointment.entity';
import { Prescription } from '../entities/prescription.entity';
import { PrescriptionItem } from '../entities/prescription-item.entity';
import { TestRequisition } from '../entities/test-requisition.entity';
import { TestRequisitionItem } from '../entities/test-requisition-item.entity';
import { DrugRequisition } from '../entities/drug-requisition.entity';
import { DrugRequisitionItem } from '../entities/drug-requisition-item.entity';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `medicpadi-backend/apps/orders/.env.${process.env.NODE_ENV || 'development'}`,
      load: [serviceConfig, dbConfig, zoomConfig, appConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => (
        console.log(
          'Application configuration',
          configService.get('appConfig'),
        ),
        {
          type: 'postgres',
          entities: [
            Appointment,
            Prescription,
            PrescriptionItem,
            TestRequisition,
            TestRequisitionItem,
            DrugRequisition,
            DrugRequisitionItem,
          ],
          migrations: [__dirname + '/database/migrations/*.ts'],
          host: configService.get<string>('dbConfig.host'),
          port: configService.get<number>('dbConfig.port'),
          username: configService.get<string>('dbConfig.username'),
          password: configService.get<string>('dbConfig.password'),
          database: configService.get<string>('dbConfig.database'),
          synchronize: configService.get<boolean>('dbConfig.synchronize'),
          migrationsRun: configService.get<boolean>('dbConfig.migrationsRun'),
          autoLoadEntities: configService.get<boolean>(
            'dbConfig.autoLoadEntities',
          ),
        }
      ),
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
    ]),
    AppointmentModule,
    PrescriptionModule,
    TestRequisitionModule,
    DrugRequisitionModule,
    StatsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}