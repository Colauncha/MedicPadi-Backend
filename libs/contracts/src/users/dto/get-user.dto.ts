import { UserRole } from '@app/contracts/users/enums/roles';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  MinLength,
  MaxLength,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsDateString,
} from 'class-validator';

export class GetUserDto {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  firstName: string;

  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(50)
  lastName?: string;

  @IsEmail()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  email: string;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @IsNotEmpty()
  emergencyContact: string;

  @IsBoolean()
  @IsNotEmpty()
  isVerified: boolean;

  @IsDateString()
  @IsNotEmpty()
  createdAt: Date;
}
