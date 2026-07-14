import { BaseClass, ReviewedProfileType } from '@medicpadi-backend/contracts';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Doctor } from './doctor.entity';
import { Pharmacy } from './pharmacy.entity';
import { Laboratory } from './laboratory.entity';
import { Patient } from './patient.entity';

@Entity()
export class Reviews extends BaseClass {
  @Column({ type: 'varchar', nullable: false })
  message!: string;

  @Column({ type: 'enum', enum: ReviewedProfileType, nullable: false })
  profile_type!: ReviewedProfileType;

  @Column({ type: 'uuid', nullable: true })
  doctor_id?: string | null;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'doctor_id' })
  doctor?: Doctor | null;

  @Column({ type: 'uuid', nullable: true })
  pharmacy_id?: string | null;

  @ManyToOne(() => Pharmacy, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'pharmacy_id' })
  pharmacy?: Pharmacy | null;

  @Column({ type: 'uuid', nullable: true })
  laboratory_id?: string | null;

  @ManyToOne(() => Laboratory, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'laboratory_id' })
  laboratory?: Laboratory | null;

  @Column({ type: 'uuid', nullable: false })
  reviewer_id!: string;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer!: Patient;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  rating!: number;
}
