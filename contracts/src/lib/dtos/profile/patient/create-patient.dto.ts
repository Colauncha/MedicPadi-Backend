import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  PatientGender,
  BloodGroup,
  Genotype,
} from '@medicpadi-backend/contracts';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  user_id!: string;

  @IsString()
  @IsOptional()
  @MinLength(3)
  firstName?: string;

  @IsString()
  @IsOptional()
  @MinLength(3)
  lastName?: string;

  @IsEnum(PatientGender)
  gender?: PatientGender = PatientGender.Male;

  bloodGroup?: BloodGroup;

  genotype?: Genotype;

  allergies?: string[];

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(14)
  @Transform(({ value }) => {
    if (value && value.length === 10) {
      return '+234' + value; // Prepend +234 if it's a 10-digit number
    } else if (value && value.length === 11 && value.startsWith('0')) {
      return '+234' + value.substring(1); // Replace leading 0 with +234
    }
    return value;
  })
  emergencyContact?: string;
}
