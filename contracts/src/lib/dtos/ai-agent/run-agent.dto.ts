import { IsObject, IsOptional, IsString } from 'class-validator';

export class RunAgentDto {
  @IsString()
  task: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
