import { Entity, Column, OneToMany } from 'typeorm';
import {
  DoctorsSpecialies,
  BaseClass,
  DoctorsGender,
  SettingsDto,
  BusinessHoursDto,
} from '@medicpadi-backend/contracts';
import { Reviews } from './reviews.entity';

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
    length: 14,
  })
  phoneNumber?: string | null;

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
  costPerSession?: number | null;

  @Column({ type: 'int', nullable: true, default: 30 })
  sessionLength?: number | null;

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
    default: [],
  })
  education: { institution: string; degree: string }[] = [];

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
  placeOfWork?: string | null;

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

  @OneToMany(() => Reviews, (review) => review.doctor)
  reviews!: Reviews[];

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  rating!: number;

  @Column({
    type: 'int',
    nullable: true,
  })
  totalReviews?: number | null;
}
