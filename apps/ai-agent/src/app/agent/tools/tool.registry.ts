import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { AiToolDefinition } from '../../providers/ai-provider.interface';
import { INVALID_TOOL_ARGS } from '../../providers/openai.adapter';
import { AgentRpcService } from './agent-rpc.service';
import { appointmentTools } from './appointment.tools';
import { directoryTools } from './directory.tools';
import { drugOrderTools } from './drug-order.tools';
import { testRequisitionTools } from './test-requisition.tools';
import { AgentTool, ToolError } from './tool.types';

function flattenErrors(errors: ValidationError[], prefix = ''): string[] {
  return errors.flatMap((e) => {
    const path = prefix ? `${prefix}.${e.property}` : e.property;
    const own = Object.values(e.constraints ?? {}).map((m) =>
      prefix ? `${path}: ${m}` : m,
    );
    return [...own, ...flattenErrors(e.children ?? [], path)];
  });
}

@Injectable()
export class ToolRegistry {
  private readonly tools = new Map<string, AgentTool>();

  constructor(rpc: AgentRpcService) {
    for (const tool of [
      ...directoryTools(rpc),
      ...appointmentTools(rpc),
      ...drugOrderTools(rpc),
      ...testRequisitionTools(rpc),
    ] as AgentTool[]) {
      this.tools.set(tool.definition.name, tool);
    }
  }

  definitions(): AiToolDefinition[] {
    return [...this.tools.values()].map((t) => t.definition);
  }

  get(name: string): AgentTool {
    const tool = this.tools.get(name);
    if (!tool) throw new ToolError(`Unknown tool "${name}"`);
    return tool;
  }

  /** Validates raw model input against the tool's DTO. Throws ToolError on failure. */
  async parseArgs<A extends object>(tool: AgentTool, input: unknown): Promise<A> {
    if (
      !input ||
      typeof input !== 'object' ||
      Array.isArray(input) ||
      INVALID_TOOL_ARGS in input
    ) {
      throw new ToolError('Tool arguments must be a valid JSON object');
    }
    const instance = plainToInstance(tool.argsType, input) as A;
    const errors = await validate(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length) {
      throw new ToolError(`Invalid arguments: ${flattenErrors(errors).join('; ')}`);
    }
    return instance;
  }
}
