import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { Repository } from 'typeorm';
import { of, throwError } from 'rxjs';
import {
  AuthRole,
  NotificationEvents,
  SubscriptionAudience,
  SubscriptionLevel,
  SubscriptionStatus,
  TransactionPatterns,
} from '@medicpadi-backend/contracts';
import { SubscriptionsService, addDays } from './subscriptions.service';
import {
  renewalReference,
  startOfUtcDay,
  SubscriptionProcessor,
} from './subscription.processor';
import { Subscription } from '../../entities/subscription.entity';
import { SubscriptionPlan } from '../../entities/subscription-plan.entity';
import { SubscriptionJobNames } from './subscriptions.constants';

const unwrap = (payload: any) => payload?.data ?? payload;
const NOW = new Date('2026-11-16T02:00:00Z');

const basicPlan = {
  id: 'p-basic',
  code: SubscriptionLevel.BASIC,
  audience: SubscriptionAudience.PATIENT,
  name: 'Basic',
  price: 2500,
  currency: 'NGN',
  is_active: true,
} as SubscriptionPlan;

const makeSub = (overrides: Partial<Subscription> = {}): Subscription =>
  ({
    id: '22222222-2222-4222-8222-222222222222',
    user_id: 'user-1',
    role: AuthRole.PATIENT,
    audience: SubscriptionAudience.PATIENT,
    plan_code: SubscriptionLevel.BASIC,
    pending_plan_code: null,
    status: SubscriptionStatus.ACTIVE,
    cancel_at_period_end: false,
    failed_attempts: 0,
    grace_until: null,
    last_charge_attempt_at: null,
    current_period_start: new Date('2026-10-15T00:00:00Z'),
    current_period_end: new Date('2026-11-15T00:00:00Z'),
    paystack_authorization_code: 'AUTH_abc',
    card_reusable: true,
    card_last4: '4081',
    customer_email: 'u@test.com',
    ...overrides,
  }) as Subscription;

describe('renewalReference / startOfUtcDay', () => {
  it('builds one reference per subscription, period and attempt', () => {
    const sub = makeSub();
    expect(renewalReference(sub, 1)).toBe(`sub_${sub.id}_20261115_a1`);
    expect(renewalReference(sub, 2)).toBe(`sub_${sub.id}_20261115_a2`);
  });

  it('startOfUtcDay truncates to midnight UTC', () => {
    expect(startOfUtcDay(new Date('2026-11-16T23:59:59Z')).toISOString()).toBe(
      '2026-11-16T00:00:00.000Z',
    );
  });
});

describe('SubscriptionProcessor', () => {
  let processor: SubscriptionProcessor;
  let service: SubscriptionsService;
  let subRepo: Record<string, jest.Mock>;
  let planRepo: Record<string, jest.Mock>;
  let txClient: { send: jest.Mock; emit: jest.Mock };
  let authClient: { send: jest.Mock; emit: jest.Mock };
  let notifClient: { send: jest.Mock; emit: jest.Mock };
  let rows: Subscription[];

  beforeEach(() => {
    rows = [];
    subRepo = {
      // The processor's queries are mocked by returning `rows`; filtering is asserted via inputs.
      find: jest.fn(async () => rows),
      findOne: jest.fn(
        async ({ where }) => rows.find((r) => r.id === where.id) ?? null,
      ),
      update: jest.fn(async () => ({ affected: 1 })),
      save: jest.fn(async (e) => e),
      create: jest.fn((d) => d),
    };
    planRepo = {
      findOne: jest.fn(async () => basicPlan),
      update: jest.fn(),
      find: jest.fn(),
    };
    txClient = { send: jest.fn(), emit: jest.fn() };
    authClient = { send: jest.fn(() => of({})), emit: jest.fn() };
    notifClient = { send: jest.fn(), emit: jest.fn(() => of(null)) };
    const config: Record<string, unknown> = {
      'appConfig.internalServiceToken': 'token',
      'appConfig.subscriptionGraceDays': 3,
    };
    const configService = {
      get: jest.fn((k: string) => config[k]),
      getOrThrow: jest.fn((k: string) => config[k]),
    } as unknown as ConfigService;

    service = new SubscriptionsService(
      subRepo as unknown as Repository<Subscription>,
      planRepo as unknown as Repository<SubscriptionPlan>,
      configService,
      authClient as unknown as ClientProxy,
      txClient as unknown as ClientProxy,
      notifClient as unknown as ClientProxy,
    );
    processor = new SubscriptionProcessor(
      subRepo as unknown as Repository<Subscription>,
      planRepo as unknown as Repository<SubscriptionPlan>,
      service,
      configService,
      txClient as unknown as ClientProxy,
    );
  });

  const emitted = (event: string) =>
    notifClient.emit.mock.calls
      .filter(([e]) => e === event)
      .map(([, p]) => unwrap(p));

  describe('process', () => {
    it('routes job names to the two jobs', async () => {
      const reminders = jest
        .spyOn(processor, 'sendRenewalReminders')
        .mockResolvedValue({ scanned: 0, reminded: 0 });
      const charges = jest
        .spyOn(processor, 'chargeDueSubscriptions')
        .mockResolvedValue({} as any);
      await processor.process({
        name: SubscriptionJobNames.RENEWAL_REMINDER,
      } as any);
      await processor.process({
        name: SubscriptionJobNames.MONTHLY_CHARGE,
      } as any);
      expect(reminders).toHaveBeenCalledTimes(1);
      expect(charges).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendRenewalReminders', () => {
    it('reminds subscribers renewing in ~7 days and records the period end', async () => {
      const sub = makeSub({ current_period_end: addDays(NOW, 7) });
      rows = [sub];

      const result = await processor.sendRenewalReminders(NOW);

      expect(result).toEqual({ scanned: 1, reminded: 1 });
      const [event] = emitted(NotificationEvents.SUBSCRIPTION_RENEWAL_REMINDER);
      expect(event).toMatchObject({
        userId: 'user-1',
        planName: 'Basic',
        amount: 2500,
        cardLast4: '4081',
      });
      expect(event.renewsOn).toBe(sub.current_period_end!.toISOString());
      expect(subRepo.update).toHaveBeenCalledWith(
        { id: sub.id },
        { reminder_sent_for_period_end: sub.current_period_end },
      );
    });

    it('skips a subscription already reminded for this period end', async () => {
      const end = addDays(NOW, 7);
      rows = [
        makeSub({
          current_period_end: end,
          reminder_sent_for_period_end: new Date(end),
        }),
      ];
      const result = await processor.sendRenewalReminders(NOW);
      expect(result).toEqual({ scanned: 1, reminded: 0 });
      expect(notifClient.emit).not.toHaveBeenCalled();
    });

    it('queries only active paid, non-cancelling rows inside the 6-8 day window', async () => {
      await processor.sendRenewalReminders(NOW);
      const where = subRepo.find.mock.calls[0][0].where;
      expect(where.status).toBe(SubscriptionStatus.ACTIVE);
      expect(where.cancel_at_period_end).toBe(false);
      expect(where.plan_code).toBeDefined();
      expect(where.current_period_end).toBeDefined();
    });
  });

  describe('chargeDueSubscriptions', () => {
    const chargeReply = (reply: object) =>
      txClient.send.mockReturnValue(of(reply));

    it('charges a due subscription, extends the period and announces the renewal', async () => {
      const sub = makeSub();
      rows = [sub];
      chargeReply({
        success: true,
        reference: renewalReference(sub, 1),
        status: 'success',
      });

      const stats = await processor.chargeDueSubscriptions(NOW);

      expect(stats).toMatchObject({
        scanned: 1,
        charged: 1,
        failed: 0,
        downgraded: 0,
      });
      const [pattern, payload] = txClient.send.mock.calls[0];
      expect(pattern).toBe(
        TransactionPatterns.TRANSACTIONS.CHARGE_AUTHORIZATION,
      );
      expect(unwrap(payload)).toMatchObject({
        user_id: 'user-1',
        email: 'u@test.com',
        amount: 2500,
        authorization_code: 'AUTH_abc',
        reference: `sub_${sub.id}_20261115_a1`,
        source_id: sub.id,
      });
      expect(sub.current_period_start!.toISOString()).toBe(
        '2026-11-15T00:00:00.000Z',
      );
      expect(sub.current_period_end!.toISOString()).toBe(
        '2026-12-15T00:00:00.000Z',
      );
      expect(sub.status).toBe(SubscriptionStatus.ACTIVE);
      expect(
        emitted(NotificationEvents.SUBSCRIPTION_ACTIVATED)[0].renewal,
      ).toBe(true);
    });

    it('claims the row for today before charging and skips when another worker won', async () => {
      const sub = makeSub();
      rows = [sub];
      subRepo.update.mockResolvedValueOnce({ affected: 0 });

      const stats = await processor.chargeDueSubscriptions(NOW);

      expect(stats).toMatchObject({ scanned: 1, skipped: 1, charged: 0 });
      expect(txClient.send).not.toHaveBeenCalled();
      expect(subRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ id: sub.id }),
        { last_charge_attempt_at: NOW },
      );
    });

    it('a declined first attempt moves to past_due with grace and notifies', async () => {
      const sub = makeSub();
      rows = [sub];
      chargeReply({
        success: false,
        reference: 'x',
        status: 'failed',
        gatewayResponse: 'Insufficient Funds',
      });

      const stats = await processor.chargeDueSubscriptions(NOW);

      expect(stats).toMatchObject({ failed: 1, downgraded: 0 });
      expect(sub.status).toBe(SubscriptionStatus.PAST_DUE);
      expect(sub.failed_attempts).toBe(1);
      expect(sub.grace_until!.toISOString()).toBe('2026-11-18T00:00:00.000Z');
      expect(
        emitted(NotificationEvents.SUBSCRIPTION_PAYMENT_FAILED)[0],
      ).toMatchObject({ attempt: 1, reason: 'Insufficient Funds' });
      expect(authClient.send).not.toHaveBeenCalled();
    });

    it('a third declined attempt downgrades to Free', async () => {
      const sub = makeSub({
        status: SubscriptionStatus.PAST_DUE,
        failed_attempts: 2,
        grace_until: new Date('2026-11-18T00:00:00Z'),
      });
      rows = [sub];
      chargeReply({
        success: false,
        reference: 'x',
        status: 'failed',
        gatewayResponse: 'Declined',
      });

      const stats = await processor.chargeDueSubscriptions(NOW);

      expect(stats).toMatchObject({ downgraded: 1, failed: 0 });
      expect(unwrap(txClient.send.mock.calls[0][1]).reference).toBe(
        `sub_${sub.id}_20261115_a3`,
      );
      expect(sub.plan_code).toBe(SubscriptionLevel.FREE);
      expect(sub.status).toBe(SubscriptionStatus.EXPIRED);
      expect(unwrap(authClient.send.mock.calls[0][1])).toEqual({
        userId: 'user-1',
        subscription: SubscriptionLevel.FREE,
      });
      expect(emitted(NotificationEvents.SUBSCRIPTION_DOWNGRADED)).toHaveLength(
        1,
      );
    });

    it('a cancelled subscription is expired at period end without charging', async () => {
      const sub = makeSub({ cancel_at_period_end: true });
      rows = [sub];

      const stats = await processor.chargeDueSubscriptions(NOW);

      expect(stats).toMatchObject({ downgraded: 1 });
      expect(txClient.send).not.toHaveBeenCalled();
      expect(sub.plan_code).toBe(SubscriptionLevel.FREE);
      expect(
        emitted(NotificationEvents.SUBSCRIPTION_DOWNGRADED)[0].reason,
      ).toBe('cancelled');
    });

    it('no reusable card counts as a failed attempt', async () => {
      const sub = makeSub({
        paystack_authorization_code: null,
        card_reusable: false,
      });
      rows = [sub];

      const stats = await processor.chargeDueSubscriptions(NOW);

      expect(stats).toMatchObject({ failed: 1 });
      expect(txClient.send).not.toHaveBeenCalled();
      expect(sub.status).toBe(SubscriptionStatus.PAST_DUE);
      expect(
        emitted(NotificationEvents.SUBSCRIPTION_PAYMENT_FAILED)[0].reason,
      ).toBe('No reusable card on file');
    });

    it('leaves the state untouched when the charge outcome is unknown', async () => {
      const sub = makeSub();
      rows = [sub];
      txClient.send.mockReturnValue(
        throwError(() => new Error('transactions unreachable')),
      );

      const stats = await processor.chargeDueSubscriptions(NOW);

      expect(stats).toMatchObject({ skipped: 1, failed: 0, charged: 0 });
      expect(sub.status).toBe(SubscriptionStatus.ACTIVE);
      expect(sub.failed_attempts).toBe(0);
      expect(notifClient.emit).not.toHaveBeenCalled();
    });

    it('does not extend twice when the webhook already applied the reference', async () => {
      const sub = makeSub();
      rows = [sub];
      const reference = renewalReference(sub, 1);
      txClient.send.mockImplementation(() => {
        // Simulate charge.success -> ACTIVATE landing before the reply is read.
        sub.last_transaction_reference = reference;
        sub.current_period_end = new Date('2026-12-15T00:00:00Z');
        return of({ success: true, reference, status: 'success' });
      });

      const stats = await processor.chargeDueSubscriptions(NOW);

      expect(stats).toMatchObject({ charged: 1 });
      expect(sub.current_period_end!.toISOString()).toBe(
        '2026-12-15T00:00:00.000Z',
      );
      expect(notifClient.emit).not.toHaveBeenCalled();
    });

    it('queries paid active/past_due rows whose period has ended and not yet claimed today', async () => {
      await processor.chargeDueSubscriptions(NOW);
      const options = subRepo.find.mock.calls[0][0];
      expect(options.take).toBe(100);
      expect(options.where.current_period_end).toBeDefined();
      expect(options.where.last_charge_attempt_at).toBeDefined();
      expect(options.where.status).toBeDefined();
    });
  });
});
