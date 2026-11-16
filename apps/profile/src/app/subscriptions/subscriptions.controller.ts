import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  AdminUpdatePlanDto,
  SubscribeRequestDto,
  SubscriptionAudience,
  SubscriptionJobName,
  SubscriptionOwnerDto,
  SubscriptionPatterns,
  SubscriptionPaymentResultDto,
} from '@medicpadi-backend/contracts';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionSchedulerService } from './subscription-scheduler.service';

@Controller()
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly scheduler: SubscriptionSchedulerService,
  ) {}

  @MessagePattern(SubscriptionPatterns.FIND_PLANS)
  findPlans(@Payload('data') data: { audience?: SubscriptionAudience }) {
    return this.subscriptionsService.findPlans(data?.audience);
  }

  @MessagePattern(SubscriptionPatterns.GET_MINE)
  getMine(@Payload('data') data: SubscriptionOwnerDto) {
    return this.subscriptionsService.getMine(data.userId, data.role);
  }

  @MessagePattern(SubscriptionPatterns.SUBSCRIBE)
  subscribe(@Payload('data') data: SubscribeRequestDto) {
    return this.subscriptionsService.subscribe(data);
  }

  @MessagePattern(SubscriptionPatterns.ACTIVATE)
  activate(@Payload('data') data: SubscriptionPaymentResultDto) {
    return this.subscriptionsService.activate(data);
  }

  @MessagePattern(SubscriptionPatterns.CANCEL)
  cancel(@Payload('data') data: SubscriptionOwnerDto) {
    return this.subscriptionsService.cancel(data.userId, data.role);
  }

  @MessagePattern(SubscriptionPatterns.ADMIN_UPDATE_PLAN)
  adminUpdatePlan(@Payload('data') data: AdminUpdatePlanDto) {
    return this.subscriptionsService.adminUpdatePlan(data);
  }

  @MessagePattern(SubscriptionPatterns.RUN_JOB)
  runJob(@Payload('data') data: { job: SubscriptionJobName }) {
    return this.scheduler.runJob(data.job);
  }
}
