import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import {
  DoctorPatterns,
  OrderPatterns,
} from '@medicpadi-backend/contracts';
import {
  AiChatMessage,
  AiChatOptions,
  AiChatResult,
  IAiProvider,
} from '../providers/ai-provider.interface';
import { AgentService, MAX_AGENT_STEPS, SYSTEM_NOTE_PREFIX } from './agent.service';
import { AgentSessionStore, trimHistory } from './session.store';
import { AgentRpcService } from './tools/agent-rpc.service';
import { ToolRegistry } from './tools/tool.registry';
import { ToolError } from './tools/tool.types';

const PATIENT = '11111111-1111-4111-8111-111111111111';
const INTRUDER = '22222222-2222-4222-8222-222222222222';
const DOCTOR = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

/** Minimal in-memory stand-in for the ioredis calls the store uses. */
class FakeRedis {
  store = new Map<string, string>();
  async get(k: string) {
    return this.store.get(k) ?? null;
  }
  async set(k: string, v: string) {
    this.store.set(k, v);
    return 'OK';
  }
  async del(k: string) {
    return this.store.delete(k) ? 1 : 0;
  }
  async eval(_script: string, _n: number, key: string) {
    const v = this.store.get(key) ?? null;
    this.store.delete(key);
    return v;
  }
}

type Step = Partial<AiChatResult> | ((messages: AiChatMessage[]) => Partial<AiChatResult>);

class ScriptedProvider implements IAiProvider {
  calls: { messages: AiChatMessage[]; options?: AiChatOptions }[] = [];
  constructor(private steps: Step[]) {}
  async complete(): Promise<never> {
    throw new Error('not used');
  }
  async chat(messages: AiChatMessage[], options?: AiChatOptions): Promise<AiChatResult> {
    this.calls.push({ messages: structuredClone(messages), options });
    const step = this.steps.shift();
    if (!step) throw new Error('provider script exhausted');
    const r = typeof step === 'function' ? step(messages) : step;
    return {
      text: r.text ?? '',
      toolCalls: r.toolCalls ?? [],
      stopReason: r.toolCalls?.length ? 'tool_use' : 'end_turn',
      model: 'fake',
    };
  }
}

const future = () => new Date(Date.now() + 86_400_000).toISOString();

const bookCall = (id = 'call_book') => ({
  id,
  name: 'book_appointment',
  input: { doctor_id: DOCTOR, appointment_time: future() },
});

function setup(steps: Step[]) {
  const send = jest.fn(async (_t: string, pattern: string, data: any) => {
    switch (pattern) {
      case DoctorPatterns.FIND_ALL:
        return { data: [{ user_id: DOCTOR, firstName: 'Ada' }], meta: { page: 1 } };
      case DoctorPatterns.RETRIEVE:
        return { user_id: DOCTOR, firstName: 'Ada', costPerSession: 5000 };
      case OrderPatterns.APPOINTMENTS.CREATE:
        return { id: 'appt-1', ...data, status: 'pending' };
      default:
        throw new ToolError(`unexpected ${pattern}`);
    }
  });
  const rpc = { send } as unknown as AgentRpcService;
  const provider = new ScriptedProvider(steps);
  const redis = new FakeRedis();
  const store = new AgentSessionStore(
    redis as any,
    { get: () => undefined } as unknown as ConfigService,
  );
  const service = new AgentService(provider, new ToolRegistry(rpc), store);
  return { service, provider, send, redis };
}

const createCalls = (send: jest.Mock) =>
  send.mock.calls.filter(([, p]) => p === OrderPatterns.APPOINTMENTS.CREATE);

describe('AgentService', () => {
  it('answers plain questions without tools and persists the session', async () => {
    const { service, provider } = setup([{ text: 'Hello! How can I help?' }]);
    const res = await service.message({ userId: PATIENT, message: 'hi' });

    expect(res.reply).toBe('Hello! How can I help?');
    expect(res.pendingAction).toBeUndefined();
    expect(provider.calls[0].options?.tools?.length).toBeGreaterThan(0);

    const session = await service.getSession({ userId: PATIENT, sessionId: res.sessionId });
    expect(session.messages).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'Hello! How can I help?' },
    ]);
  });

  it('runs read tools and feeds results back to the model', async () => {
    const { service, provider, send } = setup([
      { toolCalls: [{ id: 'c1', name: 'search_doctors', input: { search: 'Ada' } }] },
      { text: 'I found Dr Ada.' },
    ]);
    const res = await service.message({ userId: PATIENT, message: 'find Ada' });

    expect(res.reply).toBe('I found Dr Ada.');
    expect(send).toHaveBeenCalledWith('profile', DoctorPatterns.FIND_ALL, expect.anything());
    const toolMsg = provider.calls[1].messages.find((m) => m.role === 'tool') as any;
    expect(toolMsg).toMatchObject({ toolCallId: 'c1', toolName: 'search_doctors' });
    expect(JSON.parse(toolMsg.content).results[0].doctor_id).toBe(DOCTOR);
  });

  it('returns tool errors to the model instead of failing the turn', async () => {
    const { service, provider } = setup([
      { toolCalls: [{ id: 'c1', name: 'get_appointment', input: { appointment_id: 'bad' } }] },
      { text: 'That ID looks wrong.' },
    ]);
    await service.message({ userId: PATIENT, message: 'show it' });
    const toolMsg = provider.calls[1].messages.find((m) => m.role === 'tool') as any;
    expect(toolMsg.isError).toBe(true);
    expect(toolMsg.content).toMatch(/appointment_id must be a UUID/);
  });

  it('turns write tools into a pending action without executing them', async () => {
    const { service, send, provider } = setup([
      { text: 'Sure.', toolCalls: [bookCall()] },
    ]);
    const res = await service.message({ userId: PATIENT, message: 'book Dr Ada' });

    expect(res.pendingAction).toMatchObject({ tool: 'book_appointment' });
    expect(res.reply).toContain('Please confirm:');
    expect(createCalls(send)).toHaveLength(0);
    // The turn ends right after the proposal — no extra model call.
    expect(provider.calls).toHaveLength(1);
  });

  it('allows only one proposal per turn', async () => {
    const { service } = setup([
      { toolCalls: [bookCall('c1'), bookCall('c2')] },
    ]);
    const res = await service.message({ userId: PATIENT, message: 'book twice' });
    const session = await (service as any).sessions.get(PATIENT, res.sessionId);
    const second = session.messages.find((m: any) => m.toolCallId === 'c2');
    expect(second.isError).toBe(true);
  });

  it('executes a confirmed action exactly once', async () => {
    const { service, send } = setup([
      { toolCalls: [bookCall()] },
      { text: 'Booked! The doctor will confirm soon.' },
    ]);
    const proposal = await service.message({ userId: PATIENT, message: 'book' });
    const dto = {
      userId: PATIENT,
      sessionId: proposal.sessionId,
      actionId: proposal.pendingAction!.id,
    };

    const confirmed = await service.confirmAction(dto);
    expect(confirmed.actionResult).toMatchObject({ success: true, tool: 'book_appointment' });
    expect(confirmed.reply).toBe('Booked! The doctor will confirm soon.');
    expect(createCalls(send)).toHaveLength(1);
    expect(createCalls(send)[0][2]).toMatchObject({ patient_id: PATIENT, provider_id: DOCTOR });

    await expect(service.confirmAction(dto)).rejects.toBeInstanceOf(RpcException);
    expect(createCalls(send)).toHaveLength(1);
  });

  it('does not let another user confirm the action', async () => {
    const { service, send } = setup([{ toolCalls: [bookCall()] }]);
    const proposal = await service.message({ userId: PATIENT, message: 'book' });

    await expect(
      service.confirmAction({
        userId: INTRUDER,
        sessionId: proposal.sessionId,
        actionId: proposal.pendingAction!.id,
      }),
    ).rejects.toBeInstanceOf(RpcException);
    expect(createCalls(send)).toHaveLength(0);
  });

  it('discards the pending action when the patient rejects it', async () => {
    const { service, send } = setup([{ toolCalls: [bookCall()] }]);
    const proposal = await service.message({ userId: PATIENT, message: 'book' });
    const dto = {
      userId: PATIENT,
      sessionId: proposal.sessionId,
      actionId: proposal.pendingAction!.id,
    };

    const rejected = await service.rejectAction(dto);
    expect(rejected.reply).toMatch(/haven't done that/);
    await expect(service.confirmAction(dto)).rejects.toBeInstanceOf(RpcException);
    expect(createCalls(send)).toHaveLength(0);
  });

  it('abandons a pending action when the patient sends a new message', async () => {
    const { service, provider } = setup([
      { toolCalls: [bookCall()] },
      { text: 'No problem.' },
    ]);
    const proposal = await service.message({ userId: PATIENT, message: 'book' });
    const next = await service.message({
      userId: PATIENT,
      sessionId: proposal.sessionId,
      message: 'actually, never mind',
    });

    expect(next.pendingAction).toBeUndefined();
    const last = provider.calls[1].messages.at(-1) as any;
    expect(last.content.startsWith(SYSTEM_NOTE_PREFIX)).toBe(true);
    await expect(
      service.confirmAction({
        userId: PATIENT,
        sessionId: proposal.sessionId,
        actionId: proposal.pendingAction!.id,
      }),
    ).rejects.toBeInstanceOf(RpcException);
  });

  it('still reports the action result if the follow-up model call fails', async () => {
    const { service, send } = setup([{ toolCalls: [bookCall()] }]); // no 2nd step → provider throws
    const proposal = await service.message({ userId: PATIENT, message: 'book' });
    const res = await service.confirmAction({
      userId: PATIENT,
      sessionId: proposal.sessionId,
      actionId: proposal.pendingAction!.id,
    });
    expect(res.actionResult?.success).toBe(true);
    expect(res.reply).toMatch(/^Done:/);
    expect(createCalls(send)).toHaveLength(1);
  });

  it('stops after MAX_AGENT_STEPS model calls', async () => {
    const loop: Step = () => ({
      toolCalls: [{ id: `c${Math.random()}`, name: 'search_doctors', input: {} }],
    });
    const { service, provider } = setup(Array(MAX_AGENT_STEPS + 2).fill(loop));
    const res = await service.message({ userId: PATIENT, message: 'loop' });
    expect(provider.calls).toHaveLength(MAX_AGENT_STEPS);
    expect(res.reply).toMatch(/couldn't finish/);
  });

  it('returns 404 for unknown or foreign sessions', async () => {
    const { service } = setup([{ text: 'hi' }]);
    const res = await service.message({ userId: PATIENT, message: 'hi' });
    await expect(
      service.getSession({ userId: INTRUDER, sessionId: res.sessionId }),
    ).rejects.toBeInstanceOf(RpcException);
  });
});

describe('trimHistory', () => {
  it('never starts the window on a tool result', () => {
    const msgs: AiChatMessage[] = [
      { role: 'user', content: 'u1' },
      { role: 'assistant', content: '', toolCalls: [{ id: 't', name: 'x', input: {} }] },
      { role: 'tool', toolCallId: 't', toolName: 'x', content: '{}' },
      { role: 'assistant', content: 'a1' },
      { role: 'user', content: 'u2' },
      { role: 'assistant', content: 'a2' },
    ];
    expect(trimHistory(msgs, 4)).toEqual(msgs.slice(4));
  });
});
