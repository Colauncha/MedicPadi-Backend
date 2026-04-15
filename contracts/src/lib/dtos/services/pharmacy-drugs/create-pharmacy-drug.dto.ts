import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsString, IsUUID } from 'class-validator';

export class CreatePharmacyDrugDto {
  @ApiProperty()
  @IsUUID()
  user_id?: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty()
  @IsNumber()
  price!: number;

  @ApiProperty()
  @IsBoolean()
  available!: boolean;
}
