export interface AiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiCompletionOptions {
  model?: string;
  maxTokens?: number;
  systemPrompt?: string;
  history?: AiMessage[];
}

export interface AiCompletionResult {
  content: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface IAiProvider {
  complete(
    prompt: string,
    options?: AiCompletionOptions,
  ): Promise<AiCompletionResult>;
}

export const AI_PROVIDER = 'AI_PROVIDER';
