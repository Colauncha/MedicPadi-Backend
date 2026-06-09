import { IsNumber, IsString, IsUUID } from 'class-validator';

export class PaymentSuccessEventDto {
  @IsUUID()
  userId!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  currency!: string;

  @IsString()
  reference!: string;
}
