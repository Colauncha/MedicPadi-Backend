import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { serviceConfig, dbConfig } from '@medicpadi-backend/config';
import { EhrRecordsModule } from './ehr-records/ehr-records.module';
import { ConsentModule } from './consent/consent.module';
import { EhrRecord } from '../entities/ehr-record.entity';
import { ConsentGrant } from '../entities/consent-grant.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `medicpadi-backend/apps/ehr/.env.${process.env.NODE_ENV || 'development'}`,
      load: [serviceConfig, dbConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        entities: [EhrRecord, ConsentGrant],
        host: configService.get<string>('dbConfig.host'),
        port: configService.get<number>('dbConfig.port'),
        username: configService.get<string>('dbConfig.username'),
        password: configService.get<string>('dbConfig.password'),
        database: configService.get<string>('dbConfig.database'),
        synchronize: configService.get<boolean>('dbConfig.synchronize'),
        autoLoadEntities: configService.get<boolean>('dbConfig.autoLoadEntities'),
      }),
    }),
    EhrRecordsModule,
    ConsentModule,
  ],
})
export class AppModule {}