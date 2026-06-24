import { BaseClass, BusinessHoursDto, SettingsDto } from '@medicpadi-backend/contracts';
import { Column, Entity } from 'typeorm';

@Entity()
export class Pharmacy extends BaseClass {
  @Column({
    type: 'uuid',
    unique: true,
    nullable: false,
  })
  user_id!: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  name?: string | null;

  @Column({
    type: 'varchar',
    nullable: true,
    length: 14,
  })
  phoneNumber?: string | null;

  @Column({
    type: 'varchar',
    unique: true,
    nullable: true,
  })
  registrationNumber?: string | null;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  address?: string | null;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  profilePicture: { public_id: string; url: string } = {
    public_id: '',
    url: '',
  };

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  businessHours: BusinessHoursDto = {
    monday: { start: 9, end: 17 },
    tuesday: { start: 9, end: 17 },
    wednesday: { start: 9, end: 17 },
    thursday: { start: 9, end: 17 },
    friday: { start: 9, end: 17 },
    saturday: { start: 9, end: 17 },
    sunday: { start: 'closed', end: 'closed' },
  };

  @Column({
    type: 'varchar',
    nullable: true,
  })
  about?: string | null;

  @Column({
    type: 'int',
    nullable: true,
  })
  yearsOfService?: number | null;

  @Column({
    type: 'int',
    nullable: true,
  })
  awards?: number | null;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  settings: SettingsDto = new SettingsDto();

  @Column({
    type: 'boolean',
    default: false,
  })
  isProfileComplete: boolean = false;
}
