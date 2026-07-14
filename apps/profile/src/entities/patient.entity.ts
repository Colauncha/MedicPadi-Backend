import {
  BaseClass,
  BloodGroup,
  Genotype,
  NextOfKinDto,
  PatientGender,
  SettingsDto,
} from '@medicpadi-backend/contracts';
import { Column, Entity, OneToMany } from 'typeorm';
import { Reviews } from './reviews';

@Entity()
export class Patient extends BaseClass {
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
    enum: PatientGender,
    default: PatientGender.Male,
  })
  gender?: PatientGender;

  @Column({
    type: 'enum',
    enum: BloodGroup,
    default: BloodGroup.O_POSITIVE,
  })
  bloodGroup?: BloodGroup;

  @Column({
    type: 'enum',
    enum: Genotype,
    default: Genotype.AA,
  })
  genotype?: Genotype;

  @Column({
    type: 'text',
    array: true,
    nullable: true,
  })
  allergies?: string[];

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  height?: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  weight?: number | null;

  @Column({
    type: 'date',
    nullable: true,
  })
  dateOfBirth?: Date | String | null;

  @Column({
    type: 'varchar',
    nullable: true,
    length: 14,
  })
  phoneNumber?: string | null;

  @Column({
    type: 'varchar',
    nullable: true,
    length: 14,
  })
  emergencyContact?: string | null;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  nextOfKin?: NextOfKinDto | null;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  profilePicture: { public_id: string; url: string } = {
    public_id: '',
    url: '',
  };

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

  @OneToMany(() => Reviews, (review) => review.reviewer)
  reviewsWritten!: Reviews[];
}
