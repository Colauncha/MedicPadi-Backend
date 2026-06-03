import { PartialType } from '@nestjs/mapped-types';
import { CreatePharmacyDto } from './create-pharmacy.dto';
import { IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePharmacyDto extends PartialType(CreatePharmacyDto) {
  @ApiPropertyOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  profilePicture?: { public_id: string; url: string };

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  about?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  yearsOfService?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  awards?: number | null;
}
