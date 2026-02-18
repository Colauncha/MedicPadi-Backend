import { PartialType } from '@nestjs/mapped-types';
import { CreateLaboratoryDto } from './create-laboratory.dto';
import { IsString } from 'class-validator';

export class UpdateLaboratoryDto extends PartialType(CreateLaboratoryDto) {
  @IsString()
  id?: string;
}
