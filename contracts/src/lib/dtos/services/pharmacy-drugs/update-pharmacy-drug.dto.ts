import { PartialType } from '@nestjs/mapped-types';
import { CreatePharmacyDrugDto } from './create-pharmacy-drug.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsUUID } from 'class-validator';

export class UpdatePharmacyDrugDto extends PartialType(CreatePharmacyDrugDto) {
  @ApiProperty()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  drugImage?: { public_id: string; url: string };
}
