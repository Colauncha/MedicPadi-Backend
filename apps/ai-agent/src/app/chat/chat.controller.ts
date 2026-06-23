import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AiAgentPatterns, SendMessageDto } from '@medicpadi-backend/contracts';
import { ChatService } from './chat.service';

@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @MessagePattern(AiAgentPatterns.CHAT.SEND)
  sendMessage(@Payload('data') dto: SendMessageDto) {
    return this.chatService.sendMessage(dto);
  }

  @MessagePattern(AiAgentPatterns.CHAT.HISTORY)
  getHistory(@Payload('data') sessionId: string) {
    return this.chatService.getHistory(sessionId);
  }
}
