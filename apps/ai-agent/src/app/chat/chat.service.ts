import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { SendMessageDto, ServiceError } from '@medicpadi-backend/contracts';
import { AI_PROVIDER, IAiProvider } from '../providers/ai-provider.interface';

const MEDICAL_SYSTEM_PROMPT = `You are a medical assistant for MedicPadi, a healthcare platform.
Answer medical questions accurately and safely. Always remind users to consult a licensed
healthcare provider for diagnosis and treatment. Do not prescribe medication.`;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(@Inject(AI_PROVIDER) private readonly aiProvider: IAiProvider) {}

  async sendMessage(dto: SendMessageDto) {
    try {
      const result = await this.aiProvider.complete(dto.message, {
        systemPrompt: dto.context
          ? `${MEDICAL_SYSTEM_PROMPT}\n\nPatient context:\n${dto.context}`
          : MEDICAL_SYSTEM_PROMPT,
        history: dto.history,
        model: dto.model,
      });
      return { reply: result.content, model: result.model, usage: result.usage };
    } catch (error) {
      this.logger.error('Chat error', error);
      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to process chat message',
      } as ServiceError);
    }
  }

  async getHistory(sessionId: string) {
    this.logger.log(`History requested for session: ${sessionId}`);
    return { sessionId, messages: [] };
  }
}
