import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { DoctorsGender, DoctorsSpecialies } from '@medicpadi-backend/contracts';

export class CreateDoctorDto {
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

  @IsEnum(DoctorsGender)
  gender?: DoctorsGender = DoctorsGender.Male;

  @IsString()
  @IsOptional()
  @MinLength(3)
  licenceNumber?: string;

  @IsEnum(DoctorsSpecialies)
  speciality?: DoctorsSpecialies = DoctorsSpecialies.General;

  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(240)
  bio?: string;
}
