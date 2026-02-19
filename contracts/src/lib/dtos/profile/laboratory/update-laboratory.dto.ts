import { PartialType } from '@nestjs/mapped-types';
import { CreateLaboratoryDto } from './create-laboratory.dto';
import { IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLaboratoryDto extends PartialType(CreateLaboratoryDto) {
  @ApiPropertyOptional()
  @IsString()
  id?: string;
}
