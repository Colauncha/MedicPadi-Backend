import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  AuthRole,
  CreateDrugRequisitionDto,
  OrderPatterns,
  PharmacyPatterns,
  RequisitionStatus,
  ServicePatterns,
} from '@medicpadi-backend/contracts';
import { AgentRpcService } from './agent-rpc.service';
import { assertOwnedByPatient, formatNaira, toNumber } from './helpers';
import { drugOrderView, paginated } from './projections';
import { ReadTool, ToolContext, ToolError, WriteTool } from './tool.types';

/** Mirrors the orders-service cancellable states (DrugRequisitionService.remove). */
const CANCELLABLE = [
  RequisitionStatus.PENDING,
  RequisitionStatus.ACCEPTED,
  RequisitionStatus.PROCESSING,
];

class ListDrugOrdersArgs {
  @IsOptional()
  @IsEnum(RequisitionStatus)
  status?: RequisitionStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;
}

class DrugOrderIdArgs {
  @IsUUID()
  order_id!: string;
}

class DrugOrderItemArgs {
  @IsUUID()
  pharmacy_drug_id!: string;

  @IsInt()
  @Min(1)
  @Max(100)
  quantity!: number;
}

class CreateDrugOrderArgs {
  @IsUUID()
  pharmacy_id!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => DrugOrderItemArgs)
  items!: DrugOrderItemArgs[];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  delivery_address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

const idSchema = {
  type: 'object' as const,
  properties: { order_id: { type: 'string', format: 'uuid' } },
  required: ['order_id'],
};

export function drugOrderTools(rpc: AgentRpcService) {
  const getOwned = async (ctx: ToolContext, id: string) =>
    assertOwnedByPatient(
      await rpc.send('orders', OrderPatterns.DRUG_REQUISITIONS.RETRIEVE, id),
      ctx.userId,
      'Drug order',
    );

  const listMine: ReadTool<ListDrugOrdersArgs> = {
    kind: 'read',
    argsType: ListDrugOrdersArgs,
    definition: {
      name: 'list_my_drug_orders',
      description: "List the patient's drug orders, newest first.",
      inputSchema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: Object.values(RequisitionStatus) },
          page: { type: 'integer', minimum: 1 },
        },
      },
    },
    async execute(ctx, args) {
      const res = await rpc.send('orders', OrderPatterns.DRUG_REQUISITIONS.FIND_ALL, {
        id: ctx.userId,
        status: args.status,
        page: args.page ?? 1,
        limit: 10,
      });
      return paginated(res, drugOrderView, (r) => r['patient_id'] === ctx.userId);
    },
  };

  const getOne: ReadTool<DrugOrderIdArgs> = {
    kind: 'read',
    argsType: DrugOrderIdArgs,
    definition: {
      name: 'get_drug_order',
      description: 'Get details and items of one of the patient’s drug orders.',
      inputSchema: idSchema,
    },
    async execute(ctx, args) {
      return drugOrderView(await getOwned(ctx, args.order_id));
    },
  };

  const create: WriteTool<CreateDrugOrderArgs, CreateDrugRequisitionDto> = {
    kind: 'write',
    argsType: CreateDrugOrderArgs,
    definition: {
      name: 'create_drug_order',
      description:
        'Order over-the-counter drugs from one pharmacy. Prices and names are taken from the pharmacy catalogue. Drugs that require a prescription cannot be ordered here. Requires confirmation; returns a payment link.',
      inputSchema: {
        type: 'object',
        properties: {
          pharmacy_id: { type: 'string', format: 'uuid' },
          items: {
            type: 'array',
            minItems: 1,
            maxItems: 20,
            items: {
              type: 'object',
              properties: {
                pharmacy_drug_id: { type: 'string', format: 'uuid' },
                quantity: { type: 'integer', minimum: 1, maximum: 100 },
              },
              required: ['pharmacy_drug_id', 'quantity'],
            },
          },
          delivery_address: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['pharmacy_id', 'items'],
      },
    },
    async prepare(ctx, args) {
      const pharmacy = await rpc.send('profile', PharmacyPatterns.RETRIEVE, args.pharmacy_id);
      if (!pharmacy) throw new ToolError('Pharmacy not found');

      // Merge duplicate lines so quantities and stock checks are accurate.
      const quantities = new Map<string, number>();
      for (const item of args.items) {
        quantities.set(
          item.pharmacy_drug_id,
          (quantities.get(item.pharmacy_drug_id) ?? 0) + item.quantity,
        );
      }

      const items: CreateDrugRequisitionDto['items'] = [];
      for (const [drugId, quantity] of quantities) {
        const drug = await rpc.send(
          'services',
          ServicePatterns.PHARMCY_DRUGS.RETRIEVE,
          drugId,
        );
        if (!drug || drug.user_id !== args.pharmacy_id) {
          throw new ToolError(`Drug ${drugId} is not sold by this pharmacy`);
        }
        if (drug.available === false) {
          throw new ToolError(`${drug.name} is currently unavailable`);
        }
        if (drug.requiresPrescription) {
          throw new ToolError(
            `${drug.name} requires a prescription and can't be ordered through the assistant`,
          );
        }
        if (typeof drug.stock === 'number' && drug.stock < quantity) {
          throw new ToolError(`Only ${drug.stock} of ${drug.name} in stock`);
        }
        items.push({
          pharmacy_drug_id: drug.id,
          medication_name: drug.name,
          quantity,
          unit_price: toNumber(drug.price),
          requiresPrescription: false,
        });
      }

      const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
      const delivery = toNumber(pharmacy.deliveryCost);
      const lines = items
        .map((i) => `${i.quantity} × ${i.medication_name} @ ${formatNaira(i.unit_price)}`)
        .join('; ');

      return {
        summary:
          `Order from ${pharmacy.name ?? 'the pharmacy'}: ${lines}. ` +
          `Subtotal ${formatNaira(subtotal)} + delivery ${formatNaira(delivery)} = ${formatNaira(subtotal + delivery)}` +
          `${args.delivery_address ? `, deliver to ${args.delivery_address}` : ''}. A payment link will be generated.`,
        payload: {
          patient_id: ctx.userId,
          pharmacy_id: args.pharmacy_id,
          items,
          ...(args.delivery_address ? { delivery_address: args.delivery_address } : {}),
          ...(args.notes ? { notes: args.notes } : {}),
        },
      };
    },
    async execute(_ctx, payload) {
      const res = await rpc.send('orders', OrderPatterns.DRUG_REQUISITIONS.CREATE, payload);
      return {
        order: drugOrderView(res),
        payment: res?.tranx
          ? {
              authorization_url: res.tranx.authorization_url,
              reference: res.tranx.reference,
            }
          : undefined,
      };
    },
  };

  const cancel: WriteTool<DrugOrderIdArgs, { id: string }> = {
    kind: 'write',
    argsType: DrugOrderIdArgs,
    definition: {
      name: 'cancel_drug_order',
      description:
        'Cancel one of the patient’s drug orders (only while pending, accepted or processing). Escrowed payments are refunded. Requires confirmation.',
      inputSchema: idSchema,
    },
    async prepare(ctx, args) {
      const order = await getOwned(ctx, args.order_id);
      if (!CANCELLABLE.includes(order.status)) {
        throw new ToolError(`This order is ${order.status} and can no longer be cancelled`);
      }
      return {
        summary: `Cancel drug order of ${formatNaira(toNumber(order.total_amount))} (status: ${order.status}). Any escrowed payment will be refunded.`,
        payload: { id: order.id },
      };
    },
    async execute(ctx, payload) {
      return rpc.send('orders', OrderPatterns.DRUG_REQUISITIONS.DELETE, {
        id: payload.id,
        userId: ctx.userId,
        role: AuthRole.PATIENT,
      });
    },
  };

  const confirmReceived: WriteTool<DrugOrderIdArgs, { id: string }> = {
    kind: 'write',
    argsType: DrugOrderIdArgs,
    definition: {
      name: 'confirm_drug_received',
      description:
        'Confirm the patient has received a drug order, which releases payment to the pharmacy. Requires confirmation.',
      inputSchema: idSchema,
    },
    async prepare(ctx, args) {
      const order = await getOwned(ctx, args.order_id);
      return {
        summary: `Confirm you received drug order of ${formatNaira(toNumber(order.total_amount))} (releases payment to the pharmacy).`,
        payload: { id: order.id },
      };
    },
    async execute(ctx, payload) {
      const res = await rpc.send('orders', OrderPatterns.DRUG_REQUISITIONS.PATIENT_RECEIVE, {
        id: payload.id,
        userId: ctx.userId,
        role: AuthRole.PATIENT,
      });
      return res && typeof res === 'object' ? drugOrderView(res) : res;
    },
  };

  return [listMine, getOne, create, cancel, confirmReceived];
}
