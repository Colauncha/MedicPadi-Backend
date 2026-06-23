import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  AiCompletionOptions,
  AiCompletionResult,
  IAiProvider,
} from './ai-provider.interface';

@Injectable()
export class OpenAiAdapter implements IAiProvider {
  private readonly client: OpenAI;
  private readonly logger = new Logger(OpenAiAdapter.name);
  private readonly defaultModel: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.configService.getOrThrow<string>('appConfig.openaiApiKey'),
    });
    this.defaultModel =
      this.configService.get<string>('appConfig.aiDefaultModel') ?? 'gpt-4o';
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
}
