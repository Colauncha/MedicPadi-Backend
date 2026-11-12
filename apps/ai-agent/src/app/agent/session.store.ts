import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '@medicpadi-backend/utils';
import { AiChatMessage } from '../providers/ai-provider.interface';

/** Metadata about the action awaiting confirmation (kept on the session). */
export interface PendingActionMeta {
  id: string;
  tool: string;
  summary: string;
  /** The tool call that produced this action. */
  toolCallId: string;
  createdAt: string;
  expiresAt: string;
}

/** Full action, stored under its own short-lived key. */
export interface PendingAction extends PendingActionMeta {
  /** Server-resolved payload produced by the tool's `prepare`. */
  payload: unknown;
}

export interface AgentSession {
  id: string;
  userId: string;
  messages: AiChatMessage[];
  pendingAction?: PendingActionMeta;
  createdAt: string;
  updatedAt: string;
}

export const MAX_SESSION_MESSAGES = 30;
export const PENDING_ACTION_TTL_SECONDS = 600;
const DEFAULT_SESSION_TTL_SECONDS = 1800;

/** Atomic GET + DEL that works on any Redis version (GETDEL needs 6.2+). */
const TAKE_SCRIPT = `
local v = redis.call('GET', KEYS[1])
if v then redis.call('DEL', KEYS[1]) end
return v
`;

/**
 * Keeps at most `max` messages, always starting the window on a plain user
 * message so assistant tool calls and their tool results are never split
 * (providers reject orphaned tool results).
 */
export function trimHistory(
  messages: AiChatMessage[],
  max = MAX_SESSION_MESSAGES,
): AiChatMessage[] {
  if (messages.length <= max) return messages;
  let start = messages.length - max;
  while (start < messages.length && messages[start].role !== 'user') start++;
  return messages.slice(start);
}

@Injectable()
export class AgentSessionStore {
  private readonly ttlSeconds: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    configService: ConfigService,
  ) {
    this.ttlSeconds =
      configService.get<number>('appConfig.agentSessionTtl') ??
      DEFAULT_SESSION_TTL_SECONDS;
  }

  // userId is part of every key so data can only be loaded by its owner.
  private sessionKey(userId: string, sessionId: string) {
    return `ai:agent:session:${userId}:${sessionId}`;
  }

  private actionKey(userId: string, sessionId: string, actionId: string) {
    return `ai:agent:action:${userId}:${sessionId}:${actionId}`;
  }

  async get(userId: string, sessionId: string): Promise<AgentSession | null> {
    const raw = await this.redis.get(this.sessionKey(userId, sessionId));
    if (!raw) return null;
    try {
      const session = JSON.parse(raw) as AgentSession;
      return session.userId === userId ? session : null;
    } catch {
      return null;
    }
  }

  async save(session: AgentSession): Promise<void> {
    session.messages = trimHistory(session.messages);
    session.updatedAt = new Date().toISOString();
    await this.redis.set(
      this.sessionKey(session.userId, session.id),
      JSON.stringify(session),
      'EX',
      this.ttlSeconds,
    );
  }

  /** Stores a new pending action, invalidating any previous one in the session. */
  async putPendingAction(session: AgentSession, action: PendingAction) {
    if (session.pendingAction) {
      await this.discardPendingAction(session);
    }
    await this.redis.set(
      this.actionKey(session.userId, session.id, action.id),
      JSON.stringify(action),
      'EX',
      PENDING_ACTION_TTL_SECONDS,
    );
    const { payload: _payload, ...meta } = action;
    session.pendingAction = meta;
  }

  async discardPendingAction(session: AgentSession) {
    if (!session.pendingAction) return;
    await this.redis.del(
      this.actionKey(session.userId, session.id, session.pendingAction.id),
    );
    delete session.pendingAction;
  }

  /**
   * Atomically removes and returns a pending action. Returns null if it never
   * existed, expired, or was already confirmed/rejected — so it runs at most once.
   */
  async takePendingAction(
    userId: string,
    sessionId: string,
    actionId: string,
  ): Promise<PendingAction | null> {
    const raw = (await this.redis.eval(
      TAKE_SCRIPT,
      1,
      this.actionKey(userId, sessionId, actionId),
    )) as string | null;
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PendingAction;
    } catch {
      return null;
    }
  }
}
