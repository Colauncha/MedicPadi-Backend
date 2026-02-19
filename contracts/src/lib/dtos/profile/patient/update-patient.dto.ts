import { PartialType } from '@nestjs/mapped-types';
import { CreatePatientDto } from './create-patient.dto';
import { IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePatientDto extends PartialType(CreatePatientDto) {
  @ApiPropertyOptional()
  @IsString()
  id?: string;
}
