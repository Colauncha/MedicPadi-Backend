import { IsEmail, IsString, IsNumber } from 'class-validator';

export class PaymentEmailDto {
  @IsEmail()
  email!: string;

  @IsString()
  name!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  currency!: string;

  @IsString()
  reference!: string;
}
