import { PartialType } from '@nestjs/mapped-types';
import { CreatePharmacyDto } from './create-pharmacy.dto';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessHours } from 'contracts/src/lib/interfaces/business-hours.interface';

export class UpdatePharmacyDto extends PartialType(CreatePharmacyDto) {
  @ApiPropertyOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  profilePicture?: { public_id: string; url: string };
}
