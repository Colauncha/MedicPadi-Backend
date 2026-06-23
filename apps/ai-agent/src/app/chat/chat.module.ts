import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_PROVIDER } from '../providers/ai-provider.interface';
import { aiProviderFactory } from '../providers/ai-provider.factory';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  controllers: [ChatController],
  providers: [
    {
      provide: AI_PROVIDER,
      useFactory: (configService: ConfigService) =>
        aiProviderFactory(configService),
      inject: [ConfigService],
    },
    ChatService,
  ],
})
export class ChatModule {}
