import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { serviceConfig, dbConfig } from '@medicpadi-backend/config';
import { TransactionsModule } from './transactions/transactions.module';
import { Transaction } from '../entities/transaction.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `medicpadi-backend/apps/transactions/.env.${process.env.NODE_ENV || 'development'}`,
      load: [serviceConfig, dbConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        entities: [Transaction],
        host: configService.get<string>('dbConfig.host'),
        port: configService.get<number>('dbConfig.port'),
        username: configService.get<string>('dbConfig.username'),
        password: configService.get<string>('dbConfig.password'),
        database: configService.get<string>('dbConfig.database'),
        synchronize: configService.get<boolean>('dbConfig.synchronize'),
        autoLoadEntities: configService.get<boolean>('dbConfig.autoLoadEntities'),
      }),
    }),
    TransactionsModule,
  ],
})
export class AppModule {}