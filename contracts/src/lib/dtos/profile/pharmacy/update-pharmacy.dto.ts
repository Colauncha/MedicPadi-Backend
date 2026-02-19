import { PartialType } from '@nestjs/mapped-types';
import { CreatePharmacyDto } from './create-pharmacy.dto';
import { IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePharmacyDto extends PartialType(CreatePharmacyDto) {
  @ApiPropertyOptional()
  @IsString()
  id?: string;
}
