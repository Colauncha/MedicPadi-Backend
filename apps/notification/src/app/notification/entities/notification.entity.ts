import { BaseClass, NotificationChannel, NotificationType } from '@medicpadi-backend/contracts';
import { Column, Entity } from 'typeorm';

@Entity('notifications')
export class Notification extends BaseClass {
  @Column({ type: 'uuid', nullable: false })
  user_id!: string;

  @Column({ type: 'varchar', nullable: false })
  title!: string;

  @Column({ type: 'text', nullable: false })
  body!: string;

  @Column({ type: 'enum', enum: NotificationType })
  type!: NotificationType;

  @Column({ type: 'uuid', nullable: true })
  source_id?: string;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel!: NotificationChannel;

  @Column({ type: 'boolean', default: false })
  is_read!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  sent_at?: Date;
}