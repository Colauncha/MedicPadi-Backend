import { Column, Entity, Unique } from 'typeorm';
import {
  BaseClass,
  SubscriptionAudience,
  SubscriptionLevel,
} from '@medicpadi-backend/contracts';
import { decimalTransformer } from '@medicpadi-backend/utils';

/** Plan catalogue. A plan is identified by (code, audience): FREE exists for both audiences. */
@Entity('subscription_plans')
@Unique(['code', 'audience'])
export class SubscriptionPlan extends BaseClass {
  @Column({ type: 'enum', enum: SubscriptionLevel, nullable: false })
  code!: SubscriptionLevel;

  @Column({ type: 'enum', enum: SubscriptionAudience, nullable: false })
  audience!: SubscriptionAudience;

  @Column({ type: 'varchar', nullable: false })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  description?: string | null;

  /** Monthly price in `currency` (NGN). */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    default: 0,
    transformer: decimalTransformer,
  })
  price!: number;

  @Column({ type: 'varchar', default: 'NGN' })
  currency!: string;

  @Column({ type: 'varchar', default: 'monthly' })
  interval!: string;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  features?: string[] | null;

  @Column({ type: 'int', default: 0 })
  sort_order!: number;
}
