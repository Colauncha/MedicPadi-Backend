import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ProcessorOperation {
  ANALYZE = 'analyze',
  SUMMARIZE = 'summarize',
  EXTRACT = 'extract',
  CLASSIFY = 'classify',
}

export class ProcessDocumentDto {
  @IsString()
  content: string;

  @IsEnum(ProcessorOperation)
  operation: ProcessorOperation;

  @IsOptional()
  @IsString()
  instructions?: string;
}
