import { ConfigService } from '@nestjs/config';
import { AiChatMessage, AiToolDefinition } from './ai-provider.interface';
import { AnthropicAdapter, toAnthropicMessages } from './anthropic.adapter';
import {
  INVALID_TOOL_ARGS,
  OpenAiAdapter,
  toOpenAiMessages,
} from './openai.adapter';

const config = (values: Record<string, string | undefined>) =>
  ({
    get: (k: string) => values[k],
    getOrThrow: (k: string) => values[k] ?? 'test-key',
  }) as unknown as ConfigService;

const history: AiChatMessage[] = [
  { role: 'user', content: 'find a doctor' },
  {
    role: 'assistant',
    content: 'Searching',
    toolCalls: [
      { id: 't1', name: 'search_doctors', input: { search: 'ada' } },
      { id: 't2', name: 'search_labs', input: {} },
    ],
  },
  { role: 'tool', toolCallId: 't1', toolName: 'search_doctors', content: '[]' },
  { role: 'tool', toolCallId: 't2', toolName: 'search_labs', content: 'boom', isError: true },
];

const tool: AiToolDefinition = {
  name: 'search_doctors',
  description: 'Search',
  inputSchema: { type: 'object', properties: { search: { type: 'string' } } },
};

describe('Anthropic adapter', () => {
  it('maps tool calls and groups consecutive tool results in one user turn', () => {
    expect(toAnthropicMessages(history)).toEqual([
      { role: 'user', content: 'find a doctor' },
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Searching' },
          { type: 'tool_use', id: 't1', name: 'search_doctors', input: { search: 'ada' } },
          { type: 'tool_use', id: 't2', name: 'search_labs', input: {} },
        ],
      },
      {
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 't1', content: '[]' },
          { type: 'tool_result', tool_use_id: 't2', content: 'boom', is_error: true },
        ],
      },
    ]);
  });

  it('sends tools and parses text + tool_use blocks', async () => {
    const adapter = new AnthropicAdapter(config({ 'appConfig.aiDefaultModel': 'claude-x' }));
    const create = jest.fn().mockResolvedValue({
      model: 'claude-x',
      stop_reason: 'tool_use',
      usage: { input_tokens: 10, output_tokens: 5 },
      content: [
        { type: 'text', text: 'Let me check. ' },
        { type: 'tool_use', id: 'tu1', name: 'search_doctors', input: { search: 'ada' } },
      ],
    });
    (adapter as any).client = { messages: { create } };

    const res = await adapter.chat([{ role: 'user', content: 'hi' }], {
      tools: [tool],
      systemPrompt: 'sys',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-x',
        system: 'sys',
        tools: [{ name: 'search_doctors', description: 'Search', input_schema: tool.inputSchema }],
      }),
    );
    expect(res).toMatchObject({
      text: 'Let me check. ',
      stopReason: 'tool_use',
      toolCalls: [{ id: 'tu1', name: 'search_doctors', input: { search: 'ada' } }],
    });
  });
});

describe('OpenAI adapter', () => {
  it('maps history to chat completion messages', () => {
    expect(toOpenAiMessages(history, 'sys')).toEqual([
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'find a doctor' },
      {
        role: 'assistant',
        content: 'Searching',
        tool_calls: [
          {
            id: 't1',
            type: 'function',
            function: { name: 'search_doctors', arguments: '{"search":"ada"}' },
          },
          { id: 't2', type: 'function', function: { name: 'search_labs', arguments: '{}' } },
        ],
      },
      { role: 'tool', tool_call_id: 't1', content: '[]' },
      { role: 'tool', tool_call_id: 't2', content: 'ERROR: boom' },
    ]);
  });

  it('never uses a Claude model id as the OpenAI default', async () => {
    const adapter = new OpenAiAdapter(
      config({ 'appConfig.aiDefaultModel': 'claude-sonnet-4-6' }),
    );
    expect((adapter as any).defaultModel).toBe('gpt-4o');
    const custom = new OpenAiAdapter(config({ 'appConfig.aiDefaultModel': 'gpt-4.1' }));
    expect((custom as any).defaultModel).toBe('gpt-4.1');
  });

  it('parses tool calls and flags malformed JSON arguments', async () => {
    const adapter = new OpenAiAdapter(config({}));
    const create = jest.fn().mockResolvedValue({
      model: 'gpt-4o',
      usage: { prompt_tokens: 3, completion_tokens: 4 },
      choices: [
        {
          finish_reason: 'tool_calls',
          message: {
            content: null,
            tool_calls: [
              {
                id: 'c1',
                type: 'function',
                function: { name: 'search_doctors', arguments: '{"search":"ada"}' },
              },
              { id: 'c2', type: 'function', function: { name: 'search_labs', arguments: '{oops' } },
            ],
          },
        },
      ],
    });
    (adapter as any).client = { chat: { completions: { create } } };

    const res = await adapter.chat([{ role: 'user', content: 'hi' }], { tools: [tool] });

    expect(create.mock.calls[0][0].tools).toEqual([
      {
        type: 'function',
        function: { name: 'search_doctors', description: 'Search', parameters: tool.inputSchema },
      },
    ]);
    expect(res.stopReason).toBe('tool_use');
    expect(res.toolCalls[0]).toEqual({ id: 'c1', name: 'search_doctors', input: { search: 'ada' } });
    expect(res.toolCalls[1].input).toHaveProperty(INVALID_TOOL_ARGS, '{oops');
  });
});
