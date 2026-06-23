import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_PROVIDER } from '../providers/ai-provider.interface';
import { aiProviderFactory } from '../providers/ai-provider.factory';
import { ProcessorController } from './processor.controller';
import { ProcessorService } from './processor.service';

@Module({
  controllers: [ProcessorController],
  providers: [
    {
      provide: AI_PROVIDER,
      useFactory: (configService: ConfigService) =>
        aiProviderFactory(configService),
      inject: [ConfigService],
    },
    ProcessorService,
  ],
})
export class ProcessorModule {}
