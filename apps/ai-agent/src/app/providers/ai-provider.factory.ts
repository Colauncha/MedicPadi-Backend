import { ConfigService } from '@nestjs/config';
import { AnthropicAdapter } from './anthropic.adapter';
import { OpenAiAdapter } from './openai.adapter';
import { IAiProvider } from './ai-provider.interface';

export function aiProviderFactory(configService: ConfigService): IAiProvider {
  const provider =
    configService.get<string>('appConfig.aiProvider') ?? 'anthropic';
  if (provider === 'openai') {
    return new OpenAiAdapter(configService);
  }
  return new AnthropicAdapter(configService);
}
