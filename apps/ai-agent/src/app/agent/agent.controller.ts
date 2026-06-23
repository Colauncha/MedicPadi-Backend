import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AiAgentPatterns, RunAgentDto } from '@medicpadi-backend/contracts';
import { AgentService } from './agent.service';

@Controller()
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @MessagePattern(AiAgentPatterns.AGENT.RUN)
  runAgent(@Payload('data') dto: RunAgentDto) {
    return this.agentService.run(dto);
  }
}
