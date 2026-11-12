import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import {
  AgentActionDto,
  AgentActionResultView,
  AgentMessageDto,
  AgentPendingActionView,
  AgentSessionQueryDto,
  AgentSessionView,
  AgentTurnResult,
  ServiceError,
} from '@medicpadi-backend/contracts';
import {
  AI_PROVIDER,
  AiChatMessage,
  IAiProvider,
} from '../providers/ai-provider.interface';
import {
  AgentSession,
  AgentSessionStore,
  PENDING_ACTION_TTL_SECONDS,
  PendingAction,
  PendingActionMeta,
} from './session.store';
import { rpcErrorMessage } from './tools/agent-rpc.service';
import { AGENT_TIMEZONE, formatDateTime } from './tools/helpers';
import { ToolRegistry } from './tools/tool.registry';
import { ToolContext, ToolError } from './tools/tool.types';

/** Max model round-trips per patient turn. */
export const MAX_AGENT_STEPS = 8;
/** Prefix for server-authored notes injected into the conversation. */
export const SYSTEM_NOTE_PREFIX = '[System note]';

function buildSystemPrompt(now = new Date()): string {
  return `You are MedicPadi's patient assistant. You help a signed-in patient manage their own:
- doctor appointments (find doctors, book, reschedule, cancel, confirm a consultation took place),
- drug orders from pharmacies (find drugs, order over-the-counter drugs, track, cancel, confirm delivery),
- lab test requisitions (find labs and tests, request tests, track results, cancel).

Rules:
- Always use tools to look things up. Never invent IDs, prices, availability, names or statuses.
- Resolve doctors, pharmacies, drugs, labs and tests with the search tools before proposing an action.
- If required details are missing or ambiguous (which doctor, what time, which pharmacy, quantity), ask the patient a short question instead of guessing.
- Actions that change something (booking, ordering, cancelling, confirming) are only proposed: the patient must confirm them in the app. Propose one action at a time. Never claim an action is done until you receive its result.
- Times: the current date/time is ${formatDateTime(now)} (${AGENT_TIMEZONE}, UTC+01:00). Convert relative times like "tomorrow at 3pm" to ISO 8601 with the +01:00 offset. Respect the doctor's businessHours when suggesting times.
- Drugs that require a prescription cannot be ordered here; tell the patient to get a prescription from a doctor.
- You do not diagnose or prescribe. For urgent symptoms, advise contacting emergency services or a doctor immediately.
- Keep replies short and clear. Amounts are in Naira (₦).
- Messages starting with "${SYSTEM_NOTE_PREFIX}" come from the MedicPadi server, not the patient.`;
}

function toPendingView(meta?: PendingActionMeta): AgentPendingActionView | undefined {
  return meta
    ? { id: meta.id, tool: meta.tool, summary: meta.summary, expiresAt: meta.expiresAt }
    : undefined;
}

function serviceError(statusCode: HttpStatus, message: string) {
  return new RpcException({ statusCode, message } as ServiceError);
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    @Inject(AI_PROVIDER) private readonly aiProvider: IAiProvider,
    private readonly tools: ToolRegistry,
    private readonly sessions: AgentSessionStore,
  ) {}

  // ──────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────

  async message(dto: AgentMessageDto): Promise<AgentTurnResult> {
    const session = await this.loadOrCreateSession(dto.userId, dto.sessionId);

    let content = dto.message;
    if (session.pendingAction) {
      // A new message instead of confirming means the proposal is abandoned.
      await this.sessions.discardPendingAction(session);
      content = `${SYSTEM_NOTE_PREFIX} The previously proposed action was not confirmed and has been discarded.\n\n${content}`;
    }
    session.messages.push({ role: 'user', content });

    return this.runTurn(session);
  }

  async confirmAction(dto: AgentActionDto): Promise<AgentTurnResult> {
    const session = await this.requireSession(dto.userId, dto.sessionId);
    const action = await this.sessions.takePendingAction(
      dto.userId,
      dto.sessionId,
      dto.actionId,
    );
    if (!action) {
      throw serviceError(
        HttpStatus.GONE,
        'This action has expired or was already handled. Please ask again.',
      );
    }
    if (session.pendingAction?.id === action.id) delete session.pendingAction;

    const actionResult = await this.executeAction({ userId: dto.userId }, action);
    const note: AiChatMessage = {
      role: 'user',
      content: actionResult.success
        ? `${SYSTEM_NOTE_PREFIX} The patient confirmed "${action.summary}". It succeeded. Result: ${JSON.stringify(actionResult.data ?? {})}. Tell the patient the outcome, including any payment link.`
        : `${SYSTEM_NOTE_PREFIX} The patient confirmed "${action.summary}", but it failed: ${actionResult.error}. Explain this to the patient and suggest what to do next.`,
    };
    session.messages.push(note);

    try {
      const turn = await this.runTurn(session);
      return { ...turn, actionResult };
    } catch {
      // The action already ran — never lose its outcome because the model failed.
      const reply = actionResult.success
        ? `Done: ${action.summary}`
        : `That didn't go through: ${actionResult.error}`;
      session.messages.push(note, { role: 'assistant', content: reply });
      await this.sessions.save(session);
      return { sessionId: session.id, reply, actionResult };
    }
  }

  async rejectAction(dto: AgentActionDto): Promise<AgentTurnResult> {
    const session = await this.requireSession(dto.userId, dto.sessionId);
    const action = await this.sessions.takePendingAction(
      dto.userId,
      dto.sessionId,
      dto.actionId,
    );
    if (!action) {
      throw serviceError(
        HttpStatus.GONE,
        'This action has expired or was already handled.',
      );
    }
    if (session.pendingAction?.id === action.id) delete session.pendingAction;

    const reply = "Okay, I haven't done that. Is there anything you'd like to change?";
    session.messages.push(
      {
        role: 'user',
        content: `${SYSTEM_NOTE_PREFIX} The patient declined "${action.summary}". Nothing was changed.`,
      },
      { role: 'assistant', content: reply },
    );
    await this.sessions.save(session);
    return { sessionId: session.id, reply };
  }

  async getSession(dto: AgentSessionQueryDto): Promise<AgentSessionView> {
    const session = await this.requireSession(dto.userId, dto.sessionId);
    const messages: AgentSessionView['messages'] = [];
    for (const m of session.messages) {
      if (m.role === 'tool' || !m.content) continue;
      if (m.role === 'user') {
        // Strip server notes; keep the patient's own text if any follows.
        const text = m.content.startsWith(SYSTEM_NOTE_PREFIX)
          ? m.content.split('\n\n').slice(1).join('\n\n')
          : m.content;
        if (text) messages.push({ role: 'user', content: text });
      } else {
        messages.push({ role: 'assistant', content: m.content });
      }
    }
    return {
      sessionId: session.id,
      messages,
      pendingAction: toPendingView(session.pendingAction),
    };
  }

  // ──────────────────────────────────────────────
  // Agent loop
  // ──────────────────────────────────────────────

  private async runTurn(session: AgentSession): Promise<AgentTurnResult> {
    const ctx: ToolContext = { userId: session.userId };
    const systemPrompt = buildSystemPrompt();
    const toolDefs = this.tools.definitions();
    let reply: string | undefined;
    let proposed: PendingAction | undefined;

    try {
      for (let step = 0; step < MAX_AGENT_STEPS && reply === undefined; step++) {
        const res = await this.aiProvider.chat(session.messages, {
          tools: toolDefs,
          systemPrompt,
        });
        session.messages.push({
          role: 'assistant',
          content: res.text,
          ...(res.toolCalls.length ? { toolCalls: res.toolCalls } : {}),
        });

        if (!res.toolCalls.length) {
          reply = res.text || 'Sorry, I could not come up with a response. Could you rephrase?';
          break;
        }

        for (const call of res.toolCalls) {
          const outcome = await this.handleToolCall(ctx, session, call, !!proposed);
          if (outcome.proposed) proposed = outcome.proposed;
          session.messages.push(outcome.message);
        }

        if (proposed) {
          // Stop and hand control to the patient for confirmation.
          reply = `${res.text ? `${res.text}\n\n` : ''}Please confirm: ${proposed.summary}`;
          session.messages.push({ role: 'assistant', content: reply });
        }
      }

      if (reply === undefined) {
        reply =
          "Sorry, I couldn't finish that request. Could you break it into smaller steps?";
        session.messages.push({ role: 'assistant', content: reply });
      }
    } catch (error) {
      this.logger.error('Agent turn failed', error);
      // Drop the half-finished turn so the stored history stays valid.
      await this.discardIncompleteTurn(session);
      throw serviceError(
        HttpStatus.BAD_GATEWAY,
        'The assistant is temporarily unavailable. Please try again.',
      );
    }

    await this.sessions.save(session);
    return {
      sessionId: session.id,
      reply,
      pendingAction: toPendingView(session.pendingAction),
    };
  }

  private async handleToolCall(
    ctx: ToolContext,
    session: AgentSession,
    call: { id: string; name: string; input: Record<string, unknown> },
    alreadyProposed: boolean,
  ): Promise<{ message: AiChatMessage; proposed?: PendingAction }> {
    const toolResult = (content: string, isError = false): AiChatMessage => ({
      role: 'tool',
      toolCallId: call.id,
      toolName: call.name,
      content,
      ...(isError ? { isError: true } : {}),
    });

    try {
      const tool = this.tools.get(call.name);
      const args = await this.tools.parseArgs(tool, call.input);

      if (tool.kind === 'read') {
        const data = await tool.execute(ctx, args);
        return { message: toolResult(JSON.stringify(data ?? null)) };
      }

      if (alreadyProposed) {
        return {
          message: toolResult(
            'Only one action can be proposed at a time. Wait for the patient to confirm the current one.',
            true,
          ),
        };
      }

      const prepared = await tool.prepare(ctx, args);
      const now = Date.now();
      const action: PendingAction = {
        id: randomUUID(),
        tool: tool.definition.name,
        summary: prepared.summary,
        payload: prepared.payload,
        toolCallId: call.id,
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + PENDING_ACTION_TTL_SECONDS * 1000).toISOString(),
      };
      await this.sessions.putPendingAction(session, action);
      return {
        proposed: action,
        message: toolResult(
          `Not executed yet. Awaiting the patient's confirmation in the app. Summary shown to the patient: ${prepared.summary}`,
        ),
      };
    } catch (error) {
      if (!(error instanceof ToolError)) {
        this.logger.error(`Tool ${call.name} failed`, error);
      }
      return { message: toolResult(rpcErrorMessage(error), true) };
    }
  }

  private async executeAction(
    ctx: ToolContext,
    action: PendingAction,
  ): Promise<AgentActionResultView> {
    const base = { actionId: action.id, tool: action.tool };
    try {
      const tool = this.tools.get(action.tool);
      if (tool.kind !== 'write') throw new ToolError('Invalid action');
      const data = await tool.execute(ctx, action.payload);
      this.logger.log(`Agent action ${action.tool} executed for user ${ctx.userId}`);
      return { ...base, success: true, data };
    } catch (error) {
      if (!(error instanceof ToolError)) {
        this.logger.error(`Agent action ${action.tool} failed`, error);
      }
      return { ...base, success: false, error: rpcErrorMessage(error) };
    }
  }

  // ──────────────────────────────────────────────
  // Session helpers
  // ──────────────────────────────────────────────

  private async loadOrCreateSession(
    userId: string,
    sessionId?: string,
  ): Promise<AgentSession> {
    if (sessionId) return this.requireSession(userId, sessionId);
    const now = new Date().toISOString();
    return {
      id: randomUUID(),
      userId,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  private async requireSession(userId: string, sessionId: string) {
    const session = await this.sessions.get(userId, sessionId);
    if (!session) {
      throw serviceError(
        HttpStatus.NOT_FOUND,
        'Conversation not found or expired. Please start a new one.',
      );
    }
    return session;
  }

  /**
   * After a provider failure, roll the history back to the last complete
   * exchange and drop any action proposed during the failed turn.
   */
  private async discardIncompleteTurn(session: AgentSession) {
    let lastUser = -1;
    for (let i = session.messages.length - 1; i >= 0; i--) {
      if (session.messages[i].role === 'user') {
        lastUser = i;
        break;
      }
    }
    if (lastUser >= 0) session.messages = session.messages.slice(0, lastUser);
    try {
      await this.sessions.discardPendingAction(session);
      if (session.messages.length) await this.sessions.save(session);
    } catch (e) {
      this.logger.warn(`Could not persist rolled-back session: ${String(e)}`);
    }
  }
}
