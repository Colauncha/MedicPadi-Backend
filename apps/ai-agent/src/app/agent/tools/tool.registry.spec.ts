import {
  DoctorPatterns,
  LaboratoryPatterns,
  OrderPatterns,
  PaymentStatus,
  PharmacyPatterns,
  RequisitionStatus,
  ServicePatterns,
} from '@medicpadi-backend/contracts';
import { AgentRpcService } from './agent-rpc.service';
import { ToolRegistry } from './tool.registry';
import { ReadTool, ToolError, WriteTool } from './tool.types';

const PATIENT = '11111111-1111-4111-8111-111111111111';
const OTHER_PATIENT = '22222222-2222-4222-8222-222222222222';
const PHARMACY = '33333333-3333-4333-8333-333333333333';
const OTHER_PHARMACY = '44444444-4444-4444-8444-444444444444';
const DRUG = '55555555-5555-4555-8555-555555555555';
const RX_DRUG = '66666666-6666-4666-8666-666666666666';
const LAB = '77777777-7777-4777-8777-777777777777';
const TEST = '88888888-8888-4888-8888-888888888888';
const REQ = '99999999-9999-4999-8999-999999999999';
const DOCTOR = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ctx = { userId: PATIENT };

type Handler = (data: any) => any;

function makeRpc(handlers: Record<string, Handler>) {
  const send = jest.fn(async (_target: string, pattern: string, data: any) => {
    const h = handlers[pattern];
    if (!h) throw new ToolError(`no handler for ${pattern}`);
    return h(data);
  });
  return { rpc: { send } as unknown as AgentRpcService, send };
}

const catalog: Handler = (id) =>
  ({
    [DRUG]: {
      id: DRUG,
      user_id: PHARMACY,
      name: 'Paracetamol 500mg',
      price: 250,
      available: true,
      stock: 50,
      requiresPrescription: false,
    },
    [RX_DRUG]: {
      id: RX_DRUG,
      user_id: PHARMACY,
      name: 'Amoxicillin',
      price: 1200,
      available: true,
      requiresPrescription: true,
    },
  })[id] ?? null;

async function prepare(registry: ToolRegistry, name: string, input: unknown) {
  const tool = registry.get(name) as WriteTool<any, any>;
  const args = await registry.parseArgs(tool, input);
  return { tool, prepared: await tool.prepare(ctx, args) };
}

async function read(registry: ToolRegistry, name: string, input: unknown) {
  const tool = registry.get(name) as ReadTool<any>;
  return tool.execute(ctx, await registry.parseArgs(tool, input));
}

describe('ToolRegistry', () => {
  describe('argument validation', () => {
    const { rpc } = makeRpc({});
    const registry = new ToolRegistry(rpc);

    it('rejects unknown tools', () => {
      expect(() => registry.get('delete_everything')).toThrow(ToolError);
    });

    it('rejects extra properties such as patient_id', async () => {
      const tool = registry.get('list_my_appointments');
      await expect(
        registry.parseArgs(tool, { patient_id: OTHER_PATIENT }),
      ).rejects.toThrow(/patient_id should not exist/);
    });

    it('rejects invalid ids and nested items', async () => {
      const tool = registry.get('create_drug_order');
      await expect(
        registry.parseArgs(tool, {
          pharmacy_id: 'nope',
          items: [{ pharmacy_drug_id: DRUG, quantity: 0 }],
        }),
      ).rejects.toThrow(/pharmacy_id must be a UUID.*items\.0\.quantity/);
    });

    it('exposes a definition for every tool', () => {
      const names = registry.definitions().map((d) => d.name);
      expect(names).toEqual(
        expect.arrayContaining([
          'search_doctors',
          'book_appointment',
          'create_drug_order',
          'cancel_test_requisition',
        ]),
      );
      expect(new Set(names).size).toBe(names.length);
    });
  });

  describe('patient scoping', () => {
    it('lists only the patient’s own records and forces id=userId', async () => {
      const { rpc, send } = makeRpc({
        [OrderPatterns.APPOINTMENTS.FIND_ALL]: () => ({
          data: [
            { id: 'a1', patient_id: PATIENT, status: 'pending' },
            { id: 'a2', patient_id: OTHER_PATIENT, status: 'pending' },
          ],
          meta: { page: 1, total_pages: 1 },
        }),
      });
      const result: any = await read(new ToolRegistry(rpc), 'list_my_appointments', {});
      expect(send).toHaveBeenCalledWith(
        'orders',
        OrderPatterns.APPOINTMENTS.FIND_ALL,
        expect.objectContaining({ id: PATIENT }),
      );
      expect(result.results.map((r: any) => r.id)).toEqual(['a1']);
    });

    it('hides records owned by another patient', async () => {
      const { rpc } = makeRpc({
        [OrderPatterns.DRUG_REQUISITIONS.RETRIEVE]: () => ({
          id: REQ,
          patient_id: OTHER_PATIENT,
        }),
      });
      await expect(
        read(new ToolRegistry(rpc), 'get_drug_order', { order_id: REQ }),
      ).rejects.toThrow('Drug order not found');
    });

    it('strips sensitive appointment fields', async () => {
      const { rpc } = makeRpc({
        [OrderPatterns.APPOINTMENTS.RETRIEVE]: () => ({
          id: REQ,
          patient_id: PATIENT,
          status: 'scheduled',
          meeting_password: 'secret',
          join_link: 'https://zoom/j/1',
        }),
      });
      const result: any = await read(new ToolRegistry(rpc), 'get_appointment', {
        appointment_id: REQ,
      });
      expect(result).toEqual({ id: REQ, status: 'scheduled' });
    });
  });

  describe('book_appointment', () => {
    it('builds the payload with the authenticated patient id', async () => {
      const { rpc } = makeRpc({
        [DoctorPatterns.RETRIEVE]: () => ({
          user_id: DOCTOR,
          firstName: 'Ada',
          lastName: 'Obi',
          speciality: 'dermatologists',
          costPerSession: 5000,
          sessionLength: 45,
        }),
      });
      const future = new Date(Date.now() + 86_400_000).toISOString();
      const { prepared } = await prepare(new ToolRegistry(rpc), 'book_appointment', {
        doctor_id: DOCTOR,
        appointment_time: future,
        sessions: 2,
      });
      expect(prepared.payload).toEqual(
        expect.objectContaining({
          patient_id: PATIENT,
          provider_id: DOCTOR,
          sessions: 2,
          sessionLen: 45,
        }),
      );
      expect(prepared.summary).toContain('Dr Ada Obi');
      expect(prepared.summary).toContain('₦10,000');
    });

    it('refuses times in the past', async () => {
      const { rpc } = makeRpc({ [DoctorPatterns.RETRIEVE]: () => ({}) });
      await expect(
        prepare(new ToolRegistry(rpc), 'book_appointment', {
          doctor_id: DOCTOR,
          appointment_time: '2020-01-01T10:00:00+01:00',
        }),
      ).rejects.toThrow('must be in the future');
    });
  });

  describe('create_drug_order', () => {
    const handlers = {
      [PharmacyPatterns.RETRIEVE]: () => ({
        user_id: PHARMACY,
        name: 'MedPlus',
        deliveryCost: '1500',
      }),
      [ServicePatterns.PHARMCY_DRUGS.RETRIEVE]: catalog,
    };

    it('takes prices and names from the catalogue and merges duplicates', async () => {
      const { rpc } = makeRpc(handlers);
      const { prepared } = await prepare(new ToolRegistry(rpc), 'create_drug_order', {
        pharmacy_id: PHARMACY,
        items: [
          { pharmacy_drug_id: DRUG, quantity: 1 },
          { pharmacy_drug_id: DRUG, quantity: 2 },
        ],
      });
      expect(prepared.payload).toEqual({
        patient_id: PATIENT,
        pharmacy_id: PHARMACY,
        items: [
          {
            pharmacy_drug_id: DRUG,
            medication_name: 'Paracetamol 500mg',
            quantity: 3,
            unit_price: 250,
            requiresPrescription: false,
          },
        ],
      });
      // 3 × 250 + 1500 delivery
      expect(prepared.summary).toContain('₦2,250');
    });

    it('rejects prescription-only drugs', async () => {
      const { rpc } = makeRpc(handlers);
      await expect(
        prepare(new ToolRegistry(rpc), 'create_drug_order', {
          pharmacy_id: PHARMACY,
          items: [{ pharmacy_drug_id: RX_DRUG, quantity: 1 }],
        }),
      ).rejects.toThrow(/requires a prescription/);
    });

    it('rejects drugs from a different pharmacy', async () => {
      const { rpc } = makeRpc({
        ...handlers,
        [PharmacyPatterns.RETRIEVE]: () => ({ user_id: OTHER_PHARMACY }),
      });
      await expect(
        prepare(new ToolRegistry(rpc), 'create_drug_order', {
          pharmacy_id: OTHER_PHARMACY,
          items: [{ pharmacy_drug_id: DRUG, quantity: 1 }],
        }),
      ).rejects.toThrow(/not sold by this pharmacy/);
    });

    it('rejects quantities above stock', async () => {
      const { rpc } = makeRpc(handlers);
      await expect(
        prepare(new ToolRegistry(rpc), 'create_drug_order', {
          pharmacy_id: PHARMACY,
          items: [{ pharmacy_drug_id: DRUG, quantity: 51 }],
        }),
      ).rejects.toThrow(/Only 50/);
    });

    it('returns only the payment link fields on execution', async () => {
      const { rpc } = makeRpc({
        ...handlers,
        [OrderPatterns.DRUG_REQUISITIONS.CREATE]: (dto) => ({
          id: REQ,
          ...dto,
          total_amount: 2250,
          tranx: {
            authorization_url: 'https://paystack/abc',
            reference: 'ref1',
            access_code: 'secret',
          },
        }),
      });
      const { tool, prepared } = await prepare(new ToolRegistry(rpc), 'create_drug_order', {
        pharmacy_id: PHARMACY,
        items: [{ pharmacy_drug_id: DRUG, quantity: 1 }],
      });
      const result: any = await tool.execute(ctx, prepared.payload);
      expect(result.payment).toEqual({
        authorization_url: 'https://paystack/abc',
        reference: 'ref1',
      });
      expect(result.order).not.toHaveProperty('patient_id');
    });
  });

  describe('create_test_requisition', () => {
    it('resolves test names and prices from the lab catalogue', async () => {
      const { rpc } = makeRpc({
        [LaboratoryPatterns.RETRIEVE]: () => ({ user_id: LAB, name: 'LabCo' }),
        [ServicePatterns.LAB_TESTS.RETRIEVE]: () => ({
          id: TEST,
          user_id: LAB,
          name: 'Full Blood Count',
          price: 8000,
          available: true,
        }),
      });
      const { prepared } = await prepare(
        new ToolRegistry(rpc),
        'create_test_requisition',
        { lab_id: LAB, lab_test_ids: [TEST] },
      );
      expect(prepared.payload).toEqual({
        patient_id: PATIENT,
        lab_id: LAB,
        items: [{ lab_test_id: TEST, test_name: 'Full Blood Count', unit_price: 8000 }],
      });
    });
  });

  describe('cancel_test_requisition', () => {
    const pending = {
      id: REQ,
      patient_id: PATIENT,
      status: RequisitionStatus.PENDING,
      payment_status: PaymentStatus.PENDING,
      total_amount: 8000,
    };

    it('refuses another patient’s requisition without deleting', async () => {
      const { rpc, send } = makeRpc({
        [OrderPatterns.TEST_REQUISITIONS.RETRIEVE]: () => ({
          ...pending,
          patient_id: OTHER_PATIENT,
        }),
      });
      await expect(
        prepare(new ToolRegistry(rpc), 'cancel_test_requisition', {
          requisition_id: REQ,
        }),
      ).rejects.toThrow('Test requisition not found');
      expect(send).not.toHaveBeenCalledWith(
        'orders',
        OrderPatterns.TEST_REQUISITIONS.DELETE,
        expect.anything(),
      );
    });

    it('refuses accepted or paid requisitions', async () => {
      const { rpc } = makeRpc({
        [OrderPatterns.TEST_REQUISITIONS.RETRIEVE]: () => ({
          ...pending,
          status: RequisitionStatus.ACCEPTED,
          payment_status: PaymentStatus.ESCROW,
        }),
      });
      await expect(
        prepare(new ToolRegistry(rpc), 'cancel_test_requisition', {
          requisition_id: REQ,
        }),
      ).rejects.toThrow(/accepted and paid/);
    });

    it('re-checks state at execution time', async () => {
      let current: any = pending;
      const { rpc, send } = makeRpc({
        [OrderPatterns.TEST_REQUISITIONS.RETRIEVE]: () => current,
        [OrderPatterns.TEST_REQUISITIONS.DELETE]: () => ({ message: 'ok' }),
      });
      const { tool, prepared } = await prepare(
        new ToolRegistry(rpc),
        'cancel_test_requisition',
        { requisition_id: REQ },
      );
      current = { ...pending, status: RequisitionStatus.ACCEPTED };
      await expect(tool.execute(ctx, prepared.payload)).rejects.toThrow(ToolError);
      expect(send).not.toHaveBeenCalledWith(
        'orders',
        OrderPatterns.TEST_REQUISITIONS.DELETE,
        expect.anything(),
      );
    });
  });
});
