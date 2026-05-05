import { BaseClass, PaymentStatus, RequisitionStatus } from '@medicpadi-backend/contracts';
import { Column, Entity } from 'typeorm';

@Entity('drug_requisitions')
export class DrugRequisition extends BaseClass {
  @Column({ type: 'uuid', nullable: false })
  patient_id!: string;

  @Column({ type: 'uuid', nullable: false })
  pharmacy_id!: string;

  @Column({ type: 'uuid', nullable: true })
  prescription_id?: string;

  @Column({
    type: 'enum',
    enum: RequisitionStatus,
    default: RequisitionStatus.PENDING,
  })
  status!: RequisitionStatus;

  @Column({ type: 'text', nullable: true })
  delivery_address?: string;

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