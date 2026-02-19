import { Transform } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { AuthRole } from '../../enums/auth.enum';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  MinLength,
  MaxLength,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class CreateAuthDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  email!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(100)
  password!: string;

  @ApiPropertyOptional()
  @IsEnum(AuthRole)
  @IsOptional()
  @IsNotEmpty()
  role: AuthRole = AuthRole.PATIENT;

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
  phoneNumber = '+2340000000000';

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  @IsNotEmpty()
  isVerified = false;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  @IsNotEmpty()
  createdAt = new Date().toISOString();
}
