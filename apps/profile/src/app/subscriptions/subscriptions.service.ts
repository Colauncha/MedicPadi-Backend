import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  AdminUpdatePlanDto,
  AuthPatterns,
  AuthRole,
  ChargeAuthorizationResult,
  CreateTransactionDto,
  NotificationEvents,
  PaymentGateway,
  PaystackAuthorization,
  PaystackInitializeResponse,
  ServiceError,
  SubscribeRequestDto,
  SubscriptionActivatedEventDto,
  SubscriptionAudience,
  SubscriptionDowngradedEventDto,
  SubscriptionDowngradeReason,
  SubscriptionLevel,
  SubscriptionPaymentFailedEventDto,
  SubscriptionPaymentResultDto,
  SubscriptionStatus,
  TransactionPatterns,
  TransactionSourceType,
  UpdateSubscriptionLevelDto,
} from '@medicpadi-backend/contracts';
import { logError, withServiceAuth } from '@medicpadi-backend/utils';
import { Subscription } from '../../entities/subscription.entity';
import { SubscriptionPlan } from '../../entities/subscription-plan.entity';
import {
  DEFAULT_GRACE_DAYS,
  MAX_FAILED_ATTEMPTS,
} from './subscriptions.constants';

const PLANS_BY_AUDIENCE: Record<SubscriptionAudience, SubscriptionLevel[]> = {
  [SubscriptionAudience.PATIENT]: [
    SubscriptionLevel.FREE,
    SubscriptionLevel.BASIC,
    SubscriptionLevel.PREMIUM,
  ],
  [SubscriptionAudience.PROVIDER]: [
    SubscriptionLevel.FREE,
    SubscriptionLevel.PROFESSIONAL,
  ],
};

const SECRET_FIELDS = [
  'paystack_authorization_code',
  'card_signature',
] as const;

export type PublicSubscription = Omit<
  Subscription,
  (typeof SECRET_FIELDS)[number]
> & { plan?: SubscriptionPlan | null };

/** Adds `months` to a UTC date, clamping to the last day of the target month (Jan 31 -> Feb 28/29). */
export function addMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(date.getUTCDate(), lastDay);
  return new Date(
    Date.UTC(
      year,
      month,
      day,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
    private readonly configService: ConfigService,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('TRANSACTIONS_SERVICE')
    private readonly transactionsClient: ClientProxy,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationClient: ClientProxy,
  ) {}

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>(
      'appConfig.internalServiceToken',
    );
  }

  get graceDays(): number {
    const days = this.configService.get<number>(
      'appConfig.subscriptionGraceDays',
    );
    return days === undefined || Number.isNaN(days) || days < 0
      ? DEFAULT_GRACE_DAYS
      : days;
  }

  // ---------------------------------------------------------------- rules

  audienceFor(role: AuthRole): SubscriptionAudience {
    switch (role) {
      case AuthRole.PATIENT:
        return SubscriptionAudience.PATIENT;
      case AuthRole.CONSULTANT:
      case AuthRole.PHARMACY:
      case AuthRole.LAB:
        return SubscriptionAudience.PROVIDER;
      default:
        throw new RpcException({
          statusCode: HttpStatus.FORBIDDEN,
          message: `Role "${role}" cannot hold a subscription`,
        } as ServiceError);
    }
  }

  allowedPlans(audience: SubscriptionAudience): SubscriptionLevel[] {
    return PLANS_BY_AUDIENCE[audience];
  }

  private async getPlan(
    code: SubscriptionLevel,
    audience: SubscriptionAudience,
  ): Promise<SubscriptionPlan> {
    const plan = await this.planRepo.findOne({ where: { code, audience } });
    if (!plan) {
      throw new RpcException({
        statusCode: HttpStatus.NOT_FOUND,
        message: `Plan "${code}" is not available for ${audience}s`,
      } as ServiceError);
    }
    return plan;
  }

  /** Enforces the per-audience plan list and that paid plans are currently on sale. */
  private async assertPlanAllowed(
    audience: SubscriptionAudience,
    code: SubscriptionLevel,
  ): Promise<SubscriptionPlan> {
    if (!this.allowedPlans(audience).includes(code)) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Plan "${code}" is not available for ${audience}s. Choose one of: ${this.allowedPlans(audience).join(', ')}`,
      } as ServiceError);
    }
    const plan = await this.getPlan(code, audience);
    if (code !== SubscriptionLevel.FREE && !plan.is_active) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Plan "${code}" is not currently available`,
      } as ServiceError);
    }
    return plan;
  }

  toPublic(
    sub: Subscription,
    plan?: SubscriptionPlan | null,
  ): PublicSubscription {
    const copy: Record<string, unknown> = { ...sub };
    for (const field of SECRET_FIELDS) delete copy[field];
    return { ...(copy as PublicSubscription), plan: plan ?? undefined };
  }

  // ---------------------------------------------------------------- queries

  async findPlans(audience?: SubscriptionAudience) {
    const where = audience ? { audience, is_active: true } : {};
    return this.planRepo.find({
      where,
      order: { audience: 'ASC', sort_order: 'ASC' },
    });
  }

  async getOrCreate(userId: string, role: AuthRole): Promise<Subscription> {
    const existing = await this.subscriptionRepo.findOne({
      where: { user_id: userId },
    });
    if (existing) return existing;
    const audience = this.audienceFor(role);
    const created = this.subscriptionRepo.create({
      user_id: userId,
      role,
      audience,
      plan_code: SubscriptionLevel.FREE,
      status: SubscriptionStatus.ACTIVE,
    });
    return this.subscriptionRepo.save(created);
  }

  async getMine(userId: string, role: AuthRole): Promise<PublicSubscription> {
    try {
      const sub = await this.getOrCreate(userId, role);
      const plan = await this.planRepo.findOne({
        where: { code: sub.plan_code, audience: sub.audience },
      });
      return this.toPublic(sub, plan);
    } catch (error) {
      logError(error, `${SubscriptionsService.name}.getMine`);
      throw this.wrap(error, 'Unable to load subscription');
    }
  }

  // ---------------------------------------------------------------- commands

  /**
   * Free: moves a paid user to Free at period end (or no-op). Paid: records the target plan
   * and starts a Paystack checkout; `activate` is called by transactions once it is paid.
   */
  async subscribe({ userId, role, plan: code }: SubscribeRequestDto) {
    try {
      const audience = this.audienceFor(role);
      const plan = await this.assertPlanAllowed(audience, code);
      const sub = await this.getOrCreate(userId, role);

      if (code === SubscriptionLevel.FREE) {
        if (sub.plan_code === SubscriptionLevel.FREE) {
          return { subscription: this.toPublic(sub, plan) };
        }
        const updated = await this.cancel(userId, role);
        return { subscription: updated };
      }

      const samePlanActive =
        sub.plan_code === code &&
        sub.status === SubscriptionStatus.ACTIVE &&
        !sub.cancel_at_period_end;
      if (samePlanActive) {
        throw new RpcException({
          statusCode: HttpStatus.CONFLICT,
          message: `You are already on the ${plan.name} plan`,
        } as ServiceError);
      }

      sub.pending_plan_code = code;
      await this.subscriptionRepo.save(sub);

      const transactionDto: CreateTransactionDto = {
        user_id: userId,
        source_type: TransactionSourceType.SUBSCRIPTION,
        source_id: sub.id,
        amount: plan.price,
        currency: plan.currency,
        gateway: PaymentGateway.PAYSTACK,
      };
      const init: PaystackInitializeResponse = await firstValueFrom(
        this.transactionsClient.send(
          TransactionPatterns.TRANSACTIONS.CREATE,
          withServiceAuth(transactionDto, this.serviceToken),
        ),
      );
      if (!init?.data?.authorization_url) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_GATEWAY,
          message: 'Unable to start subscription checkout',
        } as ServiceError);
      }

      return {
        subscription: this.toPublic(sub, plan),
        authorization_url: init.data.authorization_url,
        reference: init.data.reference,
      };
    } catch (error) {
      logError(error, `${SubscriptionsService.name}.subscribe`);
      throw this.wrap(error, 'Unable to subscribe');
    }
  }

  /**
   * Called by the transactions service after a successful subscription payment (checkout or
   * recurring charge). Idempotent on `reference`: verify and webhook may both deliver it.
   */
  async activate(
    dto: SubscriptionPaymentResultDto,
  ): Promise<PublicSubscription> {
    try {
      const sub = await this.subscriptionRepo.findOne({
        where: { id: dto.subscriptionId },
      });
      if (!sub) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Subscription not found',
        } as ServiceError);
      }
      if (sub.last_transaction_reference === dto.reference) {
        return this.toPublic(sub);
      }

      const code = sub.pending_plan_code ?? sub.plan_code;
      if (code === SubscriptionLevel.FREE) {
        this.logger.warn(
          `activate(${sub.id}) with reference ${dto.reference} but no paid plan is pending; ignoring`,
        );
        return this.toPublic(sub);
      }
      const plan = await this.getPlan(code, sub.audience);

      const now = new Date();
      const isRenewal =
        sub.status !== SubscriptionStatus.EXPIRED &&
        sub.plan_code === code &&
        !!sub.current_period_end;
      // A renewal continues from the old period end unless it is more than a month stale.
      const start =
        isRenewal &&
        sub.current_period_end &&
        sub.current_period_end > addMonths(now, -1)
          ? sub.current_period_end
          : now;

      this.applyPaidPeriod(sub, code, start, dto.reference);
      this.storeCard(sub, dto.authorization, dto.customerEmail);
      const saved = await this.subscriptionRepo.save(sub);

      await this.syncAuthLevel(saved.user_id, code);
      this.emitActivated(saved, plan, isRenewal);
      return this.toPublic(saved, plan);
    } catch (error) {
      logError(error, `${SubscriptionsService.name}.activate`);
      throw this.wrap(error, 'Unable to activate subscription');
    }
  }

  /** Keeps access until the period ends; the charge job then expires it instead of billing. */
  async cancel(userId: string, role: AuthRole): Promise<PublicSubscription> {
    try {
      const sub = await this.getOrCreate(userId, role);
      if (sub.plan_code === SubscriptionLevel.FREE && !sub.pending_plan_code) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'You are on the Free plan; there is nothing to cancel',
        } as ServiceError);
      }
      sub.pending_plan_code = null;
      if (sub.plan_code !== SubscriptionLevel.FREE) {
        sub.cancel_at_period_end = true;
        sub.cancelled_at = new Date();
      }
      const saved = await this.subscriptionRepo.save(sub);
      const plan = await this.planRepo.findOne({
        where: { code: saved.plan_code, audience: saved.audience },
      });
      return this.toPublic(saved, plan);
    } catch (error) {
      logError(error, `${SubscriptionsService.name}.cancel`);
      throw this.wrap(error, 'Unable to cancel subscription');
    }
  }

  async adminUpdatePlan({ code, audience, ...patch }: AdminUpdatePlanDto) {
    try {
      const fields = Object.fromEntries(
        Object.entries(patch).filter(([, v]) => v !== undefined),
      );
      if (Object.keys(fields).length === 0) {
        throw new RpcException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Nothing to update',
        } as ServiceError);
      }
      const result = await this.planRepo.update({ code, audience }, fields);
      if (!result.affected) {
        throw new RpcException({
          statusCode: HttpStatus.NOT_FOUND,
          message: `Plan "${code}" for ${audience}s not found`,
        } as ServiceError);
      }
      return this.getPlan(code, audience);
    } catch (error) {
      logError(error, `${SubscriptionsService.name}.adminUpdatePlan`);
      throw this.wrap(error, 'Unable to update plan');
    }
  }

  // ---------------------------------------------------------------- job transitions

  /** Recurring charge succeeded: extend the period by one month from the old period end. */
  async applyChargeSuccess(
    sub: Subscription,
    plan: SubscriptionPlan,
    result: ChargeAuthorizationResult,
  ): Promise<Subscription> {
    const now = new Date();
    const previousEnd = sub.current_period_end ?? now;
    const start = previousEnd > addMonths(now, -1) ? previousEnd : now;
    const wasPastDue = sub.status === SubscriptionStatus.PAST_DUE;

    this.applyPaidPeriod(sub, sub.plan_code, start, result.reference);
    if (result.authorization) {
      this.storeCard(
        sub,
        result.authorization,
        sub.customer_email ?? undefined,
      );
    }
    const saved = await this.subscriptionRepo.save(sub);

    // Auth keeps the paid level through past_due, so this only matters if it drifted.
    if (wasPastDue) await this.syncAuthLevel(saved.user_id, saved.plan_code);
    this.emitActivated(saved, plan, true);
    return saved;
  }

  /** Recurring charge declined: enter/extend past_due, or downgrade once the grace is spent. */
  async applyChargeFailure(
    sub: Subscription,
    plan: SubscriptionPlan,
    reason?: string,
  ): Promise<Subscription> {
    const now = new Date();
    sub.failed_attempts = (sub.failed_attempts ?? 0) + 1;
    if (!sub.grace_until) {
      sub.grace_until = addDays(sub.current_period_end ?? now, this.graceDays);
    }

    if (sub.failed_attempts >= MAX_FAILED_ATTEMPTS || now > sub.grace_until) {
      return this.downgrade(
        sub,
        plan,
        SubscriptionDowngradeReason.PAYMENT_FAILED,
      );
    }

    sub.status = SubscriptionStatus.PAST_DUE;
    const saved = await this.subscriptionRepo.save(sub);
    const event: SubscriptionPaymentFailedEventDto = {
      userId: saved.user_id,
      subscriptionId: saved.id,
      planName: plan.name,
      amount: plan.price,
      currency: plan.currency,
      attempt: saved.failed_attempts,
      maxAttempts: MAX_FAILED_ATTEMPTS,
      graceUntil: saved.grace_until!.toISOString(),
      reason,
    };
    this.emit(NotificationEvents.SUBSCRIPTION_PAYMENT_FAILED, event);
    return saved;
  }

  /** Moves the user to Free, tells auth, and notifies them. Card data is kept for a later re-upgrade. */
  async downgrade(
    sub: Subscription,
    previousPlan: SubscriptionPlan,
    reason: SubscriptionDowngradeReason,
  ): Promise<Subscription> {
    sub.status = SubscriptionStatus.EXPIRED;
    sub.plan_code = SubscriptionLevel.FREE;
    sub.pending_plan_code = null;
    sub.cancel_at_period_end = false;
    sub.grace_until = null;
    sub.failed_attempts = 0;
    sub.downgraded_at = new Date();
    const saved = await this.subscriptionRepo.save(sub);

    await this.syncAuthLevel(saved.user_id, SubscriptionLevel.FREE);
    const event: SubscriptionDowngradedEventDto = {
      userId: saved.user_id,
      subscriptionId: saved.id,
      previousPlanName: previousPlan.name,
      reason,
    };
    this.emit(NotificationEvents.SUBSCRIPTION_DOWNGRADED, event);
    return saved;
  }

  // ---------------------------------------------------------------- helpers

  private applyPaidPeriod(
    sub: Subscription,
    code: SubscriptionLevel,
    start: Date,
    reference: string,
  ) {
    sub.plan_code = code;
    sub.pending_plan_code = null;
    sub.status = SubscriptionStatus.ACTIVE;
    sub.cancel_at_period_end = false;
    sub.cancelled_at = null;
    sub.failed_attempts = 0;
    sub.grace_until = null;
    sub.current_period_start = start;
    sub.current_period_end = addMonths(start, 1);
    sub.last_transaction_reference = reference;
  }

  /** Only reusable authorizations can be charged again; non-reusable ones are not stored. */
  private storeCard(
    sub: Subscription,
    authorization?: PaystackAuthorization,
    customerEmail?: string,
  ) {
    if (customerEmail) sub.customer_email = customerEmail;
    if (!authorization) return;
    if (!authorization.reusable) {
      this.logger.warn(
        `Subscription ${sub.id}: authorization is not reusable; renewals will need a new checkout`,
      );
      sub.card_reusable = false;
      return;
    }
    sub.paystack_authorization_code = authorization.authorization_code;
    sub.card_reusable = true;
    sub.card_last4 = authorization.last4 ?? null;
    sub.card_exp_month = authorization.exp_month ?? null;
    sub.card_exp_year = authorization.exp_year ?? null;
    sub.card_type = authorization.card_type ?? null;
    sub.card_bank = authorization.bank ?? null;
    sub.card_signature = authorization.signature ?? null;
  }

  /** Auth owns the level the gateway guard reads. A failure is logged, not rolled back. */
  private async syncAuthLevel(userId: string, level: SubscriptionLevel) {
    const dto: UpdateSubscriptionLevelDto = { userId, subscription: level };
    try {
      await firstValueFrom(
        this.authClient.send(
          AuthPatterns.UPDATE_SUBSCRIPTION,
          withServiceAuth(dto, this.serviceToken),
        ),
      );
    } catch (error) {
      logError(error, `${SubscriptionsService.name}.syncAuthLevel(${userId})`);
    }
  }

  private emitActivated(
    sub: Subscription,
    plan: SubscriptionPlan,
    renewal: boolean,
  ) {
    const event: SubscriptionActivatedEventDto = {
      userId: sub.user_id,
      subscriptionId: sub.id,
      planCode: sub.plan_code,
      planName: plan.name,
      amount: plan.price,
      currency: plan.currency,
      periodEnd: sub.current_period_end!.toISOString(),
      renewal,
    };
    this.emit(NotificationEvents.SUBSCRIPTION_ACTIVATED, event);
  }

  emit<T>(event: string, dto: T) {
    try {
      this.notificationClient.emit(
        event,
        withServiceAuth(dto, this.serviceToken),
      );
    } catch (error) {
      logError(error, `${SubscriptionsService.name}.emit(${event})`);
    }
  }

  private wrap(error: unknown, message: string): RpcException {
    return error instanceof RpcException
      ? error
      : new RpcException({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message,
          error: error instanceof Error ? error.message : String(error),
        } as ServiceError);
  }
}
