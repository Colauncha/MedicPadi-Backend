import { BaseClass } from '@medicpadi-backend/contracts';
import { Column, Entity } from 'typeorm';

@Entity('prescription_items')
export class PrescriptionItem extends BaseClass {
  @Column({ type: 'uuid', nullable: false })
  prescription_id!: string;

  @Column({ type: 'varchar', nullable: false })
  medication_name!: string;

  @Column({ type: 'varchar', nullable: false })
  dosage!: string;

  @Column({ type: 'varchar', nullable: false })
  frequency!: string;

  @Column({ type: 'int', nullable: true })
  duration_days?: number;

  @Column({ type: 'text', nullable: true })
  instructions?: string;
}