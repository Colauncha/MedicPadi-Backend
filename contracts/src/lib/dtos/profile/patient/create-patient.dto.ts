import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  IsEnum,
  MaxLength,
  IsArray,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  PatientGender,
  BloodGroup,
  Genotype,
} from '@medicpadi-backend/contracts';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePatientDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  user_id!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MinLength(3)
  firstName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MinLength(3)
  lastName?: string;

  @ApiPropertyOptional()
  @IsEnum(PatientGender)
  @IsOptional()
  gender?: PatientGender = PatientGender.Male;

  @ApiPropertyOptional()
  @IsEnum(BloodGroup)
  @IsOptional()
  bloodGroup?: BloodGroup = BloodGroup.O_POSITIVE;

  @ApiPropertyOptional()
  @IsEnum(Genotype)
  @IsOptional()
  genotype?: Genotype = Genotype.AA;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @MinLength(3, { each: true })
  @IsOptional()
  allergies?: string[];

  @ApiPropertyOptional()
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
