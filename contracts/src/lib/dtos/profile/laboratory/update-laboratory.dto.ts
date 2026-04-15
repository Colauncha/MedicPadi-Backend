import { PartialType } from '@nestjs/mapped-types';
import { CreateLaboratoryDto } from './create-laboratory.dto';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessHours } from 'contracts/src/lib/interfaces/business-hours.interface';

export class UpdateLaboratoryDto extends PartialType(CreateLaboratoryDto) {
  @ApiPropertyOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  profilePicture?: { public_id: string; url: string };
}
