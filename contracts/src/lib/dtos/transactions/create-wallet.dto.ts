import { IsUUID, IsOptional, IsString } from 'class-validator';

export class CreateWalletDto {
  @IsUUID()
  user_id!: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
