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

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface AiCompletionResult {
  content: string;
  model: string;
  usage?: AiUsage;
}

// ──────────────────────────────────────────────
// Tool calling (provider-neutral)
// ──────────────────────────────────────────────

/** JSON Schema object describing a tool's input. */
export type AiJsonSchema = {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
};

export interface AiToolDefinition {
  name: string;
  description: string;
  inputSchema: AiJsonSchema;
}

export interface AiToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export type AiChatMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; toolCalls?: AiToolCall[] }
  | {
      role: 'tool';
      toolCallId: string;
      toolName: string;
      content: string;
      isError?: boolean;
    };

export interface AiChatOptions {
  tools?: AiToolDefinition[];
  systemPrompt?: string;
  model?: string;
  maxTokens?: number;
}

export type AiStopReason = 'end_turn' | 'tool_use' | 'max_tokens' | 'other';

export interface AiChatResult {
  text: string;
  toolCalls: AiToolCall[];
  stopReason: AiStopReason;
  model: string;
  usage?: AiUsage;
}

export interface IAiProvider {
  complete(
    prompt: string,
    options?: AiCompletionOptions,
  ): Promise<AiCompletionResult>;

  /** Multi-turn chat with optional tool calling. */
  chat(
    messages: AiChatMessage[],
    options?: AiChatOptions,
  ): Promise<AiChatResult>;
}

export const AI_PROVIDER = 'AI_PROVIDER';
