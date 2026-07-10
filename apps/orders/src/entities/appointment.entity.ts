import {
  AppointmentPaymentStatus,
  AppointmentStatus,
  BaseClass,
} from '@medicpadi-backend/contracts';
import { Column, Entity, Index } from 'typeorm';

@Entity('appointments')
export class Appointment extends BaseClass {
  @Index()
  @Column({ type: 'uuid', nullable: false })
  provider_id!: string;

  @Index()
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

  @Column({ type: 'bigint', nullable: true })
  meeting_id?: number;

  @Column({ type: 'text', nullable: true })
  meeting_password?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  sessionCost?: number;

  @Column({ type: 'int', nullable: true, default: 1 })
  sessions?: number;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.PENDING,
  })
  status!: AppointmentStatus;

  @Column({
    type: 'enum',
    enum: AppointmentPaymentStatus,
    default: AppointmentPaymentStatus.P_PENDING,
  })
  paymentStatus!: AppointmentPaymentStatus;

  @Column({ type: 'text', nullable: true })
  doctorsNote?: string;
}
