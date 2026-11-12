import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import {
  AiChatMessage,
  AiChatOptions,
  AiChatResult,
  AiCompletionOptions,
  AiCompletionResult,
  AiStopReason,
  AiToolCall,
  IAiProvider,
} from './ai-provider.interface';

/**
 * Converts provider-neutral chat messages into Anthropic message params.
 * Consecutive tool results are grouped into one `user` message of
 * `tool_result` blocks, as the Messages API requires.
 */
export function toAnthropicMessages(
  messages: AiChatMessage[],
): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = [];
  for (const m of messages) {
    if (m.role === 'user') {
      out.push({ role: 'user', content: m.content });
    } else if (m.role === 'assistant') {
      const blocks: Anthropic.ContentBlockParam[] = [];
      if (m.content) blocks.push({ type: 'text', text: m.content });
      for (const call of m.toolCalls ?? []) {
        blocks.push({
          type: 'tool_use',
          id: call.id,
          name: call.name,
          input: call.input,
        });
      }
      if (blocks.length === 0) blocks.push({ type: 'text', text: '' });
      out.push({ role: 'assistant', content: blocks });
    } else {
      const block: Anthropic.ToolResultBlockParam = {
        type: 'tool_result',
        tool_use_id: m.toolCallId,
        content: m.content,
        ...(m.isError ? { is_error: true } : {}),
      };
      const prev = out[out.length - 1];
      if (
        prev &&
        prev.role === 'user' &&
        Array.isArray(prev.content) &&
        prev.content.every((b) => b.type === 'tool_result')
      ) {
        prev.content.push(block);
      } else {
        out.push({ role: 'user', content: [block] });
      }
    }
  }
  return out;
}

function mapStopReason(reason: string | null): AiStopReason {
  switch (reason) {
    case 'end_turn':
    case 'stop_sequence':
      return 'end_turn';
    case 'tool_use':
      return 'tool_use';
    case 'max_tokens':
      return 'max_tokens';
    default:
      return 'other';
  }
}

@Injectable()
export class AnthropicAdapter implements IAiProvider {
  private readonly client: Anthropic;
  private readonly logger = new Logger(AnthropicAdapter.name);
  private readonly defaultModel: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.configService.getOrThrow<string>('appConfig.anthropicApiKey'),
    });
    this.defaultModel =
      this.configService.get<string>('appConfig.aiDefaultModel') ??
      'claude-sonnet-4-6';
  }

  async complete(
    prompt: string,
    options: AiCompletionOptions = {},
  ): Promise<AiCompletionResult> {
    const model = options.model ?? this.defaultModel;
    const messages: Anthropic.MessageParam[] = [
      ...(options.history ?? [])
        .filter((m) => m.role !== 'system')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      { role: 'user', content: prompt },
    ];

    const response = await this.client.messages.create({
      model,
      max_tokens: options.maxTokens ?? 4096,
      system: options.systemPrompt,
      messages,
    });

    const content = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    this.logger.debug(
      `Anthropic completion: model=${response.model} input=${response.usage.input_tokens} output=${response.usage.output_tokens}`,
    );

    return {
      content,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }

  async chat(
    messages: AiChatMessage[],
    options: AiChatOptions = {},
  ): Promise<AiChatResult> {
    const response = await this.client.messages.create({
      model: options.model ?? this.defaultModel,
      max_tokens: options.maxTokens ?? 4096,
      system: options.systemPrompt,
      messages: toAnthropicMessages(messages),
      ...(options.tools?.length
        ? {
            tools: options.tools.map((t) => ({
              name: t.name,
              description: t.description,
              input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
            })),
          }
        : {}),
    });

    let text = '';
    const toolCalls: AiToolCall[] = [];
    for (const block of response.content) {
      if (block.type === 'text') {
        text += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          input: (block.input ?? {}) as Record<string, unknown>,
        });
      }
    }

    this.logger.debug(
      `Anthropic chat: model=${response.model} stop=${response.stop_reason} tools=${toolCalls.length} input=${response.usage.input_tokens} output=${response.usage.output_tokens}`,
    );

    return {
      text,
      toolCalls,
      stopReason: mapStopReason(response.stop_reason),
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}
