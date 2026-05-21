import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaymentGateway, TransactionSourceType } from '../../enums/transaction.enum';
import { PaymentStatus } from '../../enums/payment-status.enum';

export class CreateTransactionDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  user_id!: string;

  @ApiProperty({ enum: TransactionSourceType })
  @IsEnum(TransactionSourceType)
  source_type!: TransactionSourceType;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  source_id?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  provider_id?: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  currency?: string = 'NGN';

  @ApiPropertyOptional({ enum: PaymentGateway })
  @IsEnum(PaymentGateway)
  @IsOptional()
  gateway?: PaymentGateway;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  gateway_reference?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  access_code?: string;
}