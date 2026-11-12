import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  AiAgentPatterns,
  AgentActionDto,
  AgentMessageDto,
  AgentSessionQueryDto,
  ProcessDocumentDto,
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

  private send<T>(pattern: string, data: unknown) {
    return firstValueFrom(
      this.aiAgentClient.send<T>(
        pattern,
        withServiceAuth(data, this.serviceToken),
      ),
    );
  }

  async agentMessage(dto: AgentMessageDto) {
    return this.send(AiAgentPatterns.AGENT.MESSAGE, dto);
  }

  async confirmAgentAction(dto: AgentActionDto) {
    return this.send(AiAgentPatterns.AGENT.CONFIRM_ACTION, dto);
  }

  async rejectAgentAction(dto: AgentActionDto) {
    return this.send(AiAgentPatterns.AGENT.REJECT_ACTION, dto);
  }

  async getAgentSession(dto: AgentSessionQueryDto) {
    return this.send(AiAgentPatterns.AGENT.GET_SESSION, dto);
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
