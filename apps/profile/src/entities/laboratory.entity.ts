import { BaseClass, BusinessHoursDto } from '@medicpadi-backend/contracts';
import { Column, Entity } from 'typeorm';

@Entity()
export class Laboratory extends BaseClass {
  @Column({
    type: 'uuid',
    unique: true,
    nullable: false,
  })
  user_id: string;

  @Column({
    type: 'varchar',
    unique: true,
    nullable: true,
  })
  name: string;

  @Column({
    type: 'varchar',
    unique: true,
    nullable: true,
  })
  registrationNumber: string;

  @Column({
    type: 'varchar',
    unique: true,
    nullable: true,
  })
  address: string;

  @Column({
    type: 'jsonb',
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
    monday: { start: new Date().setHours(9), end: new Date().setHours(17) },
    tuesday: { start: new Date().setHours(9), end: new Date().setHours(17) },
    wednesday: { start: new Date().setHours(9), end: new Date().setHours(17) },
    thursday: { start: new Date().setHours(9), end: new Date().setHours(17) },
    friday: { start: new Date().setHours(9), end: new Date().setHours(17) },
    saturday: { start: new Date().setHours(9), end: new Date().setHours(17) },
    sunday: { start: 'closed', end: 'closed' },
  };
}
