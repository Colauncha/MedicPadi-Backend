import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class SavePayoutAccountDto {
  // Set by the gateway from the authenticated user; never trusted from the body
  @ApiHideProperty()
  @IsUUID()
  @IsOptional()
  user_id?: string;

  @ApiProperty({ description: 'Paystack bank code, from GET /transactions/banks', example: '058' })
  @IsString()
  @IsNotEmpty()
  bank_code!: string;

  @ApiProperty({ description: '10-digit NUBAN account number', example: '0123456789' })
  @Matches(/^\d{10}$/, { message: 'account_number must be a 10-digit NUBAN' })
  account_number!: string;
}
