import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { ProcessDocumentDto, ServiceError } from '@medicpadi-backend/contracts';
import { AI_PROVIDER, IAiProvider } from '../providers/ai-provider.interface';

const OPERATION_PROMPTS: Record<string, string> = {
  analyze:
    'Analyze the following medical document and provide key clinical findings:',
  summarize:
    'Summarize the following medical document in clear, concise language:',
  extract:
    'Extract all structured data (diagnoses, medications, dates, lab values) from the following:',
  classify: 'Classify the type and category of the following medical document:',
};

@Injectable()
export class ProcessorService {
  private readonly logger = new Logger(ProcessorService.name);

  constructor(@Inject(AI_PROVIDER) private readonly aiProvider: IAiProvider) {}

  async process(dto: ProcessDocumentDto, operation: string) {
    try {
      const basePrompt =
        OPERATION_PROMPTS[operation] ?? OPERATION_PROMPTS['analyze'];
      const fullPrompt = [
        basePrompt,
        dto.instructions ? `\nAdditional instructions: ${dto.instructions}` : '',
        `\n\n${dto.content}`,
      ].join('');

      const result = await this.aiProvider.complete(fullPrompt);
      return { operation, result: result.content, model: result.model };
    } catch (error) {
      this.logger.error(`Processor ${operation} error`, error);
      throw new RpcException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Failed to ${operation} document`,
      } as ServiceError);
    }
  }
}
