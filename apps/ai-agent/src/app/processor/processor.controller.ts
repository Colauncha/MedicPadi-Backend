import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  AiAgentPatterns,
  ProcessDocumentDto,
} from '@medicpadi-backend/contracts';
import { ProcessorService } from './processor.service';

@Controller()
export class ProcessorController {
  constructor(private readonly processorService: ProcessorService) {}

  @MessagePattern(AiAgentPatterns.PROCESSOR.ANALYZE)
  analyze(@Payload('data') dto: ProcessDocumentDto) {
    return this.processorService.process(dto, 'analyze');
  }

  @MessagePattern(AiAgentPatterns.PROCESSOR.SUMMARIZE)
  summarize(@Payload('data') dto: ProcessDocumentDto) {
    return this.processorService.process(dto, 'summarize');
  }

  @MessagePattern(AiAgentPatterns.PROCESSOR.EXTRACT)
  extract(@Payload('data') dto: ProcessDocumentDto) {
    return this.processorService.process(dto, 'extract');
  }

  @MessagePattern(AiAgentPatterns.PROCESSOR.CLASSIFY)
  classify(@Payload('data') dto: ProcessDocumentDto) {
    return this.processorService.process(dto, 'classify');
  }
}
