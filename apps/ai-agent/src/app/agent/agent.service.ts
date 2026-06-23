import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { RunAgentDto, ServiceError } from '@medicpadi-backend/contracts';
import { AI_PROVIDER, IAiProvider } from '../providers/ai-provider.interface';

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    @Inject(AI_PROVIDER) private readonly aiProvider: IAiProvider,
    @Inject('EHR_SERVICE') private readonly ehrClient: ClientProxy,
    @Inject('PROFILE_SERVICE') private readonly profileClient: ClientProxy,
  ) {}

  async run(dto: RunAgentDto) {
    try {
      const plan = await this.aiProvider.complete(
        `You are a medical workflow orchestrator for MedicPadi.
Given the task: "${dto.task}"
${dto.context ? `Context: ${JSON.stringify(dto.context)}` : ''}
Describe the minimal steps to complete this task using EHR records and patient profiles. Be concise.`,
      );
      this.logger.log(
        `Agent plan for task "${dto.task}": ${plan.content.slice(0, 120)}...`,
      );
      return {
        task: dto.task,
        status: 'planned',
        plan: plan.content,
      };
    } catch (error) {
      this.logger.error('Agent run error', error);
      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to run agent task',
      } as ServiceError);
    }
  }
}
