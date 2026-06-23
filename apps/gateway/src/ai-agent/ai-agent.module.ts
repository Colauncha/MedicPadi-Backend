import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentService } from './ai-agent.service';
import { SubscriptionGuard } from '../guards/auth/auth.guard';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'AI_AGENT_SERVICE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('appConfig.aiAgentServiceHost'),
            port: configService.get<number>('appConfig.aiAgentServicePort'),
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
    ]),
  ],
  controllers: [AiAgentController],
  providers: [AiAgentService, SubscriptionGuard],
})
export class AiAgentModule {}
