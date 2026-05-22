import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  serviceConfig,
  dbConfig,
  paystackConfig,
  appConfig,
} from '@medicpadi-backend/config';
import { TransactionsModule } from './transactions/transactions.module';
import { Transaction } from '../entities/transaction.entity';
import { Wallet } from '../entities/wallet.entity';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `medicpadi-backend/apps/transactions/.env.${process.env.NODE_ENV || 'development'}`,
      load: [serviceConfig, dbConfig, paystackConfig, appConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        entities: [Transaction, Wallet],
        host: configService.get<string>('dbConfig.host'),
        port: configService.get<number>('dbConfig.port'),
        username: configService.get<string>('dbConfig.username'),
        password: configService.get<string>('dbConfig.password'),
        database: configService.get<string>('dbConfig.database'),
        synchronize: configService.get<boolean>('dbConfig.synchronize'),
        autoLoadEntities: configService.get<boolean>(
          'dbConfig.autoLoadEntities',
        ),
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
        name: 'AUTH_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('appConfig authServiceHost'),
            port: configService.get<number>('appConfig.authServicePort'),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'ORDER_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('appConfig.orderServiceHost'),
            port: configService.get<number>('appConfig.orderServicePort'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
    TransactionsModule,
  ],
})
export class AppModule {}