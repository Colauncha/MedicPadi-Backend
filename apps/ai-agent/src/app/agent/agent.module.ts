import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RedisModule } from '@medicpadi-backend/utils';
import { AI_PROVIDER } from '../providers/ai-provider.interface';
import { aiProviderFactory } from '../providers/ai-provider.factory';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { AgentSessionStore } from './session.store';
import {
  AgentRpcService,
  ORDER_SERVICE,
  PROFILE_SERVICE,
  SERVICES_SERVICE,
} from './tools/agent-rpc.service';
import { ToolRegistry } from './tools/tool.registry';

const tcpClient = (name: string, hostKey: string, portKey: string) => ({
  name,
  useFactory: (configService: ConfigService) => ({
    transport: Transport.TCP as const,
    options: {
      host: configService.get<string>(`appConfig.${hostKey}`),
      port: configService.get<number>(`appConfig.${portKey}`),
    },
  }),
  inject: [ConfigService],
});

@Module({
  imports: [
    RedisModule,
    ClientsModule.registerAsync([
      tcpClient(ORDER_SERVICE, 'ordersServiceHost', 'ordersServicePort'),
      tcpClient(PROFILE_SERVICE, 'profileServiceHost', 'profileServicePort'),
      tcpClient(SERVICES_SERVICE, 'servicesServiceHost', 'servicesServicePort'),
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
    AgentRpcService,
    ToolRegistry,
    AgentSessionStore,
    AgentService,
  ],
})
export class AgentModule {}
