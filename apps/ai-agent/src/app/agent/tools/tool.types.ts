import { AiToolDefinition } from '../../providers/ai-provider.interface';

export interface ToolContext {
  /** Authenticated patient's user ID — always injected by the gateway, never by the model. */
  userId: string;
}

/** An error whose message is safe to show to the model / patient. */
export class ToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolError';
  }
}

export type ClassType<T> = new () => T;

interface BaseTool<A extends object> {
  definition: AiToolDefinition;
  /** class-validator DTO the model's input is validated against. */
  argsType: ClassType<A>;
}

export interface ReadTool<A extends object = object> extends BaseTool<A> {
  kind: 'read';
  execute(ctx: ToolContext, args: A): Promise<unknown>;
}

export interface PreparedAction<P = unknown> {
  /** Human-readable summary shown to the patient for confirmation. */
  summary: string;
  /** Fully resolved, server-built payload executed on confirmation. */
  payload: P;
}

export interface WriteTool<A extends object = object, P = unknown>
  extends BaseTool<A> {
  kind: 'write';
  /**
   * Validates ownership/state and resolves server-side data (prices, names).
   * Runs before the patient is asked to confirm; must not mutate anything.
   */
  prepare(ctx: ToolContext, args: A): Promise<PreparedAction<P>>;
  /** Performs the mutation with the payload produced by `prepare`. */
  execute(ctx: ToolContext, payload: P): Promise<unknown>;
}

export type AgentTool = ReadTool<any> | WriteTool<any, any>;
