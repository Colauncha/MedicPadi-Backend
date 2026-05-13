import { BaseClass } from '@medicpadi-backend/contracts';
import { Column, Entity } from 'typeorm';

@Entity('wallets')
export class Wallet extends BaseClass {
  @Column({ type: 'uuid', nullable: false })
  user_id!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance!: number;

  @Column({ type: 'varchar', default: 'NGN' })
  currency!: string;
}
