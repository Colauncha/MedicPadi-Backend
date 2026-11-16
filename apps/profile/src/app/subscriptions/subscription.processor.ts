import { Inject, Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  In,
  IsNull,
  LessThan,
  LessThanOrEqual,
  Not,
  Or,
  Repository,
} from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  ChargeAuthorizationDto,
  ChargeAuthorizationResult,
  NotificationEvents,
  SubscriptionDowngradeReason,
  SubscriptionLevel,
  SubscriptionRenewalReminderEventDto,
  SubscriptionStatus,
  TransactionPatterns,
  TransactionSourceType,
} from '@medicpadi-backend/contracts';
import { logError, withServiceAuth } from '@medicpadi-backend/utils';
import { Subscription } from '../../entities/subscription.entity';
import { SubscriptionPlan } from '../../entities/subscription-plan.entity';
import { addDays, SubscriptionsService } from './subscriptions.service';
import {
  CHARGE_BATCH_SIZE,
  REMINDER_DAYS,
  SUBSCRIPTION_QUEUE,
  SubscriptionJobNames,
} from './subscriptions.constants';

/** `sub_<subscriptionId>_<periodEnd yyyymmdd>_a<attempt>`: one reference per billing attempt. */
export function renewalReference(sub: Subscription, attempt: number): string {
  const end = sub.current_period_end ?? new Date();
  const yyyymmdd = end.toISOString().slice(0, 10).replace(/-/g, '');
  return `sub_${sub.id}_${yyyymmdd}_a${attempt}`;
}

export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

@Processor(SUBSCRIPTION_QUEUE, { concurrency: 1 })
export class SubscriptionProcessor extends WorkerHost {
  private readonly logger = new Logger(SubscriptionProcessor.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(SubscriptionPlan)
    private readonly planRepo: Repository<SubscriptionPlan>,
    private readonly subscriptions: SubscriptionsService,
    private readonly configService: ConfigService,
    @Inject('TRANSACTIONS_SERVICE')
    private readonly transactionsClient: ClientProxy,
  ) {
    super();
  }

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>(
      'appConfig.internalServiceToken',
    );
  }

  async process(job: Job) {
    switch (job.name) {
      case SubscriptionJobNames.RENEWAL_REMINDER:
        return this.sendRenewalReminders();
      case SubscriptionJobNames.MONTHLY_CHARGE:
        return this.chargeDueSubscriptions();
      default:
        this.logger.warn(`Unhandled job name: ${job.name}`);
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} (${job.name}) failed after ${job.attemptsMade} attempts: ${error.message}`,
      error.stack,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: unknown) {
    this.logger.log(
      `Job ${job.id} (${job.name}) completed: ${JSON.stringify(result)}`,
    );
  }

  /**
   * Reminds paid subscribers whose period ends ~7 days from now. The window is two days
   * wide so a missed daily run still catches everyone; `reminder_sent_for_period_end` dedupes.
   */
  async sendRenewalReminders(now = new Date()) {
    const from = addDays(now, REMINDER_DAYS - 1);
    const to = addDays(now, REMINDER_DAYS + 1);
    const due = await this.subscriptionRepo.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        plan_code: Not(SubscriptionLevel.FREE),
        cancel_at_period_end: false,
        current_period_end: Between(from, to),
      },
      order: { current_period_end: 'ASC' },
    });

    let reminded = 0;
    for (const sub of due) {
      if (
        sub.reminder_sent_for_period_end &&
        sub.current_period_end &&
        sub.reminder_sent_for_period_end.getTime() ===
          sub.current_period_end.getTime()
      ) {
        continue;
      }
      try {
        const plan = await this.planRepo.findOne({
          where: { code: sub.plan_code, audience: sub.audience },
        });
        if (!plan) continue;
        const event: SubscriptionRenewalReminderEventDto = {
          userId: sub.user_id,
          subscriptionId: sub.id,
          planName: plan.name,
          amount: plan.price,
          currency: plan.currency,
          renewsOn: sub.current_period_end!.toISOString(),
          cardLast4: sub.card_last4 ?? undefined,
        };
        this.subscriptions.emit(
          NotificationEvents.SUBSCRIPTION_RENEWAL_REMINDER,
          event,
        );
        await this.subscriptionRepo.update(
          { id: sub.id },
          { reminder_sent_for_period_end: sub.current_period_end },
        );
        reminded += 1;
      } catch (error) {
        logError(
          error,
          `${SubscriptionProcessor.name}.sendRenewalReminders(${sub.id})`,
        );
      }
    }
    return { scanned: due.length, reminded };
  }

  /**
   * Charges every paid subscription whose period has ended, at most once per UTC day each.
   * Late or missed runs catch up because the scan is by `current_period_end <= now`.
   */
  async chargeDueSubscriptions(now = new Date()) {
    const today = startOfUtcDay(now);
    const stats = {
      scanned: 0,
      charged: 0,
      failed: 0,
      downgraded: 0,
      skipped: 0,
    };

    for (;;) {
      const batch = await this.subscriptionRepo.find({
        where: {
          plan_code: Not(SubscriptionLevel.FREE),
          status: In([SubscriptionStatus.ACTIVE, SubscriptionStatus.PAST_DUE]),
          current_period_end: LessThanOrEqual(now),
          last_charge_attempt_at: Or(IsNull(), LessThan(today)),
        },
        order: { current_period_end: 'ASC' },
        take: CHARGE_BATCH_SIZE,
      });
      if (batch.length === 0) break;
      stats.scanned += batch.length;

      for (const sub of batch) {
        try {
          const outcome = await this.processOne(sub, now);
          stats[outcome] += 1;
        } catch (error) {
          stats.skipped += 1;
          logError(
            error,
            `${SubscriptionProcessor.name}.chargeDueSubscriptions(${sub.id})`,
          );
        }
      }
      if (batch.length < CHARGE_BATCH_SIZE) break;
    }
    return stats;
  }

  private async processOne(
    sub: Subscription,
    now: Date,
  ): Promise<'charged' | 'failed' | 'downgraded' | 'skipped'> {
    // Atomic claim so two workers/replicas never bill the same subscription on the same day.
    const claim = await this.subscriptionRepo.update(
      {
        id: sub.id,
        last_charge_attempt_at: sub.last_charge_attempt_at
          ? sub.last_charge_attempt_at
          : IsNull(),
      },
      { last_charge_attempt_at: now },
    );
    if (!claim.affected) return 'skipped';
    sub.last_charge_attempt_at = now;

    const plan = await this.planRepo.findOne({
      where: { code: sub.plan_code, audience: sub.audience },
    });
    if (!plan) {
      this.logger.error(
        `Subscription ${sub.id}: plan ${sub.plan_code}/${sub.audience} missing`,
      );
      return 'skipped';
    }

    if (sub.cancel_at_period_end) {
      await this.subscriptions.downgrade(
        sub,
        plan,
        SubscriptionDowngradeReason.CANCELLED,
      );
      return 'downgraded';
    }

    if (
      !sub.paystack_authorization_code ||
      sub.card_reusable === false ||
      !sub.customer_email
    ) {
      const after = await this.subscriptions.applyChargeFailure(
        sub,
        plan,
        'No reusable card on file',
      );
      return after.status === SubscriptionStatus.EXPIRED
        ? 'downgraded'
        : 'failed';
    }

    const attempt = (sub.failed_attempts ?? 0) + 1;
    const reference = renewalReference(sub, attempt);
    const dto: ChargeAuthorizationDto = {
      user_id: sub.user_id,
      email: sub.customer_email,
      amount: plan.price,
      currency: plan.currency,
      authorization_code: sub.paystack_authorization_code,
      reference,
      source_id: sub.id,
      metadata: {
        user_id: sub.user_id,
        source_type: TransactionSourceType.SUBSCRIPTION,
        source_id: sub.id,
        plan: sub.plan_code,
        attempt,
      },
    };

    let result: ChargeAuthorizationResult;
    try {
      result = await firstValueFrom(
        this.transactionsClient.send(
          TransactionPatterns.TRANSACTIONS.CHARGE_AUTHORIZATION,
          withServiceAuth(dto, this.serviceToken),
        ),
      );
    } catch (error) {
      // Outcome unknown (transport or Paystack 5xx): leave the state alone and retry tomorrow.
      logError(error, `${SubscriptionProcessor.name}.charge(${sub.id})`);
      return 'skipped';
    }

    // The charge.success webhook may already have activated this reference.
    const fresh = await this.subscriptionRepo.findOne({
      where: { id: sub.id },
    });
    if (!fresh) return 'skipped';
    if (fresh.last_transaction_reference === reference) return 'charged';

    if (result?.success) {
      await this.subscriptions.applyChargeSuccess(fresh, plan, result);
      return 'charged';
    }
    const after = await this.subscriptions.applyChargeFailure(
      fresh,
      plan,
      result?.gatewayResponse,
    );
    return after.status === SubscriptionStatus.EXPIRED
      ? 'downgraded'
      : 'failed';
  }
}
