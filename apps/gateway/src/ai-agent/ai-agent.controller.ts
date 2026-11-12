import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AgentActionRequestDto,
  AgentMessageRequestDto,
  AuthRole,
  ProcessDocumentDto,
  SendMessageDto,
  SubscriptionLevel,
} from '@medicpadi-backend/contracts';
import { AiAgentService } from './ai-agent.service';
import {
  RequestWithSub,
  SubscriptionGuard,
} from '../guards/auth/auth.guard';
import { Roles } from '../guards/decorators/roles.decorator';
import { RequiresPlan } from '../guards/decorators/requires-plan.decorator';

// The gateway has no global ValidationPipe, so validate at the edge.
const validate = new ValidationPipe({ whitelist: true, transform: true });

@ApiTags('AI Agent')
@ApiBearerAuth('access-token')
@Controller('ai')
@UseGuards(SubscriptionGuard)
export class AiAgentController {
  constructor(private readonly aiAgentService: AiAgentService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Send a medical Q&A message to the AI assistant' })
  @ApiResponse({ status: 201, description: 'AI response returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  sendMessage(@Body() dto: SendMessageDto) {
    return this.aiAgentService.sendMessage(dto);
  }

  @Get('chat/history/:sessionId')
  @ApiOperation({ summary: 'Get chat history for a session' })
  @ApiResponse({ status: 200, description: 'Session history returned.' })
  getChatHistory(@Param('sessionId') sessionId: string) {
    return this.aiAgentService.getChatHistory(sessionId);
  }

  // ──────────────────────────────────────────────
  // Patient agent — premium & professional plans only
  // ──────────────────────────────────────────────

  @Post('agent/messages')
  @Roles(AuthRole.PATIENT)
  @RequiresPlan(SubscriptionLevel.PREMIUM)
  @ApiOperation({
    summary: 'Send a message to the patient agent',
    description:
      'Conversational agent that manages the patient\'s appointments, drug orders and test requisitions. Omit `sessionId` to start a new conversation. Read-only lookups run immediately; changes are returned as a `pendingAction` that must be confirmed. Requires the `patient` role and a premium or professional plan.',
  })
  @ApiResponse({ status: 201, description: 'Agent reply (and pending action, if any).' })
  @ApiResponse({ status: 403, description: 'Not a patient or plan below premium.' })
  @ApiResponse({ status: 404, description: 'Session not found or expired.' })
  agentMessage(
    @Body(validate) dto: AgentMessageRequestDto,
    @Req() req: RequestWithSub) {
    return this.aiAgentService.agentMessage({
      sessionId: dto.sessionId,
      message: dto.message,
      userId: req.user.id,
    });
  }

  @Post('agent/actions/:actionId/confirm')
  @Roles(AuthRole.PATIENT)
  @RequiresPlan(SubscriptionLevel.PREMIUM)
  @ApiOperation({
    summary: 'Confirm and execute a pending agent action',
    description:
      'Executes the action proposed by the agent (booking, order, cancellation…). Each action can be confirmed once and expires after 10 minutes.',
  })
  @ApiResponse({ status: 201, description: 'Action result and agent reply.' })
  @ApiResponse({ status: 410, description: 'Action expired or already handled.' })
  confirmAgentAction(
    @Param('actionId', new ParseUUIDPipe()) actionId: string,
    @Body(validate) dto: AgentActionRequestDto,
    @Req() req: RequestWithSub,
  ) {
    return this.aiAgentService.confirmAgentAction({
      actionId,
      sessionId: dto.sessionId,
      userId: req.user.id,
    });
  }

  @Post('agent/actions/:actionId/reject')
  @Roles(AuthRole.PATIENT)
  @RequiresPlan(SubscriptionLevel.PREMIUM)
  @ApiOperation({ summary: 'Decline a pending agent action' })
  @ApiResponse({ status: 201, description: 'Action discarded.' })
  @ApiResponse({ status: 410, description: 'Action expired or already handled.' })
  rejectAgentAction(
    @Param('actionId', new ParseUUIDPipe()) actionId: string,
    @Body(validate) dto: AgentActionRequestDto,
    @Req() req: RequestWithSub,
  ) {
    return this.aiAgentService.rejectAgentAction({
      actionId,
      sessionId: dto.sessionId,
      userId: req.user.id,
    });
  }

  @Get('agent/sessions/:sessionId')
  @Roles(AuthRole.PATIENT)
  @RequiresPlan(SubscriptionLevel.PREMIUM)
  @ApiOperation({ summary: 'Get an agent conversation and its pending action' })
  @ApiResponse({ status: 200, description: 'Conversation returned.' })
  @ApiResponse({ status: 404, description: 'Session not found or expired.' })
  getAgentSession(
    @Param('sessionId', new ParseUUIDPipe()) sessionId: string,
    @Req() req: RequestWithSub,
  ) {
    return this.aiAgentService.getAgentSession({
      sessionId,
      userId: req.user.id,
    });
  }

  @Post('processor')
  @ApiOperation({ summary: 'Process a medical document with AI' })
  @ApiResponse({ status: 201, description: 'Processing result returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  processDocument(@Body() dto: ProcessDocumentDto) {
    return this.aiAgentService.processDocument(dto);
  }
}
