import { BaseClass, EhrSourceType } from '@medicpadi-backend/contracts';
import { Column, Entity } from 'typeorm';

@Entity('ehr_records')
export class EhrRecord extends BaseClass {
  @Column({ type: 'uuid', nullable: false })
  patient_id!: string;

  @Column({ type: 'uuid', nullable: true })
  provider_id?: string;

  @Column({ type: 'enum', enum: EhrSourceType })
  source_type!: EhrSourceType;

  @Column({ type: 'uuid', nullable: true })
  source_id?: string;

  @Column({ type: 'text', nullable: false })
  content_encrypted!: string;
}