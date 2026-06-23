import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { appConfig } from '@medicpadi-backend/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { AgentModule } from './agent/agent.module';
import { ProcessorModule } from './processor/processor.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `medicpadi-backend/apps/ai-agent/.env.${process.env.NODE_ENV || 'development'}`,
      load: [appConfig],
    }),
    ChatModule,
    AgentModule,
    ProcessorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
