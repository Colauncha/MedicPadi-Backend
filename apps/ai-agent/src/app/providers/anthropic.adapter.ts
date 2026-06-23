import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import {
  AiCompletionOptions,
  AiCompletionResult,
  IAiProvider,
} from './ai-provider.interface';

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

    const content =
      response.content[0].type === 'text' ? response.content[0].text : '';

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
}
