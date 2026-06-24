import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
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
  @MinLength(5)
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
    if (value && value.length === 10) return '+234' + value;
    if (value && value.length === 11 && value.startsWith('0'))
      return '+234' + value.substring(1);
    return value;
  })
  phoneNumber?: string;

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

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  @IsNotEmpty()
  earlyUser = false;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  fullName?: string;
}
