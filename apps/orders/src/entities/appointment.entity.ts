import { AppointmentStatus, BaseClass } from '@medicpadi-backend/contracts';
import { Column } from 'typeorm';

export class Appointment extends BaseClass {
  @Column({
    type: 'uuid',
    nullable: false,
  })
  provider_id!: string;

  @Column({
    type: 'uuid',
    nullable: false,
  })
  patient_id!: string;

  @Column({
    type: 'date',
    nullable: false,
  })
  appointment_date!: Date;

  @Column({
    type: 'text',
    nullable: false,
  })
  description!: string;

  @Column({
    type: 'text',
    nullable: false,
  })
  meeting_link!: string;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.PENDING,
  })
  status!: string;
}
