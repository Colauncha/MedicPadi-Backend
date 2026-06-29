import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl } from 'class-validator';

export class VerifyEmailDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @IsNotEmpty()
  otp!: number;

  @IsUrl()
  @IsOptional()
  verifyUrl?: string;
}
