import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  AiAgentPatterns,
  ProcessDocumentDto,
  RunAgentDto,
  SendMessageDto,
} from '@medicpadi-backend/contracts';
import { withServiceAuth } from '@medicpadi-backend/utils';

@Injectable()
export class AiAgentService {
  constructor(
    @Inject('AI_AGENT_SERVICE') private readonly aiAgentClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>(
      'appConfig.internalServiceToken',
    );
  }

  async sendMessage(dto: SendMessageDto) {
    return firstValueFrom(
      this.aiAgentClient.send(
        AiAgentPatterns.CHAT.SEND,
        withServiceAuth(dto, this.serviceToken),
      ),
    );
  }

  async getChatHistory(sessionId: string) {
    return firstValueFrom(
      this.aiAgentClient.send(
        AiAgentPatterns.CHAT.HISTORY,
        withServiceAuth(sessionId, this.serviceToken),
      ),
    );
  }

  async runAgent(dto: RunAgentDto) {
    return firstValueFrom(
      this.aiAgentClient.send(
        AiAgentPatterns.AGENT.RUN,
        withServiceAuth(dto, this.serviceToken),
      ),
    );
  }

  async processDocument(dto: ProcessDocumentDto) {
    const pattern =
      AiAgentPatterns.PROCESSOR[
        dto.operation.toUpperCase() as keyof typeof AiAgentPatterns.PROCESSOR
      ] ?? AiAgentPatterns.PROCESSOR.ANALYZE;
    return firstValueFrom(
      this.aiAgentClient.send(
        pattern,
        withServiceAuth(dto, this.serviceToken),
      ),
    );
  }
}
