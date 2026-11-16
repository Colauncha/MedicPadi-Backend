import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { SubscriptionLevel } from '../../../enums/auth.enum';
import { SubscriptionDowngradeReason } from '../../../enums/subscription.enum';

export class SubscriptionActivatedEventDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  subscriptionId!: string;

  @IsEnum(SubscriptionLevel)
  planCode!: SubscriptionLevel;

  @IsString()
  planName!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  currency!: string;

  /** ISO date the current period ends. */
  @IsString()
  periodEnd!: string;

  /** true for a monthly renewal, false for a first activation or plan change. */
  @IsBoolean()
  renewal!: boolean;
}

export class SubscriptionRenewalReminderEventDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  subscriptionId!: string;

  @IsString()
  planName!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  currency!: string;

  /** ISO date the plan renews (and the card is charged). */
  @IsString()
  renewsOn!: string;

  @IsOptional()
  @IsString()
  cardLast4?: string;
}

export class SubscriptionPaymentFailedEventDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  subscriptionId!: string;

  @IsString()
  planName!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  currency!: string;

  @IsInt()
  attempt!: number;

  @IsInt()
  maxAttempts!: number;

  /** ISO date after which the plan is downgraded to Free. */
  @IsString()
  graceUntil!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class SubscriptionDowngradedEventDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  subscriptionId!: string;

  @IsString()
  previousPlanName!: string;

  @IsEnum(SubscriptionDowngradeReason)
  reason!: SubscriptionDowngradeReason;
}
