import {
  BaseClass,
  PaymentGateway,
  PaymentStatus,
  TransactionSourceType,
} from '@medicpadi-backend/contracts';
import { Column, Entity } from 'typeorm';

@Entity('transactions')
export class Transaction extends BaseClass {
  @Column({ type: 'uuid', nullable: false })
  user_id!: string;

  @Column({ type: 'enum', enum: TransactionSourceType })
  source_type!: TransactionSourceType;

  @Column({ type: 'uuid', nullable: true })
  source_id?: string;

  @Column({ type: 'uuid', nullable: true })
  provider_id?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  amount!: number;

  @Column({ type: 'varchar', default: 'NGN' })
  currency!: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  payment_status!: PaymentStatus;

  @Column({ type: 'enum', enum: PaymentGateway, nullable: true })
  gateway?: PaymentGateway;

  @Column({ type: 'varchar', nullable: true })
  gateway_reference?: string;

  @Column({ type: 'varchar', nullable: true })
  access_code?: string;
}