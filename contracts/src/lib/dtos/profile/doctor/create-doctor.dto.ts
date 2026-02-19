import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { DoctorsGender, DoctorsSpecialies } from '@medicpadi-backend/contracts';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDoctorDto {
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
  @IsEnum(DoctorsGender)
  gender?: DoctorsGender = DoctorsGender.Male;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MinLength(3)
  licenceNumber?: string;

  @ApiPropertyOptional()
  @IsEnum(DoctorsSpecialies)
  speciality?: DoctorsSpecialies = DoctorsSpecialies.General;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(240)
  bio?: string;
}
