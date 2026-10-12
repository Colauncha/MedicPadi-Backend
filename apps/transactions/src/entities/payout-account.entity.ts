import { BaseClass } from '@medicpadi-backend/contracts';
import { Column, Entity, Unique } from 'typeorm';

@Entity('payout_accounts')
@Unique('UQ_payout_accounts_user_id', ['user_id'])
export class PayoutAccount extends BaseClass {
  @Column({ type: 'uuid', nullable: false })
  user_id!: string;

  @Column({ type: 'varchar' })
  bank_code!: string;

  @Column({ type: 'varchar' })
  bank_name!: string;

  @Column({ type: 'varchar' })
  account_number!: string;

  @Column({ type: 'varchar' })
  account_name!: string;

  // Paystack transfer recipient the payouts are sent to
  @Column({ type: 'varchar' })
  recipient_code!: string;

  @Column({ type: 'varchar', default: 'NGN' })
  currency!: string;
}
