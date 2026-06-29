import {
  BaseClass,
  BloodGroup,
  Genotype,
  NextOfKinDto,
  PatientGender,
  SettingsDto,
} from '@medicpadi-backend/contracts';
import { Column, Entity } from 'typeorm';

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
    type: 'json',
    array: true,
    nullable: true,
  })
  allergies?: string[];

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
}
