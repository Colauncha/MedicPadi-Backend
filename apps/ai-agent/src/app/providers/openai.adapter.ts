import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
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

const OPENAI_FALLBACK_MODEL = 'gpt-4o';

/** Marker input used when the model returned arguments that are not valid JSON. */
export const INVALID_TOOL_ARGS = '__invalid_json_arguments__';

export function toOpenAiMessages(
  messages: AiChatMessage[],
  systemPrompt?: string,
): OpenAI.ChatCompletionMessageParam[] {
  const out: OpenAI.ChatCompletionMessageParam[] = [];
  if (systemPrompt) out.push({ role: 'system', content: systemPrompt });
  for (const m of messages) {
    if (m.role === 'user') {
      out.push({ role: 'user', content: m.content });
    } else if (m.role === 'assistant') {
      out.push({
        role: 'assistant',
        content: m.content || null,
        ...(m.toolCalls?.length
          ? {
              tool_calls: m.toolCalls.map((c) => ({
                id: c.id,
                type: 'function' as const,
                function: { name: c.name, arguments: JSON.stringify(c.input) },
              })),
            }
          : {}),
      });
    } else {
      out.push({
        role: 'tool',
        tool_call_id: m.toolCallId,
        content: m.isError ? `ERROR: ${m.content}` : m.content,
      });
    }
  }
  return out;
}

function mapFinishReason(reason: string | null | undefined): AiStopReason {
  switch (reason) {
    case 'stop':
      return 'end_turn';
    case 'tool_calls':
      return 'tool_use';
    case 'length':
      return 'max_tokens';
    default:
      return 'other';
  }
}

@Injectable()
export class OpenAiAdapter implements IAiProvider {
  private readonly client: OpenAI;
  private readonly logger = new Logger(OpenAiAdapter.name);
  private readonly defaultModel: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.getOrThrow<string>('appConfig.openaiApiKey'),
    });
    // AI_DEFAULT_MODEL defaults to a Claude model id; never send that to OpenAI.
    const configured = this.configService.get<string>(
      'appConfig.aiDefaultModel',
    );
    this.defaultModel =
      configured && !configured.startsWith('claude')
        ? configured
        : OPENAI_FALLBACK_MODEL;
  }

  async complete(
    prompt: string,
    options: AiCompletionOptions = {},
  ): Promise<AiCompletionResult> {
    const model = options.model ?? this.defaultModel;
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      ...(options.systemPrompt
        ? [{ role: 'system' as const, content: options.systemPrompt }]
        : []),
      ...(options.history ?? []).map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
      { role: 'user' as const, content: prompt },
    ];

    const response = await this.client.chat.completions.create({
      model,
      max_tokens: options.maxTokens ?? 4096,
      messages,
    });

    this.logger.debug(
      `OpenAI completion: model=${response.model} input=${response.usage?.prompt_tokens} output=${response.usage?.completion_tokens}`,
    );

    return {
      content: response.choices[0]?.message?.content ?? '',
      model: response.model,
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
    };
  }

  async chat(
    messages: AiChatMessage[],
    options: AiChatOptions = {},
  ): Promise<AiChatResult> {
    const response = await this.client.chat.completions.create({
      model: options.model ?? this.defaultModel,
      max_tokens: options.maxTokens ?? 4096,
      messages: toOpenAiMessages(messages, options.systemPrompt),
      ...(options.tools?.length
        ? {
            tools: options.tools.map((t) => ({
              type: 'function' as const,
              function: {
                name: t.name,
                description: t.description,
                parameters: t.inputSchema as Record<string, unknown>,
              },
            })),
          }
        : {}),
    });

    const choice = response.choices[0];
    const toolCalls: AiToolCall[] = [];
    for (const tc of choice?.message?.tool_calls ?? []) {
      if (tc.type !== 'function') continue;
      let input: Record<string, unknown>;
      try {
        const parsed = JSON.parse(tc.function.arguments || '{}');
        input =
          parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed
            : { [INVALID_TOOL_ARGS]: tc.function.arguments };
      } catch {
        input = { [INVALID_TOOL_ARGS]: tc.function.arguments };
      }
      toolCalls.push({ id: tc.id, name: tc.function.name, input });
    }

    this.logger.debug(
      `OpenAI chat: model=${response.model} finish=${choice?.finish_reason} tools=${toolCalls.length}`,
    );

    return {
      text: choice?.message?.content ?? '',
      toolCalls,
      stopReason: mapFinishReason(choice?.finish_reason),
      model: response.model,
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
    };
  }
}
