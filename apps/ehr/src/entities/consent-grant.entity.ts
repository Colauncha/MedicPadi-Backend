import {
  AuthRole,
  BaseClass,
  ConsentAccessLevel,
  ConsentStatus,
} from '@medicpadi-backend/contracts';
import { Column, Entity } from 'typeorm';

@Entity('consent_grants')
export class ConsentGrant extends BaseClass {
  @Column({ type: 'uuid', nullable: false })
  patient_id!: string;

  @Column({ type: 'uuid', nullable: false })
  granted_to_user_id!: string;

  @Column({ type: 'enum', enum: AuthRole })
  grantee_role!: AuthRole;

  @Column({ type: 'enum', enum: ConsentAccessLevel })
  access_level!: ConsentAccessLevel;

  @Column({
    type: 'enum',
    enum: ConsentStatus,
    default: ConsentStatus.ACTIVE,
  })
  status!: ConsentStatus;

  @Column({ type: 'timestamp', nullable: true })
  expires_at?: Date;
}