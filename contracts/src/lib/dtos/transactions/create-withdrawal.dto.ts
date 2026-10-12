import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWithdrawalDto {
  // Set by the gateway from the authenticated user; never trusted from the body
  @ApiHideProperty()
  @IsUUID()
  @IsOptional()
  user_id?: string;

  @ApiProperty({ description: 'Amount to withdraw from the wallet, in the wallet currency', example: 5000 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  amount!: number;
}
