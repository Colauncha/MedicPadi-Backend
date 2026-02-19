import { Entity, Column } from 'typeorm';
import {
  DoctorsSpecialies,
  BaseClass,
  DoctorsGender,
} from '@medicpadi-backend/contracts';

@Entity()
export class Doctor extends BaseClass {
  @Column({
    type: 'uuid',
    unique: true,
    nullable: false,
  })
  user_id: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  firstName: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  lastName: string;

  @Column({
    type: 'enum',
    enum: DoctorsGender,
    default: DoctorsGender.Male,
  })
  gender: DoctorsGender;

  @Column({
    type: 'varchar',
    nullable: true,
    unique: true,
  })
  licenceNumber: string;

  @Column({
    type: 'enum',
    enum: DoctorsSpecialies,
    nullable: false,
    default: DoctorsSpecialies.General,
  })
  speciality: DoctorsSpecialies;

  @Column({
    type: 'varchar',
    length: 240,
    nullable: true,
  })
  bio: string;
}
