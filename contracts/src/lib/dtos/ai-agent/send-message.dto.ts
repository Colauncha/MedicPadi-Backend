import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export enum AiMessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export class ChatMessageDto {
  @IsEnum(AiMessageRole)
  role: AiMessageRole;

  @IsString()
  content: string;
}

export class SendMessageDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  history?: ChatMessageDto[];

  @IsOptional()
  @IsString()
  context?: string;

  @IsOptional()
  @IsString()
  model?: string;
}
