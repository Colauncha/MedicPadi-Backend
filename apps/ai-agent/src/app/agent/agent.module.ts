import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AI_PROVIDER } from '../providers/ai-provider.interface';
import { aiProviderFactory } from '../providers/ai-provider.factory';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'EHR_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('appConfig.ehrServiceHost'),
            port: configService.get<number>('appConfig.ehrServicePort'),
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
  controllers: [AgentController],
  providers: [
    {
      provide: AI_PROVIDER,
      useFactory: (configService: ConfigService) =>
        aiProviderFactory(configService),
      inject: [ConfigService],
    },
    AgentService,
  ],
})
export class AgentModule {}
