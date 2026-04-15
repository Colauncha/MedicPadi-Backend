import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsNumber,
  Length,
  IsString,
} from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(50)
  email!: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  otp!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(100)
  newPassword!: string;
}
