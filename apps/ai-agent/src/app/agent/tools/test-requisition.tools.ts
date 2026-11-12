import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import {
  CreateTestRequisitionDto,
  LaboratoryPatterns,
  OrderPatterns,
  PaymentStatus,
  RequisitionStatus,
  ServicePatterns,
} from '@medicpadi-backend/contracts';
import { AgentRpcService } from './agent-rpc.service';
import { assertOwnedByPatient, formatNaira, toNumber } from './helpers';
import { paginated, testRequisitionView } from './projections';
import { ReadTool, ToolContext, ToolError, WriteTool } from './tool.types';

class ListTestRequisitionsArgs {
  @IsOptional()
  @IsEnum(RequisitionStatus)
  status?: RequisitionStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;
}

class TestRequisitionIdArgs {
  @IsUUID()
  requisition_id!: string;
}

class CreateTestRequisitionArgs {
  @IsUUID()
  lab_id!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  lab_test_ids!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

const idSchema = {
  type: 'object' as const,
  properties: { requisition_id: { type: 'string', format: 'uuid' } },
  required: ['requisition_id'],
};

/**
 * The orders-service DELETE hard-deletes regardless of state, so the agent
 * only lets patients cancel requisitions the lab hasn't acted on or been paid for.
 */
function assertCancellable(req: any) {
  const paid = [PaymentStatus.ESCROW, PaymentStatus.PAID].includes(req.payment_status);
  if (req.status !== RequisitionStatus.PENDING || paid) {
    throw new ToolError(
      `This test requisition is ${req.status}${paid ? ' and paid' : ''}; please contact the lab or support to cancel it`,
    );
  }
}

export function testRequisitionTools(rpc: AgentRpcService) {
  const getOwned = async (ctx: ToolContext, id: string) =>
    assertOwnedByPatient(
      await rpc.send('orders', OrderPatterns.TEST_REQUISITIONS.RETRIEVE, id),
      ctx.userId,
      'Test requisition',
    );

  const listMine: ReadTool<ListTestRequisitionsArgs> = {
    kind: 'read',
    argsType: ListTestRequisitionsArgs,
    definition: {
      name: 'list_my_test_requisitions',
      description: "List the patient's lab test requisitions, newest first.",
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: Object.values(RequisitionStatus) },
          page: { type: 'integer', minimum: 1 },
        },
      },
    },
    async execute(ctx, args) {
      const res = await rpc.send('orders', OrderPatterns.TEST_REQUISITIONS.FIND_ALL, {
        id: ctx.userId,
        status: args.status,
        page: args.page ?? 1,
        limit: 10,
      });
      return paginated(res, testRequisitionView, (r) => r['patient_id'] === ctx.userId);
    },
  };

  const getOne: ReadTool<TestRequisitionIdArgs> = {
    kind: 'read',
    argsType: TestRequisitionIdArgs,
    definition: {
      name: 'get_test_requisition',
      description:
        'Get details, tests and any available results of one of the patient’s test requisitions.',
      inputSchema: idSchema,
    },
    async execute(ctx, args) {
      return testRequisitionView(await getOwned(ctx, args.requisition_id));
    },
  };

  const create: WriteTool<CreateTestRequisitionArgs, CreateTestRequisitionDto> = {
    kind: 'write',
    argsType: CreateTestRequisitionArgs,
    definition: {
      name: 'create_test_requisition',
      description:
        'Request one or more lab tests from a single laboratory. Prices come from the lab catalogue. Requires confirmation; the lab must accept before a payment link is sent.',
      inputSchema: {
        type: 'object',
        properties: {
          lab_id: { type: 'string', format: 'uuid' },
          lab_test_ids: {
            type: 'array',
            minItems: 1,
            maxItems: 20,
            items: { type: 'string', format: 'uuid' },
          },
          notes: { type: 'string' },
        },
        required: ['lab_id', 'lab_test_ids'],
      },
    },
    async prepare(ctx, args) {
      const lab = await rpc.send('profile', LaboratoryPatterns.RETRIEVE, args.lab_id);
      if (!lab) throw new ToolError('Laboratory not found');

      const items: CreateTestRequisitionDto['items'] = [];
      for (const testId of args.lab_test_ids) {
        const test = await rpc.send('services', ServicePatterns.LAB_TESTS.RETRIEVE, testId);
        if (!test || test.user_id !== args.lab_id) {
          throw new ToolError(`Test ${testId} is not offered by this laboratory`);
        }
        if (test.available === false) {
          throw new ToolError(`${test.name} is currently unavailable`);
        }
        items.push({
          lab_test_id: test.id,
          test_name: test.name,
          unit_price: toNumber(test.price),
        });
      }

      const total = items.reduce((s, i) => s + i.unit_price, 0);
      return {
        summary:
          `Request from ${lab.name ?? 'the laboratory'}: ` +
          items.map((i) => `${i.test_name} (${formatNaira(i.unit_price)})`).join(', ') +
          `. Total ${formatNaira(total)}; a payment link is sent once the lab accepts.`,
        payload: {
          patient_id: ctx.userId,
          lab_id: args.lab_id,
          items,
          ...(args.notes ? { notes: args.notes } : {}),
        },
      };
    },
    async execute(_ctx, payload) {
      const res = await rpc.send('orders', OrderPatterns.TEST_REQUISITIONS.CREATE, payload);
      return testRequisitionView(res ?? {});
    },
  };

  const cancel: WriteTool<TestRequisitionIdArgs, { id: string }> = {
    kind: 'write',
    argsType: TestRequisitionIdArgs,
    definition: {
      name: 'cancel_test_requisition',
      description:
        'Cancel one of the patient’s test requisitions that the lab has not yet accepted. Requires confirmation.',
      inputSchema: idSchema,
    },
    async prepare(ctx, args) {
      const req = await getOwned(ctx, args.requisition_id);
      assertCancellable(req);
      return {
        summary: `Cancel test requisition of ${formatNaira(toNumber(req.total_amount))} (${(req.items ?? []).map((i: any) => i.test_name).join(', ') || 'tests'}).`,
        payload: { id: req.id },
      };
    },
    async execute(ctx, payload) {
      // Re-check: the lab may have accepted between prepare and confirmation,
      // and the orders DELETE performs no ownership/state checks itself.
      assertCancellable(await getOwned(ctx, payload.id));
      return rpc.send('orders', OrderPatterns.TEST_REQUISITIONS.DELETE, payload.id);
    },
  };

  return [listMine, getOne, create, cancel];
}
