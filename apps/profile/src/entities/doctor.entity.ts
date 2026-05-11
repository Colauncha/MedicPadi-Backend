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
  user_id!: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  firstName?: string | null;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  lastName?: string | null;

  @Column({
    type: 'enum',
    enum: DoctorsGender,
    default: DoctorsGender.Male,
  })
  gender?: DoctorsGender;

  @Column({
    type: 'varchar',
    nullable: true,
    unique: true,
  })
  licenceNumber?: string | null;

  @Column({
    type: 'enum',
    enum: DoctorsSpecialies,
    nullable: false,
    default: DoctorsSpecialies.General,
  })
  speciality?: DoctorsSpecialies;

  @Column({
    type: 'varchar',
    length: 240,
    nullable: true,
  })
  bio?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  costPerSession?: number;

  @Column({ type: 'int', nullable: true, default: 30 })
  sessionLength?: number;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  profilePicture: { public_id: string; url: string } = {
    public_id: '',
    url: '',
  };
}
