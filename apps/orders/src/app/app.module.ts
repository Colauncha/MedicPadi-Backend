import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentModule } from './appointment/appointment.module';
import { TestRequisitionModule } from './test-requisition/test-requisition.module';
import { DrugRequisitionModule } from './drug-requisition/drug-requisition.module';
import { serviceConfig, dbConfig } from '@medicpadi-backend/config';
import { Appointment } from '../entities/appointment.entity';
import { TestRequisition } from '../entities/test-requisition.entity';
import { DrugRequisition } from '../entities/drug-requisition.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `medicpadi-backend/apps/orders/.env.${process.env.NODE_ENV || 'development'}`,
      load: [serviceConfig, dbConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        console.log(
          'Service configuration:',
          configService.get('serviceConfig'),
        );
        console.log('Database configuration:', configService.get('dbConfig'));
        return {
          type: 'postgres',
          entities: [Appointment, TestRequisition, DrugRequisition],
          host: configService.get<string>('dbConfig.host'),
          port: configService.get<number>('dbConfig.port'),
          username: configService.get<string>('dbConfig.username'),
          password: configService.get<string>('dbConfig.password'),
          database: configService.get<string>('dbConfig.database'),
          synchronize: configService.get<boolean>('dbConfig.synchronize'),
          autoLoadEntities: configService.get<boolean>(
            'dbConfig.autoLoadEntities',
          ),
        };
      },
    }),
    AppointmentModule,
    TestRequisitionModule,
    DrugRequisitionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
