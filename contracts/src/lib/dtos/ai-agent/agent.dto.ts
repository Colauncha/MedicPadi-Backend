import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

// ──────────────────────────────────────────────
// Gateway request bodies (client-facing)
// ──────────────────────────────────────────────

export class AgentMessageRequestDto {
  @ApiPropertyOptional({
    description:
      'Existing agent session ID. Omit to start a new conversation.',
  })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiProperty({
    description: 'The patient message to the agent',
    example: 'Book me a dermatologist for tomorrow at 10am',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message!: string;
}

export class AgentActionRequestDto {
  @ApiProperty({ description: 'Agent session ID the action belongs to' })
  @IsUUID()
  sessionId!: string;
}

// ──────────────────────────────────────────────
// Internal payloads (gateway → ai-agent). userId is always
// injected by the gateway from the authenticated user.
// ──────────────────────────────────────────────

export class AgentMessageDto extends AgentMessageRequestDto {
  @IsUUID()
  userId!: string;
}

export class AgentActionDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  sessionId!: string;

  @IsUUID()
  actionId!: string;
}

export class AgentSessionQueryDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  sessionId!: string;
}

// ──────────────────────────────────────────────
// Responses
// ──────────────────────────────────────────────

export interface AgentPendingActionView {
  id: string;
  tool: string;
  summary: string;
  expiresAt: string;
}

export interface AgentActionResultView {
  actionId: string;
  tool: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface AgentTurnResult {
  sessionId: string;
  reply: string;
  pendingAction?: AgentPendingActionView;
  actionResult?: AgentActionResultView;
}

export interface AgentSessionView {
  sessionId: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  pendingAction?: AgentPendingActionView;
}
