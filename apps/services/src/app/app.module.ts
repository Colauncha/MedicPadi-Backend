import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PharmacyDrugsModule } from './pharmacy-drugs/pharmacy-drugs.module';
import { LabTestsModule } from './lab-tests/lab-tests.module';
import { DepartmentModule } from './department/department.module';
import { DrugCategoryModule } from './drug-category/drug-category.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { serviceConfig, dbConfig } from '@medicpadi-backend/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LabTest } from '../entities/lab-test.entity';
import { PharmacyDrug } from '../entities/pharmacy-drug.entity';
import { Department } from '../entities/department.entity';
import { DrugCategory } from '../entities/drug_category.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `medicpadi-backend/apps/services/.env.${process.env.NODE_ENV || 'development'}`,
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
          entities: [LabTest, PharmacyDrug, Department, DrugCategory],
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
        };
      },
    }),
    PharmacyDrugsModule,
    LabTestsModule,
    DepartmentModule,
    DrugCategoryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
