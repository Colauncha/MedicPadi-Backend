// import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuthRole } from '../../enums/auth.enum';
import {
  IsNotEmpty,
  IsEmail,
  MinLength,
  MaxLength,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class GetAuthDto {
  id!: string;

  @IsEmail()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  email!: string;

  @IsEnum(AuthRole)
  @IsOptional()
  @IsNotEmpty()
  role: AuthRole = AuthRole.PATIENT;

  @IsBoolean()
  @IsOptional()
  @IsNotEmpty()
  isVerified = false;

  @IsDateString()
  @IsOptional()
  @IsNotEmpty()
  createdAt = new Date().toISOString();

  @IsBoolean()
  @IsOptional()
  @IsNotEmpty()
  earlyUser = false;
}
