import { Inject, Injectable } from '@nestjs/common';
import {
  AdminUpdatePlanDto,
  AuthRole,
  SubscribeRequestDto,
  SubscriptionAudience,
  SubscriptionJobName,
  SubscriptionOwnerDto,
  SubscriptionPatterns,
} from '@medicpadi-backend/contracts';
import { withServiceAuth, logError } from '@medicpadi-backend/utils';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SubscriptionsService {
  constructor(
    @Inject('PROFILE_SERVICE') private readonly profileClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  private get serviceToken(): string {
    return this.configService.getOrThrow<string>(
      'appConfig.internalServiceToken',
    );
  }

  private audienceFor(role: AuthRole): SubscriptionAudience | undefined {
    if (role === AuthRole.PATIENT) return SubscriptionAudience.PATIENT;
    if (role === AuthRole.ADMIN) return undefined;
    return SubscriptionAudience.PROVIDER;
  }

  private send<T = unknown>(pattern: string, data: unknown, context: string) {
    return firstValueFrom(
      this.profileClient.send<T>(
        pattern,
        withServiceAuth(data, this.serviceToken),
      ),
    ).catch((error) => {
      logError(error, `${SubscriptionsService.name}.${context}`);
      throw error;
    });
  }

  findPlans(role: AuthRole) {
    return this.send(
      SubscriptionPatterns.FIND_PLANS,
      { audience: this.audienceFor(role) },
      'findPlans',
    );
  }

  getMine(owner: SubscriptionOwnerDto) {
    return this.send(SubscriptionPatterns.GET_MINE, owner, 'getMine');
  }

  subscribe(dto: SubscribeRequestDto) {
    return this.send(SubscriptionPatterns.SUBSCRIBE, dto, 'subscribe');
  }

  cancel(owner: SubscriptionOwnerDto) {
    return this.send(SubscriptionPatterns.CANCEL, owner, 'cancel');
  }

  adminUpdatePlan(dto: AdminUpdatePlanDto) {
    return this.send(
      SubscriptionPatterns.ADMIN_UPDATE_PLAN,
      dto,
      'adminUpdatePlan',
    );
  }

  runJob(job: SubscriptionJobName) {
    return this.send(SubscriptionPatterns.RUN_JOB, { job }, 'runJob');
  }
}
