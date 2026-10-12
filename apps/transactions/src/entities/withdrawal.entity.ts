import { BaseClass, WithdrawalStatus } from '@medicpadi-backend/contracts';
import { decimalTransformer } from '@medicpadi-backend/utils';
import { Column, Entity, Index, Unique } from 'typeorm';

@Entity('withdrawals')
@Unique('UQ_withdrawals_reference', ['reference'])
export class Withdrawal extends BaseClass {
  @Index('IDX_withdrawals_user_id')
  @Column({ type: 'uuid', nullable: false })
  user_id!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: false,
    transformer: decimalTransformer,
  })
  amount!: number;

  @Column({ type: 'varchar', default: 'NGN' })
  currency!: string;

  @Column({
    type: 'enum',
    enum: WithdrawalStatus,
    default: WithdrawalStatus.PENDING,
  })
  status!: WithdrawalStatus;

  // Our reference, sent to Paystack and echoed back in transfer.* webhooks
  @Column({ type: 'varchar' })
  reference!: string;

  @Column({ type: 'varchar', nullable: true })
  transfer_code?: string;

  @Column({ type: 'varchar' })
  recipient_code!: string;

  @Column({ type: 'varchar', nullable: true })
  failure_reason?: string;
}
