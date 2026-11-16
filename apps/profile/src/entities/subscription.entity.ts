import { Column, Entity, Index } from 'typeorm';
import {
  AuthRole,
  BaseClass,
  SubscriptionAudience,
  SubscriptionLevel,
  SubscriptionStatus,
} from '@medicpadi-backend/contracts';

/**
 * One row per user. Absence of a row means the Free plan.
 * `pending_plan_code` is set while a checkout is awaiting payment.
 * `cancel_at_period_end` keeps access until `current_period_end`, then the charge job expires it.
 */
@Entity('subscriptions')
@Index(['status', 'current_period_end'])
export class Subscription extends BaseClass {
  @Column({ type: 'uuid', unique: true, nullable: false })
  user_id!: string;

  @Column({ type: 'enum', enum: AuthRole, nullable: false })
  role!: AuthRole;

  @Column({ type: 'enum', enum: SubscriptionAudience, nullable: false })
  audience!: SubscriptionAudience;

  @Column({
    type: 'enum',
    enum: SubscriptionLevel,
    default: SubscriptionLevel.FREE,
  })
  plan_code!: SubscriptionLevel;

  @Column({ type: 'enum', enum: SubscriptionLevel, nullable: true })
  pending_plan_code?: SubscriptionLevel | null;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status!: SubscriptionStatus;

  @Column({ type: 'boolean', default: false })
  cancel_at_period_end!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  current_period_start?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  current_period_end?: Date | null;

  /** Set on the first failed renewal; the plan is downgraded once this passes. */
  @Column({ type: 'timestamptz', nullable: true })
  grace_until?: Date | null;

  @Column({ type: 'int', default: 0 })
  failed_attempts!: number;

  /** Claim marker so a subscription is charged at most once per day across replicas. */
  @Column({ type: 'timestamptz', nullable: true })
  last_charge_attempt_at?: Date | null;

  /** Period end for which the 7-day renewal reminder was already sent. */
  @Column({ type: 'timestamptz', nullable: true })
  reminder_sent_for_period_end?: Date | null;

  @Column({ type: 'varchar', nullable: true })
  paystack_authorization_code?: string | null;

  @Column({ type: 'boolean', nullable: true })
  card_reusable?: boolean | null;

  @Column({ type: 'varchar', length: 4, nullable: true })
  card_last4?: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true })
  card_exp_month?: string | null;

  @Column({ type: 'varchar', length: 4, nullable: true })
  card_exp_year?: string | null;

  @Column({ type: 'varchar', nullable: true })
  card_type?: string | null;

  @Column({ type: 'varchar', nullable: true })
  card_bank?: string | null;

  @Column({ type: 'varchar', nullable: true })
  card_signature?: string | null;

  @Column({ type: 'varchar', nullable: true })
  customer_email?: string | null;

  @Column({ type: 'varchar', nullable: true })
  last_transaction_reference?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  cancelled_at?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  downgraded_at?: Date | null;
}
