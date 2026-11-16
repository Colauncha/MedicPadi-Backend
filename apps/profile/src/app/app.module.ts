import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { serviceConfig, dbConfig, appConfig } from '@medicpadi-backend/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { LaboratoryModule } from './laboratory/laboratory.module';
import { PharmacyModule } from './pharmacy/pharmacy.module';
import { DoctorsModule } from './doctors/doctors.module';
import { PatientModule } from './patient/patient.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { BullModule } from '@nestjs/bullmq';
import { Admin } from '../entities/admin.entity';
import { Pharmacy } from '../entities/pharmacy.entity';
import { Doctor } from '../entities/doctor.entity';
import { Laboratory } from '../entities/laboratory.entity';
import { Patient } from '../entities/patient.entity';
import { Reviews } from '../entities/reviews.entity';
import { Subscription } from '../entities/subscription.entity';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { migrations } from '../database/migrations';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `medicpadi-backend/apps/profile/.env.${process.env.NODE_ENV || 'development'}`,
      load: [serviceConfig, dbConfig, appConfig],
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
          entities: [
            Admin,
            Pharmacy,
            Doctor,
            Laboratory,
            Patient,
            Reviews,
            Subscription,
            SubscriptionPlan,
          ],
          migrations,
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
        };
      },
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('appConfig.redisHost') ?? 'localhost',
          port: configService.get<number>('appConfig.redisPort') ?? 6379,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      }),
    }),
    AdminModule,
    LaboratoryModule,
    PharmacyModule,
    DoctorsModule,
    PatientModule,
    ReviewsModule,
    SubscriptionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
