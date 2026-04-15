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

export class ResetPasswordEmailDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  otp!: number;

  @ApiProperty()
  @IsString()
  name!: string;
}
