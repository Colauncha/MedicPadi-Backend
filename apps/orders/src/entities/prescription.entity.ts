import { BaseClass, PrescriptionStatus } from '@medicpadi-backend/contracts';
import { Column, Entity } from 'typeorm';

@Entity('prescriptions')
export class Prescription extends BaseClass {
  @Column({ type: 'uuid', nullable: true })
  appointment_id?: string;

  @Column({ type: 'uuid', nullable: false })
  patient_id!: string;

  @Column({ type: 'uuid', nullable: false })
  provider_id!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({
    type: 'enum',
    enum: PrescriptionStatus,
    default: PrescriptionStatus.ISSUED,
  })
  status!: PrescriptionStatus;

  @Column({ type: 'boolean', default: true })
  is_electronic!: boolean;
}