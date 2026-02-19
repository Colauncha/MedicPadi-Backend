import {
  BaseClass,
  BloodGroup,
  Genotype,
  PatientGender,
} from '@medicpadi-backend/contracts';
import { Column, Entity } from 'typeorm';

@Entity()
export class Patient extends BaseClass {
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
    enum: PatientGender,
    default: PatientGender.Male,
  })
  gender: PatientGender;

  @Column({
    type: 'enum',
    enum: BloodGroup,
    default: BloodGroup.O_NEGATIVE,
  })
  bloodGroup: BloodGroup;

  @Column({
    type: 'enum',
    enum: Genotype,
    default: Genotype.AA,
  })
  genotype: Genotype;

  @Column({
    type: 'json',
    array: true,
    nullable: true,
  })
  allergies: string[];

  @Column({
    type: 'varchar',
    nullable: true,
    length: 14,
  })
  emergencyContact: string;
}
