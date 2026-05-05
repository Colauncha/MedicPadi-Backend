import { BaseClass, PaymentStatus, RequisitionStatus } from '@medicpadi-backend/contracts';
import { Column, Entity } from 'typeorm';

@Entity('test_requisitions')
export class TestRequisition extends BaseClass {
  @Column({ type: 'uuid', nullable: false })
  patient_id!: string;

  @Column({ type: 'uuid', nullable: false })
  lab_id!: string;

  @Column({ type: 'uuid', nullable: true })
  referring_provider_id?: string;

  @Column({
    type: 'enum',
    enum: RequisitionStatus,
    default: RequisitionStatus.PENDING,
  })
  status!: RequisitionStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  total_amount?: number;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  payment_status!: PaymentStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}