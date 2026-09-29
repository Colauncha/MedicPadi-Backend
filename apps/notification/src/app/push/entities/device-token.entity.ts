import { BaseClass, PushPlatform } from '@medicpadi-backend/contracts';
import { Column, Entity, Index } from 'typeorm';

@Entity('device_tokens')
export class DeviceToken extends BaseClass {
  @Index()
  @Column({ type: 'uuid', nullable: false })
  user_id!: string;

  @Column({ type: 'enum', enum: PushPlatform })
  platform!: PushPlatform;

  // Expo push token for ios/android, subscription endpoint for web
  @Column({ type: 'varchar', length: 1024, unique: true })
  token!: string;

  @Column({ type: 'jsonb', nullable: true })
  web_push_keys?: { p256dh: string; auth: string } | null;

  @Column({ type: 'varchar', nullable: true })
  device_name?: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  last_seen_at!: Date;
}
