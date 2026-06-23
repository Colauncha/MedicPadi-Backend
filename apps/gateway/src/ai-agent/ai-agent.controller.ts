import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  ProcessDocumentDto,
  RunAgentDto,
  SendMessageDto,
} from '@medicpadi-backend/contracts';
import { AiAgentService } from './ai-agent.service';
import { SubscriptionGuard } from '../guards/auth/auth.guard';

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

  @Post('agent/run')
  @ApiOperation({ summary: 'Run an AI workflow agent task' })
  @ApiResponse({ status: 201, description: 'Agent task result returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  runAgent(@Body() dto: RunAgentDto) {
    return this.aiAgentService.runAgent(dto);
  }

  @Post('processor')
  @ApiOperation({ summary: 'Process a medical document with AI' })
  @ApiResponse({ status: 201, description: 'Processing result returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.' })
  processDocument(@Body() dto: ProcessDocumentDto) {
    return this.aiAgentService.processDocument(dto);
  }
}
