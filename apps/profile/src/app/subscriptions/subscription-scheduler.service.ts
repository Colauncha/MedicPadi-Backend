import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import {
  ServiceError,
  SubscriptionJobName,
} from '@medicpadi-backend/contracts';
import {
  SUBSCRIPTION_QUEUE,
  SubscriptionJobNames,
  SubscriptionSchedulerIds,
} from './subscriptions.constants';

/**
 * Registers the two daily repeatable jobs. `upsertJobScheduler` is idempotent per id,
 * so every replica can call it and BullMQ still runs each tick exactly once.
 */
@Injectable()
export class SubscriptionSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionSchedulerService.name);

  constructor(
    @InjectQueue(SUBSCRIPTION_QUEUE) private readonly queue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const reminderCron =
      this.configService.get<string>('appConfig.subscriptionReminderCron') ??
      '0 9 * * *';
    const chargeCron =
      this.configService.get<string>('appConfig.subscriptionChargeCron') ??
      '0 2 * * *';

    try {
      await this.queue.upsertJobScheduler(
        SubscriptionSchedulerIds.RENEWAL_REMINDER,
        { pattern: reminderCron },
        { name: SubscriptionJobNames.RENEWAL_REMINDER },
      );
      await this.queue.upsertJobScheduler(
        SubscriptionSchedulerIds.MONTHLY_CHARGE,
        { pattern: chargeCron },
        { name: SubscriptionJobNames.MONTHLY_CHARGE },
      );
      this.logger.log(
        `Subscription jobs scheduled (reminder "${reminderCron}", charge "${chargeCron}")`,
      );
    } catch (error) {
      // Don't take the profile service down over Redis; the API still works without the jobs.
      this.logger.error(
        `Unable to schedule subscription jobs: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /** Enqueues one ad-hoc run of a job (admin/debug). */
  async runJob(job: SubscriptionJobName) {
    const name =
      job === SubscriptionJobName.REMINDER
        ? SubscriptionJobNames.RENEWAL_REMINDER
        : job === SubscriptionJobName.CHARGE
          ? SubscriptionJobNames.MONTHLY_CHARGE
          : null;
    if (!name) {
      throw new RpcException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Unknown subscription job "${job}"`,
      } as ServiceError);
    }
    const queued = await this.queue.add(
      name,
      { manual: true },
      { jobId: `manual-${job}-${Date.now()}`, removeOnComplete: true },
    );
    return { queued: true, jobId: queued.id, name };
  }
}
