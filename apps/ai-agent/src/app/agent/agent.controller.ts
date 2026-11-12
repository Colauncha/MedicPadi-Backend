import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  AgentActionDto,
  AgentMessageDto,
  AgentSessionQueryDto,
  AiAgentPatterns,
} from '@medicpadi-backend/contracts';
import { AgentService } from './agent.service';

@Controller()
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @MessagePattern(AiAgentPatterns.AGENT.MESSAGE)
  message(@Payload('data') dto: AgentMessageDto) {
    return this.agentService.message(dto);
  }

  @MessagePattern(AiAgentPatterns.AGENT.CONFIRM_ACTION)
  confirmAction(@Payload('data') dto: AgentActionDto) {
    return this.agentService.confirmAction(dto);
  }

  @MessagePattern(AiAgentPatterns.AGENT.REJECT_ACTION)
  rejectAction(@Payload('data') dto: AgentActionDto) {
    return this.agentService.rejectAction(dto);
  }

  @MessagePattern(AiAgentPatterns.AGENT.GET_SESSION)
  getSession(@Payload('data') dto: AgentSessionQueryDto) {
    return this.agentService.getSession(dto);
  }
}
