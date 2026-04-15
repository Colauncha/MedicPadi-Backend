import { PartialType } from '@nestjs/mapped-types';
import { CreatePharmacyDrugDto } from './create-pharmacy-drug.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class UpdatePharmacyDrugDto extends PartialType(CreatePharmacyDrugDto) {
  @ApiProperty()
  @IsOptional()
  @IsUUID()
  id?: string;
}
