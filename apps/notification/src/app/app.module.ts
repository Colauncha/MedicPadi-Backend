import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NotificationModule } from './notification/notification.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { serviceConfig, dbConfig, smtpConfig } from '@medicpadi-backend/config';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `medicpadi-backend/apps/notification/.env.${process.env.NODE_ENV || 'development'}`,
      load: [serviceConfig, dbConfig, smtpConfig],
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
          // entities: [Auth],
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
    NotificationModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
