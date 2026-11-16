import { ConfigService } from '@nestjs/config';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { Repository } from 'typeorm';
import { of } from 'rxjs';
import {
  AuthPatterns,
  AuthRole,
  NotificationEvents,
  SubscriptionAudience,
  SubscriptionDowngradeReason,
  SubscriptionLevel,
  SubscriptionStatus,
  TransactionPatterns,
} from '@medicpadi-backend/contracts';
import { addMonths, SubscriptionsService } from './subscriptions.service';
import { Subscription } from '../../entities/subscription.entity';
import { SubscriptionPlan } from '../../entities/subscription-plan.entity';

const unwrap = (payload: any) => payload?.data ?? payload;

const makePlan = (
  overrides: Partial<SubscriptionPlan> = {},
): SubscriptionPlan =>
  ({
    id: 'plan-basic',
    code: SubscriptionLevel.BASIC,
    audience: SubscriptionAudience.PATIENT,
    name: 'Basic',
    price: 2500,
    currency: 'NGN',
    interval: 'monthly',
    is_active: true,
    sort_order: 1,
    ...overrides,
  }) as SubscriptionPlan;

const makeSub = (overrides: Partial<Subscription> = {}): Subscription =>
  ({
    id: '11111111-1111-4111-8111-111111111111',
    user_id: 'user-1',
    role: AuthRole.PATIENT,
    audience: SubscriptionAudience.PATIENT,
    plan_code: SubscriptionLevel.FREE,
    pending_plan_code: null,
    status: SubscriptionStatus.ACTIVE,
    cancel_at_period_end: false,
    failed_attempts: 0,
    ...overrides,
  }) as Subscription;

const reusableCard = {
  authorization_code: 'AUTH_abc',
  reusable: true,
  last4: '4081',
  exp_month: '12',
  exp_year: '2030',
  card_type: 'visa',
  bank: 'TEST BANK',
  signature: 'SIG_1',
};

describe('addMonths', () => {
  it('clamps to the last day of a shorter month', () => {
    expect(addMonths(new Date('2026-01-31T10:00:00Z'), 1).toISOString()).toBe(
      '2026-02-28T10:00:00.000Z',
    );
    expect(addMonths(new Date('2028-01-31T00:00:00Z'), 1).toISOString()).toBe(
      '2028-02-29T00:00:00.000Z',
    );
  });

  it('keeps the day when it exists and rolls over the year', () => {
    expect(addMonths(new Date('2026-12-15T00:00:00Z'), 1).toISOString()).toBe(
      '2027-01-15T00:00:00.000Z',
    );
  });
});

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let subRepo: Record<string, jest.Mock>;
  let planRepo: Record<string, jest.Mock>;
  let authClient: { send: jest.Mock; emit: jest.Mock };
  let txClient: { send: jest.Mock; emit: jest.Mock };
  let notifClient: { send: jest.Mock; emit: jest.Mock };
  let plans: SubscriptionPlan[];

  beforeEach(() => {
    plans = [
      makePlan({
        id: 'p-free',
        code: SubscriptionLevel.FREE,
        name: 'Free',
        price: 0,
        sort_order: 0,
      }),
      makePlan(),
      makePlan({
        id: 'p-prem',
        code: SubscriptionLevel.PREMIUM,
        name: 'Premium',
        price: 5000,
        sort_order: 2,
      }),
      makePlan({
        id: 'p-pro',
        code: SubscriptionLevel.PROFESSIONAL,
        audience: SubscriptionAudience.PROVIDER,
        name: 'Professional',
        price: 10000,
      }),
      makePlan({
        id: 'p-free-pro',
        code: SubscriptionLevel.FREE,
        audience: SubscriptionAudience.PROVIDER,
        name: 'Free',
        price: 0,
      }),
    ];
    subRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((data) => ({ ...data })),
      save: jest.fn(async (entity) => ({ id: 'new-sub', ...entity })),
      update: jest.fn(),
    };
    planRepo = {
      findOne: jest.fn(
        async ({ where }) =>
          plans.find(
            (p) => p.code === where.code && p.audience === where.audience,
          ) ?? null,
      ),
      find: jest.fn(async () => plans),
      update: jest.fn(async () => ({ affected: 1 })),
    };
    authClient = { send: jest.fn(() => of({})), emit: jest.fn() };
    txClient = { send: jest.fn(), emit: jest.fn() };
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
  });

  const emitted = (event: string) =>
    notifClient.emit.mock.calls
      .filter(([e]) => e === event)
      .map(([, p]) => unwrap(p));
  const authLevelsSent = () =>
    authClient.send.mock.calls
      .filter(([p]) => p === AuthPatterns.UPDATE_SUBSCRIPTION)
      .map(([, p]) => unwrap(p).subscription);

  describe('plan rules', () => {
    it('maps roles to audiences and rejects admins', () => {
      expect(service.audienceFor(AuthRole.PATIENT)).toBe(
        SubscriptionAudience.PATIENT,
      );
      expect(service.audienceFor(AuthRole.CONSULTANT)).toBe(
        SubscriptionAudience.PROVIDER,
      );
      expect(service.audienceFor(AuthRole.PHARMACY)).toBe(
        SubscriptionAudience.PROVIDER,
      );
      expect(service.audienceFor(AuthRole.LAB)).toBe(
        SubscriptionAudience.PROVIDER,
      );
      expect(() => service.audienceFor(AuthRole.ADMIN)).toThrow(RpcException);
    });

    it('rejects a provider plan for a patient', async () => {
      subRepo.findOne.mockResolvedValue(makeSub());
      await expect(
        service.subscribe({
          userId: 'user-1',
          role: AuthRole.PATIENT,
          plan: SubscriptionLevel.PROFESSIONAL,
        }),
      ).rejects.toMatchObject({ error: { statusCode: 400 } });
    });

    it('rejects a patient plan for a lab', async () => {
      subRepo.findOne.mockResolvedValue(
        makeSub({
          role: AuthRole.LAB,
          audience: SubscriptionAudience.PROVIDER,
        }),
      );
      await expect(
        service.subscribe({
          userId: 'user-1',
          role: AuthRole.LAB,
          plan: SubscriptionLevel.PREMIUM,
        }),
      ).rejects.toMatchObject({ error: { statusCode: 400 } });
    });

    it('rejects a paid plan that is switched off', async () => {
      plans[1].is_active = false;
      subRepo.findOne.mockResolvedValue(makeSub());
      await expect(
        service.subscribe({
          userId: 'user-1',
          role: AuthRole.PATIENT,
          plan: SubscriptionLevel.BASIC,
        }),
      ).rejects.toMatchObject({ error: { statusCode: 400 } });
    });
  });

  describe('getMine', () => {
    it('creates a Free row lazily and hides card secrets', async () => {
      subRepo.findOne.mockResolvedValue(null);
      const result = await service.getMine('user-1', AuthRole.PATIENT);
      expect(subRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          plan_code: SubscriptionLevel.FREE,
        }),
      );
      expect(result.plan?.code).toBe(SubscriptionLevel.FREE);
      expect(result).not.toHaveProperty('paystack_authorization_code');
      expect(result).not.toHaveProperty('card_signature');
    });
  });

  describe('subscribe', () => {
    it('is a no-op when a Free user picks Free', async () => {
      subRepo.findOne.mockResolvedValue(makeSub());
      const result = await service.subscribe({
        userId: 'user-1',
        role: AuthRole.PATIENT,
        plan: SubscriptionLevel.FREE,
      });
      expect(result).not.toHaveProperty('authorization_url');
      expect(txClient.send).not.toHaveBeenCalled();
    });

    it('schedules cancellation when a paid user picks Free', async () => {
      const sub = makeSub({
        plan_code: SubscriptionLevel.BASIC,
        current_period_end: new Date('2026-12-01T00:00:00Z'),
      });
      subRepo.findOne.mockResolvedValue(sub);
      const result = await service.subscribe({
        userId: 'user-1',
        role: AuthRole.PATIENT,
        plan: SubscriptionLevel.FREE,
      });
      expect(result.subscription.cancel_at_period_end).toBe(true);
      expect(result.subscription.plan_code).toBe(SubscriptionLevel.BASIC);
      expect(txClient.send).not.toHaveBeenCalled();
    });

    it('409s when already active on the same plan', async () => {
      subRepo.findOne.mockResolvedValue(
        makeSub({ plan_code: SubscriptionLevel.BASIC }),
      );
      await expect(
        service.subscribe({
          userId: 'user-1',
          role: AuthRole.PATIENT,
          plan: SubscriptionLevel.BASIC,
        }),
      ).rejects.toMatchObject({ error: { statusCode: 409 } });
    });

    it('records the pending plan and starts a Paystack checkout for a paid plan', async () => {
      const sub = makeSub();
      subRepo.findOne.mockResolvedValue(sub);
      txClient.send.mockReturnValue(
        of({
          status: true,
          data: {
            authorization_url: 'https://checkout',
            access_code: 'ac',
            reference: 'ref-1',
          },
        }),
      );

      const result = await service.subscribe({
        userId: 'user-1',
        role: AuthRole.PATIENT,
        plan: SubscriptionLevel.PREMIUM,
      });

      expect(sub.pending_plan_code).toBe(SubscriptionLevel.PREMIUM);
      const [pattern, payload] = txClient.send.mock.calls[0];
      expect(pattern).toBe(TransactionPatterns.TRANSACTIONS.CREATE);
      expect(unwrap(payload)).toMatchObject({
        user_id: 'user-1',
        source_type: 'subscription',
        source_id: sub.id,
        amount: 5000,
        gateway: 'paystack',
      });
      expect(result).toMatchObject({
        authorization_url: 'https://checkout',
        reference: 'ref-1',
      });
    });
  });

  describe('activate', () => {
    it('activates a pending paid plan, stores the reusable card and syncs auth', async () => {
      const sub = makeSub({ pending_plan_code: SubscriptionLevel.BASIC });
      subRepo.findOne.mockResolvedValue(sub);
      const before = Date.now();

      const result = await service.activate({
        subscriptionId: sub.id,
        reference: 'ref-1',
        amount: 2500,
        currency: 'NGN',
        customerEmail: 'u@test.com',
        authorization: reusableCard,
      });

      expect(sub.plan_code).toBe(SubscriptionLevel.BASIC);
      expect(sub.pending_plan_code).toBeNull();
      expect(sub.status).toBe(SubscriptionStatus.ACTIVE);
      expect(sub.current_period_start!.getTime()).toBeGreaterThanOrEqual(
        before,
      );
      expect(sub.current_period_end).toEqual(
        addMonths(sub.current_period_start!, 1),
      );
      expect(sub.paystack_authorization_code).toBe('AUTH_abc');
      expect(sub.card_last4).toBe('4081');
      expect(sub.customer_email).toBe('u@test.com');
      expect(sub.last_transaction_reference).toBe('ref-1');
      expect(authLevelsSent()).toEqual([SubscriptionLevel.BASIC]);
      expect(
        emitted(NotificationEvents.SUBSCRIPTION_ACTIVATED)[0],
      ).toMatchObject({ planName: 'Basic', renewal: false });
      expect(result).not.toHaveProperty('paystack_authorization_code');
    });

    it('does not store a non-reusable authorization', async () => {
      const sub = makeSub({ pending_plan_code: SubscriptionLevel.BASIC });
      subRepo.findOne.mockResolvedValue(sub);
      await service.activate({
        subscriptionId: sub.id,
        reference: 'ref-1',
        amount: 2500,
        currency: 'NGN',
        authorization: { ...reusableCard, reusable: false },
      });
      expect(sub.paystack_authorization_code).toBeUndefined();
      expect(sub.card_reusable).toBe(false);
      expect(sub.status).toBe(SubscriptionStatus.ACTIVE);
    });

    it('is idempotent for a reference it has already applied', async () => {
      const end = new Date('2026-12-01T00:00:00Z');
      const sub = makeSub({
        plan_code: SubscriptionLevel.BASIC,
        last_transaction_reference: 'ref-1',
        current_period_end: end,
      });
      subRepo.findOne.mockResolvedValue(sub);
      await service.activate({
        subscriptionId: sub.id,
        reference: 'ref-1',
        amount: 2500,
        currency: 'NGN',
      });
      expect(subRepo.save).not.toHaveBeenCalled();
      expect(sub.current_period_end).toBe(end);
      expect(authClient.send).not.toHaveBeenCalled();
    });

    it('continues the period from the old end on a same-plan renewal', async () => {
      const end = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const sub = makeSub({
        plan_code: SubscriptionLevel.BASIC,
        current_period_start: addMonths(end, -1),
        current_period_end: end,
      });
      subRepo.findOne.mockResolvedValue(sub);
      await service.activate({
        subscriptionId: sub.id,
        reference: 'ref-2',
        amount: 2500,
        currency: 'NGN',
      });
      expect(sub.current_period_start).toBe(end);
      expect(sub.current_period_end).toEqual(addMonths(end, 1));
      expect(
        emitted(NotificationEvents.SUBSCRIPTION_ACTIVATED)[0].renewal,
      ).toBe(true);
    });

    it('starts a fresh period on a plan change', async () => {
      const end = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const sub = makeSub({
        plan_code: SubscriptionLevel.BASIC,
        pending_plan_code: SubscriptionLevel.PREMIUM,
        current_period_end: end,
      });
      subRepo.findOne.mockResolvedValue(sub);
      await service.activate({
        subscriptionId: sub.id,
        reference: 'ref-3',
        amount: 5000,
        currency: 'NGN',
      });
      expect(sub.plan_code).toBe(SubscriptionLevel.PREMIUM);
      expect(sub.current_period_start).not.toBe(end);
      expect(authLevelsSent()).toEqual([SubscriptionLevel.PREMIUM]);
    });

    it('404s for an unknown subscription', async () => {
      subRepo.findOne.mockResolvedValue(null);
      await expect(
        service.activate({
          subscriptionId: 'nope',
          reference: 'r',
          amount: 1,
          currency: 'NGN',
        }),
      ).rejects.toMatchObject({ error: { statusCode: 404 } });
    });
  });

  describe('cancel', () => {
    it('400s on the Free plan', async () => {
      subRepo.findOne.mockResolvedValue(makeSub());
      await expect(
        service.cancel('user-1', AuthRole.PATIENT),
      ).rejects.toMatchObject({ error: { statusCode: 400 } });
    });

    it('flags cancel_at_period_end and clears any pending plan', async () => {
      const sub = makeSub({
        plan_code: SubscriptionLevel.BASIC,
        pending_plan_code: SubscriptionLevel.PREMIUM,
      });
      subRepo.findOne.mockResolvedValue(sub);
      const result = await service.cancel('user-1', AuthRole.PATIENT);
      expect(result.cancel_at_period_end).toBe(true);
      expect(result.pending_plan_code).toBeNull();
      expect(result.cancelled_at).toBeInstanceOf(Date);
    });
  });

  describe('adminUpdatePlan', () => {
    it('updates by (code, audience) and returns the plan', async () => {
      const result = await service.adminUpdatePlan({
        code: SubscriptionLevel.BASIC,
        audience: SubscriptionAudience.PATIENT,
        price: 3000,
      });
      expect(planRepo.update).toHaveBeenCalledWith(
        {
          code: SubscriptionLevel.BASIC,
          audience: SubscriptionAudience.PATIENT,
        },
        { price: 3000 },
      );
      expect(result.code).toBe(SubscriptionLevel.BASIC);
    });

    it('404s when no plan matches', async () => {
      planRepo.update.mockResolvedValue({ affected: 0 });
      await expect(
        service.adminUpdatePlan({
          code: SubscriptionLevel.PREMIUM,
          audience: SubscriptionAudience.PROVIDER,
          price: 1,
        }),
      ).rejects.toMatchObject({ error: { statusCode: 404 } });
    });
  });

  describe('job transitions', () => {
    const plan = () => plans[1];

    it('applyChargeSuccess extends the period and announces a renewal', async () => {
      const end = new Date(Date.now() - 60 * 60 * 1000);
      const sub = makeSub({
        plan_code: SubscriptionLevel.BASIC,
        status: SubscriptionStatus.PAST_DUE,
        failed_attempts: 1,
        grace_until: new Date(),
        current_period_end: end,
      });
      await service.applyChargeSuccess(sub, plan(), {
        success: true,
        reference: 'sub_x_a2',
        status: 'success',
      });
      expect(sub.status).toBe(SubscriptionStatus.ACTIVE);
      expect(sub.failed_attempts).toBe(0);
      expect(sub.grace_until).toBeNull();
      expect(sub.current_period_start).toBe(end);
      expect(sub.current_period_end).toEqual(addMonths(end, 1));
      expect(sub.last_transaction_reference).toBe('sub_x_a2');
      expect(authLevelsSent()).toEqual([SubscriptionLevel.BASIC]);
      expect(
        emitted(NotificationEvents.SUBSCRIPTION_ACTIVATED)[0].renewal,
      ).toBe(true);
    });

    it('first failure enters past_due with a 3-day grace and notifies', async () => {
      const end = new Date('2026-11-10T00:00:00Z');
      const sub = makeSub({
        plan_code: SubscriptionLevel.BASIC,
        current_period_end: end,
      });
      jest.useFakeTimers().setSystemTime(new Date('2026-11-10T02:00:00Z'));
      try {
        await service.applyChargeFailure(sub, plan(), 'Insufficient funds');
      } finally {
        jest.useRealTimers();
      }
      expect(sub.status).toBe(SubscriptionStatus.PAST_DUE);
      expect(sub.failed_attempts).toBe(1);
      expect(sub.grace_until!.toISOString()).toBe('2026-11-13T00:00:00.000Z');
      expect(authClient.send).not.toHaveBeenCalled();
      expect(
        emitted(NotificationEvents.SUBSCRIPTION_PAYMENT_FAILED)[0],
      ).toMatchObject({
        attempt: 1,
        maxAttempts: 3,
        reason: 'Insufficient funds',
      });
    });

    it('third failure downgrades to Free and tells auth', async () => {
      const sub = makeSub({
        plan_code: SubscriptionLevel.BASIC,
        status: SubscriptionStatus.PAST_DUE,
        failed_attempts: 2,
        grace_until: new Date(Date.now() + 86400000),
        current_period_end: new Date(),
      });
      await service.applyChargeFailure(sub, plan(), 'declined');
      expect(sub.status).toBe(SubscriptionStatus.EXPIRED);
      expect(sub.plan_code).toBe(SubscriptionLevel.FREE);
      expect(sub.failed_attempts).toBe(0);
      expect(authLevelsSent()).toEqual([SubscriptionLevel.FREE]);
      expect(
        emitted(NotificationEvents.SUBSCRIPTION_DOWNGRADED)[0],
      ).toMatchObject({
        previousPlanName: 'Basic',
        reason: SubscriptionDowngradeReason.PAYMENT_FAILED,
      });
      expect(
        emitted(NotificationEvents.SUBSCRIPTION_PAYMENT_FAILED),
      ).toHaveLength(0);
    });

    it('downgrades once the grace period has passed even on attempt 2', async () => {
      const sub = makeSub({
        plan_code: SubscriptionLevel.BASIC,
        status: SubscriptionStatus.PAST_DUE,
        failed_attempts: 1,
        grace_until: new Date(Date.now() - 1000),
        current_period_end: new Date(Date.now() - 4 * 86400000),
      });
      await service.applyChargeFailure(sub, plan(), 'declined');
      expect(sub.status).toBe(SubscriptionStatus.EXPIRED);
      expect(authLevelsSent()).toEqual([SubscriptionLevel.FREE]);
    });

    it('downgrade keeps the card on file for a later re-upgrade', async () => {
      const sub = makeSub({
        plan_code: SubscriptionLevel.BASIC,
        paystack_authorization_code: 'AUTH_abc',
        cancel_at_period_end: true,
      });
      await service.downgrade(
        sub,
        plan(),
        SubscriptionDowngradeReason.CANCELLED,
      );
      expect(sub.paystack_authorization_code).toBe('AUTH_abc');
      expect(sub.cancel_at_period_end).toBe(false);
      expect(sub.downgraded_at).toBeInstanceOf(Date);
      expect(
        emitted(NotificationEvents.SUBSCRIPTION_DOWNGRADED)[0].reason,
      ).toBe(SubscriptionDowngradeReason.CANCELLED);
    });

    it('logs but does not fail when auth cannot be updated', async () => {
      authClient.send.mockImplementation(() => {
        throw new Error('auth down');
      });
      const sub = makeSub({ plan_code: SubscriptionLevel.BASIC });
      await expect(
        service.downgrade(sub, plan(), SubscriptionDowngradeReason.CANCELLED),
      ).resolves.toBeDefined();
      expect(sub.plan_code).toBe(SubscriptionLevel.FREE);
    });
  });
});
