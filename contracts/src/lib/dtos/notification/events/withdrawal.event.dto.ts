import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class WithdrawalEventDto {
  @IsUUID()
  userId!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  currency!: string;

  @IsString()
  reference!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
