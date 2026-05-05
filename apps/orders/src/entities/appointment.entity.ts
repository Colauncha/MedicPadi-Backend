import { AppointmentStatus, BaseClass } from '@medicpadi-backend/contracts';
import { Column, Entity } from 'typeorm';

@Entity('appointments')
export class Appointment extends BaseClass {
  @Column({ type: 'uuid', nullable: false })
  provider_id!: string;

  @Column({ type: 'uuid', nullable: false })
  patient_id!: string;

  @Column({ type: 'timestamp', nullable: false })
  appointment_time!: Date;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  meeting_link?: string;

  @Column({ type: 'text', nullable: true })
  join_link?: string;

  @Column({ type: 'int', nullable: true })
  meeting_id?: number;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.PENDING,
  })
  status!: AppointmentStatus;
}
